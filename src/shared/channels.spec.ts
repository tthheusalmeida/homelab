import { allChannels, CHANNEL_FORMAT, IpcChannels } from './channels';

describe('IpcChannels', () => {
  it('when listing all channels, should have no duplicates', () => {
    const channels = allChannels();

    expect(new Set(channels).size).toBe(channels.length);
  });

  it('when listing all channels, should follow the <domain>:<action> format', () => {
    for (const channel of allChannels()) {
      expect(channel).toMatch(CHANNEL_FORMAT);
    }
  });

  it('when listing all channels, should include the app channels', () => {
    expect(allChannels()).toEqual(
      expect.arrayContaining([IpcChannels.app.ping, IpcChannels.app.version]),
    );
  });

  it('when checking the format, should reject names outside the convention', () => {
    expect(CHANNEL_FORMAT.test('ping')).toBe(false);
    expect(CHANNEL_FORMAT.test('App:Ping')).toBe(false);
    expect(CHANNEL_FORMAT.test('library:documents:create-article')).toBe(true);
  });
});
