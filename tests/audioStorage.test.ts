import { isBlobPath, isSafeAudioPath, resolveAudioUrl, azureSigner, checkAudioStorage } from '../src/services/audioStorage';

describe('isBlobPath', () => {
  it('treats object paths as blob paths', () => expect(isBlobPath('audio/zu/sawubona.mp3')).toBe(true));
  it('ignores full URLs', () => expect(isBlobPath('https://cdn.example/a.mp3')).toBe(false));
  it('ignores empty values', () => { expect(isBlobPath('')).toBe(false); expect(isBlobPath(undefined)).toBe(false); });
});

describe('isSafeAudioPath', () => {
  it('accepts audio clips', () => expect(isSafeAudioPath('audio/zu/sawubona.mp3')).toBe(true));
  it('rejects paths outside audio/', () => expect(isSafeAudioPath('secrets/key.json')).toBe(false));
  it('rejects traversal', () => expect(isSafeAudioPath('audio/../secrets/a.mp3')).toBe(false));
  it('rejects non-audio extensions', () => expect(isSafeAudioPath('audio/zu/a.exe')).toBe(false));
});

describe('resolveAudioUrl', () => {
  const signer = async (p: string) => `https://signed.example/${p}?sig=1`;
  it('signs a blob path', async () => expect(await resolveAudioUrl('audio/zu/yebo.mp3', signer)).toBe('https://signed.example/audio/zu/yebo.mp3?sig=1'));
  it('passes full URLs through untouched', async () => expect(await resolveAudioUrl('https://x/y.mp3', signer)).toBe('https://x/y.mp3'));
  it('returns empty for no audio', async () => expect(await resolveAudioUrl('', signer)).toBe(''));
  it('returns empty when storage is not configured', async () => expect(await resolveAudioUrl('audio/zu/yebo.mp3', null)).toBe(''));
  it('refuses unsafe paths', async () => expect(await resolveAudioUrl('audio/../x.mp3', signer)).toBe(''));
  it('returns empty if signing fails', async () => expect(await resolveAudioUrl('audio/zu/a.mp3', async () => { throw new Error('boom'); })).toBe(''));
});

describe('azureSigner', () => {
  const env = { AZURE_STORAGE_ACCOUNT: 'khulumastore', AZURE_STORAGE_KEY: Buffer.from('not-a-real-key-just-test-bytes!!').toString('base64') } as NodeJS.ProcessEnv;
  const fixedNow = () => Date.UTC(2026, 9, 25, 12, 0, 0);

  it('is off when Azure is not configured', () => expect(azureSigner({} as NodeJS.ProcessEnv)).toBeNull());

  it('builds a read-only, expiring blob URL', async () => {
    const url = new URL(await azureSigner(env, fixedNow)!('audio/zu/sawubona.mp3'));
    expect(url.origin).toBe('https://khulumastore.blob.core.windows.net');
    expect(url.pathname).toBe('/khuluma/audio/zu/sawubona.mp3');
    expect(url.searchParams.get('sp')).toBe('r');                       // read only
    expect(url.searchParams.get('se')).toBe('2026-10-25T12:15:00Z');    // 15 minutes
    expect(url.searchParams.get('sig')).toBeTruthy();                   // signed
  });

  it('uses the configured container', async () => {
    const url = await azureSigner({ ...env, AZURE_STORAGE_CONTAINER: 'clips' }, fixedNow)!('audio/zu/yebo.mp3');
    expect(url).toContain('/clips/audio/zu/yebo.mp3?');
  });

  it('plugs into resolveAudioUrl and still refuses unsafe paths', async () => {
    const signer = azureSigner(env, fixedNow);
    expect(await resolveAudioUrl('audio/zu/yebo.mp3', signer)).toContain('blob.core.windows.net');
    expect(await resolveAudioUrl('audio/../secret.mp3', signer)).toBe('');
  });
});

describe('checkAudioStorage', () => {
  const env = { AZURE_STORAGE_ACCOUNT: 'khulumastore', AZURE_STORAGE_KEY: Buffer.from('not-a-real-key-just-test-bytes!!').toString('base64') } as NodeJS.ProcessEnv;

  it('reports not configured without storage settings', async () => {
    const r = await checkAudioStorage('audio/zu/a.mp3', async () => ({ status: 200 }), {} as NodeJS.ProcessEnv);
    expect(r).toEqual({ configured: false, provider: 'none', reachable: null });
  });
  it('passes when the signed link returns 200', async () => {
    const r = await checkAudioStorage('audio/zu/a.mp3', async () => ({ status: 200, contentType: 'audio/mpeg' }), env);
    expect(r).toMatchObject({ configured: true, provider: 'azure', reachable: true, httpStatus: 200, contentType: 'audio/mpeg' });
  });
  it('fails (with the status) when the clip is missing or the key is wrong', async () => {
    const r = await checkAudioStorage('audio/zu/a.mp3', async () => ({ status: 403 }), env);
    expect(r).toMatchObject({ reachable: false, httpStatus: 403 });
  });
  it('fails cleanly if the request throws, and never echoes the link', async () => {
    const r = await checkAudioStorage('audio/zu/a.mp3', async (url) => { throw new Error('boom'); }, env);
    expect(r).toMatchObject({ reachable: false, error: 'boom' });
    expect(JSON.stringify(r)).not.toContain('sig=');
  });
});
