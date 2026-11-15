import { buildSeed, parseDotenv } from './env-seed';

describe('parseDotenv', () => {
  it('when the text has comments, blanks and CRLF, should read only the assignments', () => {
    const text = '# comentário\r\n\r\nLIB_DIR=D:/lib\r\nPORT=3000\r\n';

    expect(parseDotenv(text)).toEqual({ LIB_DIR: 'D:/lib', PORT: '3000' });
  });

  it('when a value is quoted, should remove the quotes', () => {
    expect(parseDotenv('A="x y"\nB=\'z\'')).toEqual({ A: 'x y', B: 'z' });
  });

  it('when a value contains an equals sign, should keep it', () => {
    expect(parseDotenv('URL=http://x?a=b')).toEqual({ URL: 'http://x?a=b' });
  });

  it('when a line has no key or no equals sign, should ignore it', () => {
    expect(parseDotenv('=sem-chave\nsolta')).toEqual({});
  });
});

describe('buildSeed', () => {
  const env = {
    LIB_DIR: 'D:/homelab/lib',
    TEMP_DOCS_DIR: 'D:/homelab/temp/docs',
    TEMP_VIDEO_DIR: 'D:/homelab/temp/video',
    TEMP_AUDIO_DIR: 'D:/homelab/temp/audio',
    WHISPER_DIR: 'D:/homelab/ai/whisper',
    WHISPER_EXECUTABLE: 'whisper-cli.exe',
    WHISPER_MODEL: 'ggml-large-v3-turbo.bin',
    OLLAMA_URL: 'http://localhost:11434',
    GEMINI_API_KEY: 'AIza-x',
  };

  it('when the legacy env is complete, should map every value to the new settings and the key', () => {
    expect(buildSeed(env)).toEqual({
      settings: {
        paths: {
          libraryDir: 'D:/homelab/lib',
          inboxDir: 'D:/homelab/temp/docs',
          videoTempDir: 'D:/homelab/temp/video',
          audioTempDir: 'D:/homelab/temp/audio',
        },
        local: {
          whisper: {
            directory: 'D:/homelab/ai/whisper',
            executable: 'whisper-cli.exe',
            model: 'ggml-large-v3-turbo.bin',
          },
          ollama: { url: 'http://localhost:11434' },
        },
      },
      geminiApiKey: 'AIza-x',
    });
  });

  it('when values are missing or blank, should leave them out so defaults apply', () => {
    expect(buildSeed({ LIB_DIR: 'D:/lib', OLLAMA_URL: '   ' })).toEqual({
      settings: { paths: { libraryDir: 'D:/lib' } },
      geminiApiKey: null,
    });
  });

  it('when the env is empty, should produce an empty seed', () => {
    expect(buildSeed({})).toEqual({ settings: {}, geminiApiKey: null });
  });
});
