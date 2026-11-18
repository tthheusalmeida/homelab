import { describe, expect, it } from 'vitest';

import { InboxStrings } from './inbox-text';

describe('InboxStrings', () => {
  it('when the screen is named, should call it Classificação everywhere', () => {
    expect(InboxStrings.name).toBe('Classificação');
    expect(InboxStrings.goTo).toContain(InboxStrings.name);
    expect(InboxStrings.via).toContain(InboxStrings.name);
    expect(InboxStrings.from).toContain(InboxStrings.name);
    expect(InboxStrings.inside).toContain(InboxStrings.name);
  });

  it('when the menu counter is read, should say how many pages are waiting to be classified', () => {
    expect(InboxStrings.badge(3)).toBe('3 para classificar');
  });

  it('when the old name is searched, should not appear in any text', () => {
    const texts = JSON.stringify([
      InboxStrings.name,
      InboxStrings.goTo,
      InboxStrings.via,
      InboxStrings.from,
      InboxStrings.inside,
      InboxStrings.badge(1),
    ]);

    expect(texts).not.toMatch(/entrada/i);
  });
});
