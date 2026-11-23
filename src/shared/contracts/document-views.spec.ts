import {
  DEFAULT_TRANSCRIPT,
  parseTranscript,
} from './document-views';

describe('parseTranscript', () => {
  it('when the defaults are used, should show the preview and the progress bar', () => {
    expect(DEFAULT_TRANSCRIPT).toEqual({ preview: true, progress: true });
  });

  it('when a field is missing, should fall back to its default', () => {
    expect(parseTranscript({ preview: false })).toEqual({ preview: false, progress: true });
    expect(parseTranscript({})).toEqual(DEFAULT_TRANSCRIPT);
  });

  it.each(['true', 0, null])('when a field is %j, should return null', (value) => {
    expect(parseTranscript({ preview: value })).toBeNull();
    expect(parseTranscript({ progress: value })).toBeNull();
  });

  it.each([null, undefined, 'x', 3])('when the value is %j, should return null', (value) => {
    expect(parseTranscript(value)).toBeNull();
  });
});
