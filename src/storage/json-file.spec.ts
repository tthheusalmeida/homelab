import * as fs from 'node:fs';
import * as path from 'node:path';

import { JsonFile } from './json-file';
import { makeTempDir, removeDir } from '../settings/settings.testing';

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

describe('JsonFile backup', () => {
  let dir: string;
  let target: string;

  beforeEach(() => {
    dir = makeTempDir();
    target = path.join(dir, 'a.json');
  });

  afterEach(() => removeDir(dir));

  it('when overwriting a valid file, should keep the previous version in .bak', () => {
    const file = new JsonFile<{ a: number }>(target);

    file.write({ a: 1 });
    file.write({ a: 2 });

    expect(JSON.parse(fs.readFileSync(`${target}.bak`, 'utf8'))).toEqual({ a: 1 });
    expect(file.read()).toEqual({ a: 2 });
  });

  it('when writing the first time, should not create a .bak', () => {
    new JsonFile(target).write({ a: 1 });

    expect(fs.existsSync(`${target}.bak`)).toBe(false);
  });

  it('when the main file is corrupt, should read the .bak, mark it as recovered and keep the corrupt copy', () => {
    const file = new JsonFile<{ a: number }>(target);

    file.write({ a: 1 });
    file.write({ a: 2 });
    fs.writeFileSync(target, '{ quebrado');

    expect(file.read()).toEqual({ a: 1 });
    expect(file.recovered).toBe(true);
    expect(fs.readFileSync(`${target}.corrupt`, 'utf8')).toBe('{ quebrado');
    expect(JSON.parse(fs.readFileSync(target, 'utf8'))).toEqual({ a: 1 });
  });

  it('when the main file is corrupt, should not let it overwrite the last good .bak on the next write', () => {
    const file = new JsonFile<{ a: number }>(target);

    file.write({ a: 1 });
    file.write({ a: 2 });
    fs.writeFileSync(target, '{ quebrado');
    file.write({ a: 3 });

    expect(JSON.parse(fs.readFileSync(`${target}.bak`, 'utf8'))).toEqual({ a: 1 });
  });

  it('when both the main file and the .bak are corrupt, should throw on read', () => {
    fs.writeFileSync(target, '{ quebrado');
    fs.writeFileSync(`${target}.bak`, 'tambem quebrado');

    expect(() => new JsonFile(target).read()).toThrow(SyntaxError);
  });

  it('when reading a healthy file after a recovery, should clear the recovered flag', () => {
    const file = new JsonFile<{ a: number }>(target);

    file.write({ a: 1 });
    file.write({ a: 2 });
    fs.writeFileSync(target, 'x');
    file.read();
    file.read();

    expect(file.recovered).toBe(false);
  });
});
