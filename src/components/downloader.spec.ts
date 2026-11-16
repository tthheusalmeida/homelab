import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { DownloadMessages, downloadVerified, sha256OfFile, type FetchLike } from './downloader';

const content = Buffer.from('conteudo do modelo '.repeat(1000));
const sha = createHash('sha256').update(content).digest('hex');

const respond =
  (body: Buffer, init: ResponseInit = {}): FetchLike =>
  () =>
    Promise.resolve(
      new Response(new Uint8Array(body), {
        headers: { 'content-length': String(body.length) },
        ...init,
      }),
    );

describe('downloadVerified', () => {
  let dir: string;
  let destination: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'download-spec-'));
    destination = path.join(dir, 'sub', 'model.bin');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when the checksum matches, should save the file and report progress', async () => {
    const progress: number[] = [];

    await downloadVerified(respond(content), {
      url: 'https://x/model.bin',
      destination,
      sha256: sha,
      expectedBytes: content.length,
      onProgress: (received) => progress.push(received),
    });

    expect(fs.readFileSync(destination).equals(content)).toBe(true);
    expect(fs.existsSync(`${destination}.part`)).toBe(false);
    expect(progress.at(-1)).toBe(content.length);
  });

  it('when the checksum differs, should reject and leave no file behind', async () => {
    await expect(
      downloadVerified(respond(content), {
        url: 'https://x/model.bin',
        destination,
        sha256: 'a'.repeat(64),
        expectedBytes: content.length,
      }),
    ).rejects.toThrow(DownloadMessages.checksum);

    expect(fs.existsSync(destination)).toBe(false);
    expect(fs.existsSync(`${destination}.part`)).toBe(false);
  });

  it('when the server answers an error status, should reject with the status', async () => {
    await expect(
      downloadVerified(respond(Buffer.alloc(0), { status: 404 }), {
        url: 'https://x/missing',
        destination,
        sha256: sha,
        expectedBytes: 1,
      }),
    ).rejects.toThrow(DownloadMessages.http(404));
  });

  it('when the stream is shorter than announced, should reject as incomplete', async () => {
    const fetchFn: FetchLike = () =>
      Promise.resolve(
        new Response(new Uint8Array(content.subarray(0, 10)), {
          headers: { 'content-length': String(content.length) },
        }),
      );

    await expect(
      downloadVerified(fetchFn, {
        url: 'https://x/model.bin',
        destination,
        sha256: sha,
        expectedBytes: content.length,
      }),
    ).rejects.toThrow(DownloadMessages.incomplete);
    expect(fs.existsSync(`${destination}.part`)).toBe(false);
  });

  it('when the request is aborted, should reject and leave no partial file', async () => {
    const controller = new AbortController();
    const fetchFn: FetchLike = () => {
      controller.abort();

      return Promise.reject(new DOMException('aborted', 'AbortError'));
    };

    await expect(
      downloadVerified(fetchFn, {
        url: 'https://x/model.bin',
        destination,
        sha256: sha,
        expectedBytes: 1,
        signal: controller.signal,
      }),
    ).rejects.toThrow('aborted');
    expect(fs.existsSync(`${destination}.part`)).toBe(false);
  });

  it('when hashing an existing file, should return its sha256', async () => {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);

    await expect(sha256OfFile(destination)).resolves.toBe(sha);
  });
});
