import { isSettingsShortcut, type KeyInput } from './shortcuts';

const input = (overrides: Partial<KeyInput> = {}): KeyInput => ({
  type: 'keyDown',
  key: ',',
  control: true,
  meta: false,
  alt: false,
  shift: false,
  ...overrides,
});

describe('isSettingsShortcut', () => {
  it('when pressing Ctrl+comma, should match', () => {
    expect(isSettingsShortcut(input())).toBe(true);
  });

  it('when pressing Cmd+comma, should match', () => {
    expect(isSettingsShortcut(input({ control: false, meta: true }))).toBe(true);
  });

  it('when pressing comma without a modifier, should not match', () => {
    expect(isSettingsShortcut(input({ control: false }))).toBe(false);
  });

  it('when pressing another key with Ctrl, should not match', () => {
    expect(isSettingsShortcut(input({ key: '.' }))).toBe(false);
  });

  it('when the key is released, should not match', () => {
    expect(isSettingsShortcut(input({ type: 'keyUp' }))).toBe(false);
  });

  it('when Alt or Shift are also held, should not match', () => {
    expect(isSettingsShortcut(input({ alt: true }))).toBe(false);
    expect(isSettingsShortcut(input({ shift: true }))).toBe(false);
  });
});
