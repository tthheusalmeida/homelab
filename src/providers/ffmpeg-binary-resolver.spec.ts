import * as path from 'node:path';

import {
  ffmpegExecutableName,
  FFMPEG_FROM_PATH,
  resolveFfmpegPath,
} from './ffmpeg-binary-resolver';

const binDir = path.resolve('/app/resources/bin/win32-x64');

describe('resolveFfmpegPath', () => {
  it('when the bundled ffmpeg exists, should return its full path', () => {
    const result = resolveFfmpegPath({ binDir, platform: 'win32', exists: () => true });

    expect(result).toBe(path.join(binDir, 'ffmpeg.exe'));
  });

  it('when there is no bundled ffmpeg, should fall back to the PATH', () => {
    const result = resolveFfmpegPath({ binDir, platform: 'win32', exists: () => false });

    expect(result).toBe(FFMPEG_FROM_PATH);
  });

  it('when the platform is not Windows, should look for the file without extension', () => {
    const exists = jest.fn(() => true);

    resolveFfmpegPath({ binDir, platform: 'linux', exists });

    expect(exists).toHaveBeenCalledWith(path.join(binDir, 'ffmpeg'));
    expect(ffmpegExecutableName('darwin')).toBe('ffmpeg');
  });
});
