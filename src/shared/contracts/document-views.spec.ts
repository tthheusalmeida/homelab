import {
  DEFAULT_SUMMARY,
  DEFAULT_TRANSCRIPT,
  parseSummary,
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

describe('parseSummary', () => {
  it('when the defaults are used, should show the outline', () => {
    expect(DEFAULT_SUMMARY).toEqual({ outline: true });
  });

  it('when the field is missing, should fall back to the default', () => {
    expect(parseSummary({})).toEqual(DEFAULT_SUMMARY);
  });

  it('when the outline is turned off, should keep it off', () => {
    expect(parseSummary({ outline: false })).toEqual({ outline: false });
  });

  it.each(['true', 0, null])('when the outline is %j, should return null', (value) => {
    expect(parseSummary({ outline: value })).toBeNull();
  });

  it.each([null, undefined, 'x'])('when the value is %j, should return null', (value) => {
    expect(parseSummary(value)).toBeNull();
  });
});
