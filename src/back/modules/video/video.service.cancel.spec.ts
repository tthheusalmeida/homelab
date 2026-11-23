import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AddressInfo } from 'node:net';

import type { BackConfig } from '../../config/back-config';
import type { AIService } from '../ai/ai.service';

import { VideoService } from './video.service';

describe('VideoService: cancelamento', () => {
  let tmp: string;
  let server: http.Server;
  let baseUrl: string;
  let chat: jest.Mock;
  let service: VideoService;

  beforeEach(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'video-cancel-'));
    chat = jest.fn().mockResolvedValue('parte');
    service = new VideoService(
      { chat } as unknown as AIService,
      {
        videoTempDir: path.join(tmp, 'video'),
        audioTempDir: path.join(tmp, 'audio'),
        inboxDir: path.join(tmp, 'docs'),
      } as BackConfig,
    );

    // servidor que manda uma parte do vídeo e fica esperando o resto para sempre
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-length': '1000000' });
      res.write(Buffer.alloc(1000));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('when a direct download is cancelled midway, should reject with AbortError and remove the partial file', async () => {
    const controller = new AbortController();
    const running = service.download(
      `${baseUrl}/v.mp4`,
      'job.mp4',
      undefined,
      undefined,
      controller.signal,
    );

    setTimeout(() => controller.abort(), 300);

    await expect(running).rejects.toMatchObject({ name: 'AbortError' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fs.existsSync(path.join(tmp, 'video', 'job.mp4'))).toBe(false);
  });

  it('when the signal is already aborted, should not download anything', async () => {
    const controller = new AbortController();

    controller.abort();

    await expect(
      service.download(`${baseUrl}/v.mp4`, 'job.mp4', undefined, undefined, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fs.existsSync(path.join(tmp, 'video', 'job.mp4'))).toBe(false);
  });

  it('when the summary is cancelled between parts, should stop without calling the AI again', async () => {
    const controller = new AbortController();

    chat.mockImplementationOnce(() => {
      controller.abort();

      return Promise.resolve('parte 1');
    });

    await expect(
      service.summarize('prompt', 'palavra '.repeat(5_000), {
        providerId: 'ollama',
        modelId: 'm',
        detail: 'detailed',
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('when the signal is given, should pass it to the AI call', async () => {
    const controller = new AbortController();

    await service.summarize('prompt', 'curto', {
      providerId: 'ollama',
      modelId: 'm',
      detail: 'brief',
      signal: controller.signal,
    });

    expect(chat.mock.calls[0][0]).toMatchObject({ signal: controller.signal });
  });
});
