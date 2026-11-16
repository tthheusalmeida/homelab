import * as path from 'node:path';

import { resolveYtDlpPath, ytDlpExecutableName } from './ytdlp-binary-resolver';

describe('resolveYtDlpPath', () => {
  const binDir = path.join('C:', 'app', 'bin');

  it('when the program is in the bin folder, should return its full path', () => {
    const result = resolveYtDlpPath({ binDir, platform: 'win32', exists: () => true });

    expect(result).toBe(path.join(binDir, 'yt-dlp.exe'));
  });

  it('when the program is not installed, should return null', () => {
    expect(resolveYtDlpPath({ binDir, platform: 'win32', exists: () => false })).toBeNull();
  });

  it('when the platform is not Windows, should look for the name without .exe', () => {
    expect(ytDlpExecutableName('linux')).toBe('yt-dlp');
    expect(ytDlpExecutableName('win32')).toBe('yt-dlp.exe');
  });

  it('when checking again after an install, should see the new file (no caching)', () => {
    let installed = false;
    const exists = () => installed;

    expect(resolveYtDlpPath({ binDir, platform: 'win32', exists })).toBeNull();

    installed = true;

    expect(resolveYtDlpPath({ binDir, platform: 'win32', exists })).not.toBeNull();
  });
});
