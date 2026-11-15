import { EMPTY_CHAT_TITLE, MAX_TITLE_LENGTH, titleFromMessage } from './chat.title';

describe('titleFromMessage', () => {
  it('when the message is short, should use it as is', () => {
    expect(titleFromMessage('Como funciona o DNS?')).toBe('Como funciona o DNS?');
  });

  it('when the message has extra spaces and line breaks, should normalize them', () => {
    expect(titleFromMessage('  Primeira\n\nlinha   e\tsegunda  ')).toBe('Primeira linha e segunda');
  });

  it('when the message is longer than the limit, should cut it and end with an ellipsis within the limit', () => {
    const title = titleFromMessage('palavra '.repeat(30));

    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(title.endsWith('…')).toBe(true);
  });

  it('when the message has exactly the limit, should not cut it', () => {
    const message = 'a'.repeat(MAX_TITLE_LENGTH);

    expect(titleFromMessage(message)).toBe(message);
  });

  it('when the cut falls right after a space, should not leave a space before the ellipsis', () => {
    const message = `${'a'.repeat(MAX_TITLE_LENGTH - 2)} ${'b'.repeat(20)}`;

    expect(titleFromMessage(message)).not.toMatch(/ …$/);
  });

  it('when the message is blank, should use the default title', () => {
    expect(titleFromMessage('   \n ')).toBe(EMPTY_CHAT_TITLE);
  });
});
