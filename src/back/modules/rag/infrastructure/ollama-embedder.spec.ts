import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';

import type { BackConfig } from '../../../config/back-config';

import { OllamaEmbedder, RETRY_AFTER_FAILURE_MS } from './ollama-embedder';

describe('OllamaEmbedder', () => {
  let http: { post: jest.Mock };
  let clock: number;
  const config = { ollamaUrl: 'http://ollama.test:1' } as BackConfig;
  const embedder = () => {
    const instance = new OllamaEmbedder(http as unknown as HttpService, config);

    instance.now = () => clock;

    return instance;
  };

  beforeEach(() => {
    clock = 1_000;
    http = { post: jest.fn() };
  });

  it('when the server answers, should return normalized vectors in order', async () => {
    http.post.mockReturnValue(
      of({
        data: {
          embeddings: [
            [3, 4],
            [0, 2],
          ],
        },
      }),
    );

    const vectors = await embedder().embed(['a', 'b']);

    expect(vectors![0][0]).toBeCloseTo(0.6);
    expect(vectors![0][1]).toBeCloseTo(0.8);
    expect(Array.from(vectors![1])).toEqual([0, 1]);
    expect(http.post).toHaveBeenCalledWith(
      'http://ollama.test:1/api/embed',
      expect.objectContaining({ model: 'embeddinggemma', input: ['a', 'b'] }),
    );
  });

  it('when there are many texts, should ask in batches', async () => {
    http.post.mockImplementation((_url: string, body: { input: string[] }) =>
      of({ data: { embeddings: body.input.map(() => [1, 0]) } }),
    );

    const vectors = await embedder().embed(Array.from({ length: 40 }, (_, i) => `t${i}`));

    expect(vectors).toHaveLength(40);
    expect(http.post).toHaveBeenCalledTimes(3);
  });

  it('when the model is missing, should answer null and not ask again for a while', async () => {
    http.post.mockReturnValue(throwError(() => new Error('404')));
    const instance = embedder();

    expect(await instance.embed(['a'])).toBeNull();
    expect(await instance.embed(['a'])).toBeNull();
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('when the wait is over, should try again', async () => {
    http.post.mockReturnValueOnce(throwError(() => new Error('off')));
    const instance = embedder();

    await instance.embed(['a']);
    clock += RETRY_AFTER_FAILURE_MS + 1;
    http.post.mockReturnValue(of({ data: { embeddings: [[1, 0]] } }));

    expect(await instance.embed(['a'])).toHaveLength(1);
  });

  it('when the answer has the wrong number of vectors, should answer null', async () => {
    http.post.mockReturnValue(of({ data: { embeddings: [[1, 0]] } }));

    expect(await embedder().embed(['a', 'b'])).toBeNull();
  });

  it('when there is nothing to embed, should not call the server', async () => {
    expect(await embedder().embed([])).toEqual([]);
    expect(http.post).not.toHaveBeenCalled();
  });
});
