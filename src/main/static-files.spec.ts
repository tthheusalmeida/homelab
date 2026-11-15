import * as path from 'node:path';

import { resolveStaticFile } from './static-files';

const dist = path.resolve('/front/dist');
const existing = new Set([path.join(dist, 'assets', 'app.js'), path.join(dist, 'favicon.svg')]);
const exists = (file: string) => existing.has(file);

describe('resolveStaticFile', () => {
  it('when the path is the root, should serve index.html', () => {
    expect(resolveStaticFile(dist, 'app://front/', exists)).toBe(path.join(dist, 'index.html'));
  });

  it('when the path is a client route without extension, should fall back to index.html', () => {
    expect(resolveStaticFile(dist, 'app://front/library/books/1', exists)).toBe(
      path.join(dist, 'index.html'),
    );
  });

  it('when the file exists, should serve it', () => {
    expect(resolveStaticFile(dist, 'app://front/assets/app.js', exists)).toBe(
      path.join(dist, 'assets', 'app.js'),
    );
  });

  it('when a file with extension does not exist, should return null', () => {
    expect(resolveStaticFile(dist, 'app://front/assets/missing.js', exists)).toBeNull();
  });

  it('when the path tries to escape the build folder, should return null', () => {
    expect(resolveStaticFile(dist, 'app://front/%2e%2e/%2e%2e/secret.txt', exists)).toBeNull();
  });

  it('when the path has an encoded name, should decode it before looking it up', () => {
    const file = path.join(dist, 'my file.png');

    expect(resolveStaticFile(dist, 'app://front/my%20file.png', (f) => f === file)).toBe(file);
  });
});
