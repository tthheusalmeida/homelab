import * as fs from 'node:fs';
import * as path from 'node:path';

import { JsonFile } from './json-file';
import { makeTempDir, removeDir } from './settings.testing';

describe('JsonFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => removeDir(dir));

  it('when the file does not exist, should read null', () => {
    expect(new JsonFile(path.join(dir, 'a.json')).read()).toBeNull();
  });

  it('when writing, should create missing folders and read the same data back', () => {
    const file = new JsonFile<{ a: number }>(path.join(dir, 'nested', 'a.json'));

    file.write({ a: 1 });

    expect(file.read()).toEqual({ a: 1 });
    expect(file.exists()).toBe(true);
  });

  it('when writing, should not leave a temporary file behind', () => {
    const target = path.join(dir, 'a.json');

    new JsonFile(target).write({ a: 1 });

    expect(fs.readdirSync(dir)).toEqual(['a.json']);
  });

  it('when the content is not valid JSON, should throw on read', () => {
    const target = path.join(dir, 'a.json');
    fs.writeFileSync(target, '{ quebrado');

    expect(() => new JsonFile(target).read()).toThrow(SyntaxError);
  });

  it('when quarantining, should move the file to .corrupt keeping its content', () => {
    const target = path.join(dir, 'a.json');
    fs.writeFileSync(target, 'lixo');

    const file = new JsonFile(target);
    file.quarantine();

    expect(file.exists()).toBe(false);
    expect(fs.readFileSync(`${target}.corrupt`, 'utf8')).toBe('lixo');
  });
});
