// `npm run test:release` também cobre os utilitários dos binários embutidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { downloadVerified, isExcludedFromPack } from './bin-utils.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bin-utils-'));
const fakeFetch = (body, ok = true, status = 200) => async () => ({
  ok,
  status,
  arrayBuffer: async () => Uint8Array.from(Buffer.from(body)).buffer,
});
const sha = (text) => createHash('sha256').update(text).digest('hex');

test('when the file is a model or CUDA runtime, should be excluded from the pack', () => {
  for (const name of ['ggml-large-v3-turbo.bin', 'cublas64_12.dll', 'cudart64_12.dll', 'nvrtc64_120_0.dll', 'ggml-cuda.dll']) {
    assert.equal(isExcludedFromPack(name), true, name);
  }
});

test('when the file is yt-dlp, should be excluded because the app downloads it', () => {
  assert.equal(isExcludedFromPack('yt-dlp.exe'), true);
});

test('when the file is the CPU runtime, should be kept in the pack', () => {
  for (const name of ['whisper-cli.exe', 'whisper.dll', 'ggml-cpu.dll', 'ffmpeg.exe', 'LICENSE']) {
    assert.equal(isExcludedFromPack(name), false, name);
  }
});

test('when the checksum matches, should keep the downloaded file', async () => {
  const target = path.join(tmp(), 'a.zip');
  await downloadVerified('https://x/a.zip', sha('hello'), target, fakeFetch('hello'));
  assert.equal(fs.readFileSync(target, 'utf8'), 'hello');
});

test('when the checksum differs, should delete the file and fail', async () => {
  const target = path.join(tmp(), 'a.zip');
  await assert.rejects(downloadVerified('https://x/a.zip', sha('other'), target, fakeFetch('hello')), /não confere/);
  assert.equal(fs.existsSync(target), false);
});

test('when the server answers an error, should fail with the status', async () => {
  const target = path.join(tmp(), 'a.zip');
  await assert.rejects(downloadVerified('https://x/a.zip', 'x', target, fakeFetch('', false, 404)), /HTTP 404/);
});
