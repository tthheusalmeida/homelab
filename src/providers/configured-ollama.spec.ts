import { ConfiguredOllama, ConfiguredOllamaMessages } from './configured-ollama';

describe('ConfiguredOllama', () => {
  it('when the server answers, should be ready', async () => {
    const ping = jest.fn().mockResolvedValue({ ok: true });

    await expect(
      new ConfiguredOllama(() => 'http://localhost:11434/', ping).ensureRunning(),
    ).resolves.toBeUndefined();
    expect(ping).toHaveBeenCalledWith('http://localhost:11434/api/version', expect.anything());
  });

  it('when the server is off, should say where it looked and how to turn it on', async () => {
    const ping = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      new ConfiguredOllama(() => 'http://localhost:11434', ping).ensureRunning(),
    ).rejects.toThrow(ConfiguredOllamaMessages.unreachable('http://localhost:11434'));
  });

  it('when the server answers with an error, should fail too', async () => {
    const ping = jest.fn().mockResolvedValue({ ok: false });

    await expect(new ConfiguredOllama(() => 'http://x:1', ping).ensureRunning()).rejects.toThrow(
      'http://x:1',
    );
  });

  it('when the address changes in the settings, should use the new one', () => {
    let url = 'http://a:1';
    const ollama = new ConfiguredOllama(() => url, jest.fn());

    url = 'http://b:2';

    expect(ollama.baseUrl).toBe('http://b:2');
  });
});
