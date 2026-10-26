/**
 * Native-speaker audio in blob storage (FR-12, user-defined feature).
 * Clips live in a private blob container — Azure Blob Storage (AZURE_STORAGE_*) or Firebase Storage
 * (FIREBASE_STORAGE_BUCKET; needs the Blaze plan) — chosen by whichever is configured; the
 * database only holds the object PATH (e.g. "audio/zu/sawubona.mp3"). When the
 * API returns an exercise it swaps each path for a short-lived signed URL, so the
 * bucket never has to be public and the phone streams the clip straight from blob
 * storage. Anything that is already a full URL (or empty) is passed through.
 */
import { getFirebaseAdmin } from '../config/firebase';
import { BlobSASPermissions, StorageSharedKeyCredential, generateBlobSASQueryParameters } from '@azure/storage-blob';

export const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

export type UrlSigner = (objectPath: string) => Promise<string>;

/** True for a bucket object path, false for '', an http(s) URL or other absolute URL. */
export function isBlobPath(value?: string | null): boolean {
  if (!value) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

/** Reject path tricks so a bad database value can never sign something outside audio/. */
export function isSafeAudioPath(path: string): boolean {
  return /^audio\/[a-z0-9_\-/]+\.(mp3|m4a|ogg|wav)$/i.test(path) && !path.includes('..');
}

/**
 * Azure Blob Storage signer: a read-only SAS URL valid for 15 minutes. Needs AZURE_STORAGE_ACCOUNT and
 * AZURE_STORAGE_KEY (storage account name + access key); AZURE_STORAGE_CONTAINER defaults to "khuluma".
 * The object path (e.g. "audio/zu/sawubona.mp3") is the blob name inside the container.
 */
export function azureSigner(env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now): UrlSigner | null {
  const account = env.AZURE_STORAGE_ACCOUNT;
  const key = env.AZURE_STORAGE_KEY;
  if (!account || !key) return null;
  const container = env.AZURE_STORAGE_CONTAINER || 'khuluma';
  const credential = new StorageSharedKeyCredential(account, key);
  return async (objectPath) => {
    const sas = generateBlobSASQueryParameters({
      containerName: container,
      blobName: objectPath,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(now() - 60_000), // small clock-skew allowance
      expiresOn: new Date(now() + SIGNED_URL_TTL_MS)
    }, credential).toString();
    return `https://${account}.blob.core.windows.net/${container}/${objectPath}?${sas}`;
  };
}

/** Firebase Storage v4 read URL; null when no bucket is configured (dev/demo). */
export function firebaseSigner(): UrlSigner | null {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) return null;
  const admin = getFirebaseAdmin();
  if (!admin) return null;
  const bucket = admin.storage().bucket(bucketName);
  return async (objectPath) => {
    const [url] = await bucket.file(objectPath).getSignedUrl({
      version: 'v4', action: 'read', expires: Date.now() + SIGNED_URL_TTL_MS
    });
    return url;
  };
}

/** Pick the configured provider: Azure Blob Storage first, then Firebase Storage, else none (dev/demo). */
export function defaultSigner(): UrlSigner | null {
  return azureSigner() ?? firebaseSigner();
}

/** Resolve one stored value to something the phone can play ('' when none is available). */
export async function resolveAudioUrl(stored: string | undefined | null, signer: UrlSigner | null = defaultSigner()): Promise<string> {
  if (!stored) return '';
  if (!isBlobPath(stored)) return stored;
  if (!signer || !isSafeAudioPath(stored)) return '';
  try {
    return await signer(stored);
  } catch (e) {
    console.warn('[audio] could not sign', stored, (e as Error).message);
    return '';
  }
}

export interface AudioHealth {
  configured: boolean;
  provider: 'azure' | 'firebase' | 'none';
  /** Did a signed link to the sample clip actually fetch? (null when storage is not configured) */
  reachable: boolean | null;
  httpStatus?: number;
  contentType?: string;
  error?: string;
}

export type HeadFetcher = (url: string) => Promise<{ status: number; contentType?: string }>;

/**
 * Diagnostic for GET /api/health/audio: signs a link for one known clip and checks that it is really
 * retrievable. Reports only pass/fail details — never the link, key or account — so it is safe to leave public.
 */
export async function checkAudioStorage(
  sample = 'audio/zu/sawubona.mp3',
  head: HeadFetcher,
  env: NodeJS.ProcessEnv = process.env
): Promise<AudioHealth> {
  const azure = azureSigner(env);
  const signer = azure ?? firebaseSigner();
  const provider = azure ? 'azure' : signer ? 'firebase' : 'none';
  if (!signer) return { configured: false, provider: 'none', reachable: null };
  try {
    const res = await head(await signer(sample));
    return { configured: true, provider, reachable: res.status === 200, httpStatus: res.status, contentType: res.contentType };
  } catch (e) {
    return { configured: true, provider, reachable: false, error: (e as Error).message.slice(0, 120) };
  }
}
