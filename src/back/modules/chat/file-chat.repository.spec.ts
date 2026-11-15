import * as fs from 'node:fs';
import * as path from 'node:path';

import { makeTempDir, removeDir } from '../../../settings/settings.testing';
import { JsonFile } from '../../../storage/json-file';

import type { ChatsFileData, StoredChat } from './chat.model';
import { FileChatRepository } from './file-chat.repository';
import { InMemoryChatRepository } from './in-memory-chat.repository';

const chat = (id: string, overrides: Partial<StoredChat> = {}): StoredChat => ({
  id,
  title: `Chat ${id}`,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  providerId: 'ollama',
  modelId: 'm',
  messageCount: 2,
  messages: [
    { id: `${id}-1`, role: 'user', content: 'oi', createdAt: '2026-01-01T10:00:00.000Z' },
    { id: `${id}-2`, role: 'assistant', content: 'olá', createdAt: '2026-01-01T10:00:00.000Z' },
  ],
  ...overrides,
});

describe('FileChatRepository', () => {
  let dir: string;
  let target: string;
  let failures: string[];

  const create = () =>
    new FileChatRepository(new JsonFile<ChatsFileData>(target), (reason) => failures.push(reason));

  beforeEach(() => {
    dir = makeTempDir();
    target = path.join(dir, 'data', 'chats.json');
    failures = [];
  });

  afterEach(() => removeDir(dir));

  it('when there is no file yet, should start empty without creating one', () => {
    const repository = create();

    expect(repository.findAll()).toEqual([]);
    expect(fs.existsSync(target)).toBe(false);
    expect(repository.startupReport()).toEqual({ recoveredFromBackup: false, unreadable: false });
  });

  it('when saving a chat, should write the file right away and survive a reload with every message', () => {
    create().save(chat('a', { thinking: 'on' }));

    expect(create().findById('a')).toEqual(chat('a', { thinking: 'on' }));
  });

  it('when saving the same chat again, should replace it instead of duplicating', () => {
    const repository = create();

    repository.save(chat('a'));
    repository.save(chat('a', { title: 'Novo título' }));

    expect(create().findAll()).toHaveLength(1);
    expect(create().findById('a')?.title).toBe('Novo título');
  });

  it('when removing a chat, should delete it from memory and from the file and say it existed', () => {
    const repository = create();

    repository.save(chat('a'));
    repository.save(chat('b'));

    expect(repository.remove('a')).toBe(true);
    expect(
      create()
        .findAll()
        .map((item) => item.id),
    ).toEqual(['b']);
  });

  it('when removing an unknown chat, should answer false and not rewrite the file', () => {
    const repository = create();

    repository.save(chat('a'));
    const before = fs.statSync(target).mtimeMs;

    expect(repository.remove('nope')).toBe(false);
    expect(fs.statSync(target).mtimeMs).toBe(before);
  });

  it('when the caller changes what was returned, should not change the stored chat', () => {
    const repository = create();

    repository.save(chat('a'));
    repository.findById('a')?.messages.pop();
    repository.findAll()[0].messages.pop();

    expect(repository.findById('a')?.messages).toHaveLength(2);
  });

  it('when the main file is corrupt but the backup is good, should recover from the backup and report it', () => {
    const repository = create();

    repository.save(chat('a'));
    repository.save(chat('b'));
    fs.writeFileSync(target, '{ quebrado');

    const reopened = create();

    expect(reopened.findAll().map((item) => item.id)).toEqual(['a']);
    expect(reopened.startupReport()).toEqual({ recoveredFromBackup: true, unreadable: false });
  });

  it('when neither the file nor a backup can be read, should start empty, keep the corrupt file and report it', () => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '{ quebrado');

    const repository = create();

    expect(repository.findAll()).toEqual([]);
    expect(repository.startupReport().unreadable).toBe(true);
    expect(fs.readFileSync(`${target}.corrupt`, 'utf8')).toBe('{ quebrado');
  });

  it('when some entries in the file are malformed, should ignore only those', () => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(
      target,
      JSON.stringify({
        version: 1,
        chats: [
          chat('bom'),
          { id: 5 },
          null,
          { ...chat('ruim'), messages: [{ id: 'x', role: 'sistema', content: 'y' }] },
        ],
      }),
    );

    expect(
      create()
        .findAll()
        .map((item) => item.id),
    ).toEqual(['bom']);
  });

  it('when the file is valid JSON but has no chats list, should start empty', () => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({ version: 1 }));

    expect(create().findAll()).toEqual([]);
  });

  it('when writing to disk fails, should not throw, keep the chat in memory and tell the listener why', () => {
    const repository = create();
    const write = jest.spyOn(JsonFile.prototype, 'write').mockImplementation(() => {
      throw new Error('disco cheio');
    });

    try {
      expect(() => repository.save(chat('a'))).not.toThrow();
    } finally {
      write.mockRestore();
    }

    expect(repository.findById('a')).toEqual(chat('a'));
    expect(failures).toEqual(['disco cheio']);
  });
});

describe('InMemoryChatRepository', () => {
  it('when saving, finding and removing, should behave like the file repository without touching the disk', () => {
    const repository = new InMemoryChatRepository();

    repository.save(chat('a'));

    expect(repository.findAll()).toEqual([chat('a')]);
    expect(repository.findById('a')).toEqual(chat('a'));
    expect(repository.findById('b')).toBeNull();
    expect(repository.remove('a')).toBe(true);
    expect(repository.remove('a')).toBe(false);
    expect(repository.startupReport()).toEqual({ recoveredFromBackup: false, unreadable: false });
  });

  it('when the caller changes what was returned or what was saved, should not change the stored chat', () => {
    const repository = new InMemoryChatRepository();
    const original = chat('a');

    repository.save(original);
    original.messages.pop();
    repository.findById('a')?.messages.pop();

    expect(repository.findById('a')?.messages).toHaveLength(2);
  });
});
