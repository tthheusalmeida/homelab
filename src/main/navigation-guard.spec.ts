import { classifyNavigation } from './navigation-guard';

const allowed = ['app://front', 'http://localhost:5173'];

describe('classifyNavigation', () => {
  it('when the url belongs to an allowed origin, should allow', () => {
    expect(classifyNavigation('app://front/library', allowed)).toBe('allow');
    expect(classifyNavigation('http://localhost:5173/x', allowed)).toBe('allow');
  });

  it('when the url is http(s) from another origin, should open externally', () => {
    expect(classifyNavigation('https://example.com', allowed)).toBe('external');
    expect(classifyNavigation('http://localhost:3000/api', allowed)).toBe('external');
  });

  it('when the url uses another protocol, should block', () => {
    expect(classifyNavigation('file:///etc/passwd', allowed)).toBe('block');
    expect(classifyNavigation('javascript:alert(1)', allowed)).toBe('block');
  });

  it('when the url is invalid, should block', () => {
    expect(classifyNavigation('not a url', allowed)).toBe('block');
  });
});
