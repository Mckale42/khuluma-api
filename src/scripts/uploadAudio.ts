/**
 * Upload native-speaker clips to the blob-storage bucket and point the exercises
 * at them. Usage:   npm run upload-audio -- ./recordings
 * File names map to words: recordings/sawubona.mp3 -> audio/zu/sawubona.mp3.
 * Uploads to Azure Blob Storage when AZURE_STORAGE_ACCOUNT + AZURE_STORAGE_KEY are set (container
 * AZURE_STORAGE_CONTAINER, default "khuluma"); otherwise to Firebase Storage (FIREBASE_SERVICE_ACCOUNT +
 * FIREBASE_STORAGE_BUCKET). Same variables as the live API.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { getFirebaseAdmin } from '../config/firebase';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { Lesson } from '../models/Lesson';
import { WordOfDay } from '../models/WordOfDay';

type Uploader = (localFile: string, dest: string) => Promise<void>;

/** Choose where clips go, from the same environment variables the API uses to sign URLs. */
async function chooseUploader(): Promise<Uploader> {
  const account = process.env.AZURE_STORAGE_ACCOUNT, key = process.env.AZURE_STORAGE_KEY;
  if (account && key) {
    const container = process.env.AZURE_STORAGE_CONTAINER || 'khuluma';
    const client = new BlobServiceClient(`https://${account}.blob.core.windows.net`, new StorageSharedKeyCredential(account, key)).getContainerClient(container);
    await client.createIfNotExists(); // private by default: clips are only reachable through signed URLs
    console.log(`[audio] uploading to Azure Blob Storage container "${container}"`);
    return async (file, dest) => { await client.getBlockBlobClient(dest).uploadFile(file, { blobHTTPHeaders: { blobContentType: contentType(file), blobCacheControl: 'private, max-age=3600' } }); };
  }
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const admin = getFirebaseAdmin();
  if (!bucketName || !admin) throw new Error('Set AZURE_STORAGE_ACCOUNT + AZURE_STORAGE_KEY, or FIREBASE_STORAGE_BUCKET + FIREBASE_SERVICE_ACCOUNT.');
  const bucket = admin.storage().bucket(bucketName);
  console.log(`[audio] uploading to Firebase Storage bucket "${bucketName}"`);
  return async (file, dest) => { await bucket.upload(file, { destination: dest, metadata: { cacheControl: 'private, max-age=3600' } }); };
}

const contentType = (f: string) => ({ '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav' } as Record<string, string>)[path.extname(f).toLowerCase()] || 'application/octet-stream';

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: npm run upload-audio -- <folder with .mp3/.m4a/.ogg/.wav clips>');
  const upload = await chooseUploader();
  await connectDb();

  for (const file of fs.readdirSync(dir).filter((f) => /\.(mp3|m4a|ogg|wav)$/i.test(f))) {
    const slug = path.parse(file).name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const dest = `audio/zu/${slug}${path.extname(file).toLowerCase()}`;
    await upload(path.join(dir, file), dest);
    // wordId convention in the seed is "w_<slug>": attach the clip to every exercise teaching that word.
    const lessons = await Lesson.updateMany({ 'exercises.wordId': `w_${slug}` }, { $set: { 'exercises.$[e].audioUrl': dest } }, { arrayFilters: [{ 'e.wordId': `w_${slug}` }] });
    await WordOfDay.updateMany({ word: new RegExp(`^${slug}$`, 'i') }, { $set: { audioUrl: dest } });
    console.log(`[audio] ${file} -> ${dest} (${lessons.modifiedCount} lesson(s) updated)`);
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error('[audio] failed', e); process.exit(1); });
