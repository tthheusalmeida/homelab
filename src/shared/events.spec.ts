import { allChannels } from './channels';
import { allEvents, EVENT_FORMAT, IpcEvents } from './events';

describe('IpcEvents', () => {
  it('when listing all events, should have no duplicates', () => {
    const events = allEvents();

    expect(new Set(events).size).toBe(events.length);
  });

  it('when listing all events, should follow the <domain>:<subject> format', () => {
    for (const event of allEvents()) {
      expect(event).toMatch(EVENT_FORMAT);
    }
  });

  it('when listing all events, should not reuse the name of an invoke channel', () => {
    const channels = new Set<string>(allChannels());

    for (const event of allEvents()) {
      expect(channels.has(event)).toBe(false);
    }
  });

  it('when listing all events, should include the progress and notice events', () => {
    expect(allEvents()).toEqual(
      expect.arrayContaining([
        IpcEvents.backupProgress,
        IpcEvents.libraryMoveProgress,
        IpcEvents.notice,
      ]),
    );
  });

  it('when checking the format, should reject names outside the convention', () => {
    expect(EVENT_FORMAT.test('progress')).toBe(false);
    expect(EVENT_FORMAT.test('Backup:Progress')).toBe(false);
    expect(EVENT_FORMAT.test('library-move:progress')).toBe(true);
  });
});
