import * as path from 'node:path';

import { createAppPaths, createWhisperConfig } from './app-paths';

describe('createAppPaths', () => {
  const root = path.resolve('/dados/HomeLab');

  it('when given a root, should derive every folder and state file from it', () => {
    const paths = createAppPaths(root);

    expect(paths).toEqual({
      rootDir: root,
      defaultLibraryDir: path.join(root, 'library'),
      inboxDir: path.join(root, 'inbox'),
      videoTempDir: path.join(root, 'temp', 'video'),
      audioTempDir: path.join(root, 'temp', 'audio'),
      dataDir: path.join(root, 'data'),
      configDir: path.join(root, 'config'),
      settingsFile: path.join(root, 'config', 'settings.json'),
      jobsFile: path.join(root, 'data', 'jobs.json'),
      chatsFile: path.join(root, 'data', 'chats.json'),
      usageFile: path.join(root, 'data', 'ai-usage.json'),
    });
  });

  it('when building the state files, should keep every one of them out of temp (temp never goes into a backup)', () => {
    const paths = createAppPaths(root);

    for (const file of [paths.jobsFile, paths.chatsFile, paths.usageFile, paths.settingsFile]) {
      expect(file.startsWith(path.join(root, 'temp'))).toBe(false);
    }
  });
});

describe('createWhisperConfig', () => {
  it('when the platform is Windows, should use the .exe and the default model', () => {
    expect(createWhisperConfig('/bin/w', 'win32')).toEqual({
      directory: '/bin/w',
      executable: 'whisper-cli.exe',
      model: 'ggml-large-v3-turbo.bin',
    });
  });

  it('when the platform is not Windows, should use the executable without extension', () => {
    expect(createWhisperConfig('/bin/w', 'linux').executable).toBe('whisper-cli');
  });
});
