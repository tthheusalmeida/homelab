/**
 * Idiomas que o reconhecimento de texto em imagens entende. É o **registro único**: o catálogo de
 * componentes, o detector de idioma e o adaptador do motor leem daqui. Idioma novo = uma linha na
 * lista de ids, uma entrada em `OCR_LANGUAGES` (o compilador cobra) e as palavras em
 * `language-profiles.ts`.
 */
export const OCR_LANGUAGE_IDS = ['por', 'eng', 'spa', 'fra', 'deu', 'ita'] as const;

export type OcrLanguageId = (typeof OCR_LANGUAGE_IDS)[number];

/** Rápido: modelos menores e mais velozes. Alta qualidade: mais precisos, porém mais lentos. */
export const OCR_QUALITIES = ['fast', 'best'] as const;

export type OcrQuality = (typeof OCR_QUALITIES)[number];

/** Qualidade baixada sozinha quando um idioma falta (a de alta qualidade, se instalada, vale mais). */
export const OCR_AUTO_INSTALL_QUALITY: OcrQuality = 'fast';

/** Idioma usado só para ler a amostra que revela o idioma do documento. */
export const OCR_BOOTSTRAP_LANGUAGE: OcrLanguageId = 'eng';

export interface OcrModelFile {
  sizeBytes: number;
  sha256: string;
}

export interface OcrLanguage {
  /** Nome em português, mostrado ao usuário. */
  label: string;
  models: Record<OcrQuality, OcrModelFile>;
}

/** Os dados de idioma vêm de um commit fixo de cada repositório, para o checksum nunca mudar. */
export const OCR_MODEL_SOURCES: Record<OcrQuality, string> = {
  fast: 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/87416418657359cb625c412a48b6e1d6d41c29bd',
  best: 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/e12c65a915945e4c28e237a9b52bc4a8f39a0cec',
};

export const OCR_LANGUAGES: Record<OcrLanguageId, OcrLanguage> = {
  por: {
    label: 'Português',
    models: {
      fast: {
        sizeBytes: 1_982_756,
        sha256: 'c4932b937207a9514b7514d518b931a99938c02a28a5a5a553f8599ed58b7deb',
      },
      best: {
        sizeBytes: 8_159_939,
        sha256: '711de9dbb8052067bd42f16b9119967f30bada80d57e2ef24f65d09f531adb04',
      },
    },
  },
  eng: {
    label: 'Inglês',
    models: {
      fast: {
        sizeBytes: 4_113_088,
        sha256: '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2',
      },
      best: {
        sizeBytes: 15_400_601,
        sha256: '8280aed0782fe27257a68ea10fe7ef324ca0f8d85bd2fd145d1c2b560bcb66ba',
      },
    },
  },
  spa: {
    label: 'Espanhol',
    models: {
      fast: {
        sizeBytes: 2_294_433,
        sha256: '6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464',
      },
      best: {
        sizeBytes: 13_570_187,
        sha256: 'e2c1ffdad8b30f26c45d4017a9183d3a7f9aa69e59918be4f88b126fac99ab2c',
      },
    },
  },
  fra: {
    label: 'Francês',
    models: {
      fast: {
        sizeBytes: 1_130_365,
        sha256: 'ced037562e8c80c13122dece28dd477d399af80911a28791a66a63ac1e3445ca',
      },
      best: {
        sizeBytes: 3_972_885,
        sha256: '907743d98915c91a3906dfbf6e48b97598346698fe53aaa797e1a064ffcac913',
      },
    },
  },
  deu: {
    label: 'Alemão',
    models: {
      fast: {
        sizeBytes: 1_525_436,
        sha256: '19d219bbb6672c869d20a9636c6816a81eb9a71796cb93ebe0cb1530e2cdb22d',
      },
      best: {
        sizeBytes: 8_628_461,
        sha256: '8407331d6aa0229dc927685c01a7938fc5a641d1a9524f74838cdac599f0d06e',
      },
    },
  },
  ita: {
    label: 'Italiano',
    models: {
      fast: {
        sizeBytes: 2_701_314,
        sha256: 'b8f89e1e785118dac4d51ae042c029a64edb5c3ee42ef73027a6d412748d8827',
      },
      best: {
        sizeBytes: 8_863_635,
        sha256: '8df9c89176fb93f56bf4b2d4ede04c01c1f31d4b7697fbd76cc336df700f3f38',
      },
    },
  },
};

export const isOcrLanguageId = (value: string): value is OcrLanguageId =>
  (OCR_LANGUAGE_IDS as readonly string[]).includes(value);

/** Nome do arquivo de dados do idioma (o formato que o motor exige). */
export const ocrModelFile = (language: OcrLanguageId): string => `${language}.traineddata`;

/** Id do componente no catálogo: `ocr-por-fast`, `ocr-fra-best`... */
export const ocrComponentId = (language: OcrLanguageId, quality: OcrQuality): string =>
  `ocr-${language}-${quality}`;

/** Caminho (relativo à pasta de modelos) onde o catálogo grava os dados de um idioma. */
export const ocrComponentFile = (language: OcrLanguageId, quality: OcrQuality): string =>
  `ocr/${quality}/${ocrModelFile(language)}`;
