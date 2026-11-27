import {
  OCR_LANGUAGE_IDS,
  OCR_LANGUAGES,
  OCR_MODEL_SOURCES,
  OCR_QUALITIES,
  ocrComponentFile,
  ocrComponentId,
  ocrModelFile,
  type OcrLanguageId,
  type OcrQuality,
} from '../back/modules/pdf/ocr/ocr-languages';
import type { ComponentGroup } from '../shared/contracts/components';
import { EMBEDDING_MODEL, EMBEDDING_MODEL_BYTES } from '../shared/embedding-model';

/**
 * Catálogo de componentes. Para acrescentar uma dependência, acrescente uma entrada aqui: o
 * assistente e Configurações > Componentes mostram a lista a partir dele.
 *
 * - `bundled`: já vem no instalador; só é conferido (existe o arquivo?).
 * - `file`: arquivo baixado para a pasta de modelos.
 * - `zip`: pacote baixado e extraído na pasta de binários (ao lado do `whisper-cli`).
 * - `binary`: programa único baixado direto para a pasta de binários (o yt-dlp).
 * - `ollama-model`: modelo do assistente local, baixado do registro do Ollama pelo próprio assistente
 *   (`file` é a referência do modelo, ex.: `qwen3.5:4b`); quem o instala e detecta é um
 *   `ComponentInstaller`, não o download com checksum.
 * - `ollama-pull`: o mesmo modelo, mas baixado no Ollama que o **usuário** instalou e liga (Linux):
 *   o app só manda o Ollama baixar e pergunta a ele o que já tem.
 */
export interface ComponentSpec {
  id: string;
  group: ComponentGroup;
  label: string;
  description: string;
  required: boolean;
  kind: 'bundled' | 'file' | 'zip' | 'binary' | 'ollama-model' | 'ollama-pull';
  sizeBytes: number;
  /** Arquivo que prova que está instalado (relativo à pasta de binários ou à de modelos). */
  file: string;
  /** Só para o que não é `bundled`. */
  download?: { url: string; sha256: string };
  /** Só para `zip`: arquivos extraídos (relativos à pasta de binários), conferidos na detecção. */
  provides?: string[];
  /** Só para `zip`: pasta (dentro de `packagesDir`) onde o pacote é extraído e onde `provides` é conferido; sem ela, a pasta de binários. */
  extractTo?: string;
}

/** Sistema + arquitetura (`win32-x64`, `linux-x64`...): a mesma chave da pasta `resources/bin`. */
export type PlatformTarget = string;

/** O que muda de um sistema para outro num mesmo componente. */
export type ComponentVariant = Pick<ComponentSpec, 'kind' | 'sizeBytes' | 'file'> &
  Partial<Pick<ComponentSpec, 'download' | 'provides' | 'extractTo'>>;

/**
 * Entrada do catálogo. O usuário vê um item só, com o mesmo nome em qualquer sistema; `variants`
 * diz como ele é obtido em cada sistema. Com `variants`, o item só existe nos sistemas listados
 * (ex.: o pacote CUDA não aparece no Linux); sem `variants`, vale para todos.
 */
export type ComponentTemplate = Omit<ComponentSpec, keyof ComponentVariant> &
  Partial<ComponentVariant> & { variants?: Record<PlatformTarget, ComponentVariant> };

export function platformTarget(platform: string, arch: string): PlatformTarget {
  return `${platform}-${arch}`;
}

const HUGGING_FACE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';
const RELEASES = 'https://github.com/tthheusalmeida/homelab/releases/download/components-v1';

export const CUDA_PACK_ID = 'cuda-pack';
export const WHISPER_RUNTIME_ID = 'whisper-runtime';
export const FFMPEG_ID = 'ffmpeg';
export const YTDLP_ID = 'yt-dlp';
export const OLLAMA_RUNTIME_ID = 'ollama-runtime';
export const EMBEDDING_MODEL_ID = 'llm-embedding';

/** Pasta (dentro dos pacotes, nos dados do usuário) do programa do assistente local: ele traz as próprias bibliotecas. */
export const OLLAMA_FOLDER = 'ollama';

/** Versão do assistente local do catálogo (Windows). O pacote é o do projeto oficial, com checksum. */
const OLLAMA_RELEASE = 'https://github.com/ollama/ollama/releases/download/v0.40.18';

/** Versão do yt-dlp do catálogo. O programa se atualiza sozinho (`yt-dlp -U`) quando um site muda. */
const YTDLP_VERSION = '2026.10.26';
const YTDLP_RELEASE = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}`;

/**
 * Pacote do Windows (`whisper-cli.exe`, as DLLs de CPU e o `ffmpeg.exe`), o mesmo que a CI embute no
 * instalador (`scripts/windows-bin.json`, Release `bin-v1`). O app o baixa quando os arquivos não
 * estão na pasta de binários (ambiente de desenvolvimento, pasta apagada). Se o pacote mudar, atualize
 * aqui e em `windows-bin.json` (o teste do catálogo confere os dois).
 */
export const WINDOWS_BIN_PACKAGE = {
  url: 'https://github.com/tthheusalmeida/homelab/releases/download/bin-v1/win32-x64.zip',
  sha256: '1b2b4cf8c31a8687e0600cf3550bda5961f7f756661da80d7ea9251e02d6a199',
  sizeBytes: 44_378_682,
} as const;

/** Builds estáticos do ffmpeg (um arquivo só, sem instalador) usados fora do Windows. */
const FFMPEG_STATIC = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1';
const FFMPEG_LINUX_X64_SHA256 = 'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99';

export interface ModelSpecInput {
  id: string;
  label: string;
  description: string;
  file: string;
  sizeBytes: number;
  sha256: string;
}

function model(input: ModelSpecInput): ComponentTemplate {
  return {
    id: input.id,
    group: 'model',
    label: input.label,
    description: input.description,
    required: false,
    kind: 'file',
    sizeBytes: input.sizeBytes,
    file: input.file,
    download: { url: `${HUGGING_FACE}/${input.file}`, sha256: input.sha256 },
  };
}

interface AssistantModelInput {
  id: string;
  label: string;
  description: string;
  /** Referência do modelo no registro do Ollama (`nome:tamanho`). */
  ref: string;
  sizeBytes: number;
}

/**
 * Modelo do Ollama. No Windows vai para o assistente que o app instala; no Linux, para o Ollama que
 * o usuário instalou e liga (o app manda baixar e pergunta a ele o que já tem).
 */
function assistantModel(input: AssistantModelInput): ComponentTemplate {
  return {
    id: input.id,
    group: 'llm',
    label: input.label,
    description: input.description,
    required: false,
    variants: {
      'win32-x64': { kind: 'ollama-model', sizeBytes: input.sizeBytes, file: input.ref },
      'linux-x64': { kind: 'ollama-pull', sizeBytes: input.sizeBytes, file: input.ref },
    },
  };
}

const OCR_QUALITY_LABELS: Record<OcrQuality, { label: string; description: string }> = {
  fast: {
    label: 'rápido',
    description: 'Leitura rápida e leve; erra um pouco mais em letras pequenas.',
  },
  best: {
    label: 'alta qualidade',
    description: 'Leitura mais precisa, porém mais lenta. Vale mais que a rápida quando instalada.',
  },
};

/** Dados de um idioma para ler texto em imagens (PDF escaneado), numa qualidade. */
function ocrLanguage(language: OcrLanguageId, quality: OcrQuality): ComponentTemplate {
  const { label, models } = OCR_LANGUAGES[language];
  const { sizeBytes, sha256 } = models[quality];

  return {
    id: ocrComponentId(language, quality),
    group: 'ocr',
    label: `${label} (${OCR_QUALITY_LABELS[quality].label})`,
    description: OCR_QUALITY_LABELS[quality].description,
    required: false,
    kind: 'file',
    sizeBytes,
    file: ocrComponentFile(language, quality),
    download: { url: `${OCR_MODEL_SOURCES[quality]}/${ocrModelFile(language)}`, sha256 },
  };
}

/** Um item por idioma e qualidade, gerado do registro de idiomas: idioma novo aparece sozinho. */
export const OCR_TEMPLATES: readonly ComponentTemplate[] = OCR_LANGUAGE_IDS.flatMap((language) =>
  OCR_QUALITIES.map((quality) => ocrLanguage(language, quality)),
);

/** Ordem de preferência quando o usuário ainda não escolheu o modelo ativo. */
export const COMPONENT_TEMPLATES: readonly ComponentTemplate[] = [
  {
    id: WHISPER_RUNTIME_ID,
    group: 'runtime',
    label: 'Transcrição',
    description: 'Transforma o áudio das aulas em texto, direto no seu computador.',
    required: true,
    variants: {
      // O pacote do Windows traz também o ffmpeg: ao instalar a Transcrição, o Processamento de
      // áudio (`bundled`, só conferido) passa a existir.
      'win32-x64': {
        kind: 'zip',
        sizeBytes: WINDOWS_BIN_PACKAGE.sizeBytes,
        file: 'whisper-cli.exe',
        download: { url: WINDOWS_BIN_PACKAGE.url, sha256: WINDOWS_BIN_PACKAGE.sha256 },
        provides: [
          'whisper-cli.exe',
          'whisper.dll',
          'ggml.dll',
          'ggml-base.dll',
          'ggml-cpu-x64.dll',
        ],
      },
      'linux-x64': {
        kind: 'binary',
        sizeBytes: 4_757_280,
        file: 'whisper-cli',
        download: {
          url: `${RELEASES}/whisper-cli-linux-x64`,
          sha256: 'c881c3b7aa897e7e4c219ae07e8651d3163bd72b191890c376f48bbcc6b9911b',
        },
      },
    },
  },
  {
    id: FFMPEG_ID,
    group: 'runtime',
    label: 'Processamento de áudio',
    description: 'Extrai o áudio dos vídeos antes de transcrever.',
    required: true,
    variants: {
      'win32-x64': { kind: 'bundled', sizeBytes: 0, file: 'ffmpeg' },
      'linux-x64': {
        kind: 'binary',
        sizeBytes: 79_826_272,
        file: 'ffmpeg',
        download: {
          url: `${FFMPEG_STATIC}/ffmpeg-linux-x64`,
          sha256: FFMPEG_LINUX_X64_SHA256,
        },
      },
    },
  },
  {
    id: YTDLP_ID,
    group: 'download',
    label: 'Download de vídeos',
    description:
      'Baixa vídeos do YouTube e de outras plataformas, só o áudio. Sem ele o app só baixa links diretos para o arquivo do vídeo.',
    required: false,
    variants: {
      'win32-x64': {
        kind: 'binary',
        sizeBytes: 23_575_744,
        file: 'yt-dlp',
        download: {
          url: `${YTDLP_RELEASE}/yt-dlp.exe`,
          sha256: 'f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d',
        },
      },
      'linux-x64': {
        kind: 'binary',
        sizeBytes: 41_166_968,
        file: 'yt-dlp',
        download: {
          url: `${YTDLP_RELEASE}/yt-dlp_linux`,
          sha256: '767ba9dce7052aa196f8b12652f433d76de128ba168966fa84b6394d5e6c6795',
        },
      },
    },
  },
  {
    id: CUDA_PACK_ID,
    group: 'gpu',
    label: 'Aceleração por placa de vídeo',
    description:
      'Faz a transcrição usar a placa de vídeo, bem mais rápido que o processador. Só funciona com placas de vídeo compatíveis.',
    required: false,
    variants: {
      'win32-x64': {
        kind: 'zip',
        sizeBytes: 654_034_278,
        file: 'ggml-cuda.dll',
        download: {
          url: `${RELEASES}/whisper-cuda12-win32-x64.zip`,
          sha256: 'a8c187242e3e24546c13986e769aff0213221b53448d4a15ee3c09935d232cf5',
        },
        provides: [
          'ggml-cuda.dll',
          'cublas64_12.dll',
          'cublasLt64_12.dll',
          'cudart64_12.dll',
          'nvblas64_12.dll',
          'nvrtc64_120_0.dll',
          'nvrtc-builtins64_124.dll',
        ],
      },
    },
  },
  model({
    id: 'model-large-v3-turbo',
    label: 'Transcrição de alta qualidade',
    description: 'Muito precisa e rápida. Pede uma boa placa de vídeo (6 GB ou mais) ou paciência.',
    file: 'ggml-large-v3-turbo.bin',
    sizeBytes: 1_624_555_275,
    sha256: '1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69',
  }),
  model({
    id: 'model-large-v3-turbo-q5',
    label: 'Transcrição de alta qualidade (compacta)',
    description:
      'Quase a mesma qualidade da versão completa, com um terço do tamanho. Bom para processador.',
    file: 'ggml-large-v3-turbo-q5_0.bin',
    sizeBytes: 574_041_195,
    sha256: '394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2',
  }),
  model({
    id: 'model-large-v3',
    label: 'Transcrição de máxima qualidade',
    description: 'A mais precisa, porém lenta e pesada. Para placa de vídeo forte (10 GB ou mais).',
    file: 'ggml-large-v3.bin',
    sizeBytes: 3_095_033_483,
    sha256: '64d182b440b98d5203c4f9bd541544d84c605196c4f7b845dfa11fb23594d1e2',
  }),
  model({
    id: 'model-medium-q5',
    label: 'Transcrição equilibrada (compacta)',
    description: 'Equilibrado e leve. Boa opção para computador com pouca memória.',
    file: 'ggml-medium-q5_0.bin',
    sizeBytes: 539_212_467,
    sha256: '19fea4b380c3a618ec4723c3eef2eb785ffba0d0538cf43f8f235e7b3b34220f',
  }),
  model({
    id: 'model-small',
    label: 'Transcrição rápida',
    description: 'Rápido e leve, com qualidade razoável. Para computadores simples.',
    file: 'ggml-small.bin',
    sizeBytes: 487_601_967,
    sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
  }),
  model({
    id: 'model-base',
    label: 'Transcrição básica',
    description: 'O menor e mais rápido, mas erra mais. Serve para testar.',
    file: 'ggml-base.bin',
    sizeBytes: 147_951_465,
    sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
  }),
  {
    id: OLLAMA_RUNTIME_ID,
    group: 'assistant',
    label: 'Assistente local',
    description:
      'Roda a inteligência artificial no seu computador, sem internet e sem enviar nada para fora. É o motor dos assistentes abaixo e ocupa cerca de 2 GB.',
    required: false,
    variants: {
      'win32-x64': {
        kind: 'zip',
        sizeBytes: 1_717_307_988,
        file: 'ollama.exe',
        extractTo: OLLAMA_FOLDER,
        provides: ['ollama.exe'],
        download: {
          url: `${OLLAMA_RELEASE}/ollama-windows-amd64.zip`,
          sha256: 'ca97292ac1e9acc77fcf473bb2741fa6acd12e3798f261b419680068b7cc4c16',
        },
      },
    },
  },
  assistantModel({
    id: 'llm-light',
    label: 'Assistente leve',
    description:
      'Para computadores simples. Responde bem perguntas diretas sobre as suas páginas, mas se perde em perguntas longas.',
    ref: 'qwen3.5:2b',
    sizeBytes: 2_683_396_812,
  }),
  assistantModel({
    id: 'llm-balanced',
    label: 'Assistente equilibrado',
    description:
      'O melhor custo-benefício: respostas organizadas e fiéis às suas páginas. Pede cerca de 8 GB de memória.',
    ref: 'qwen3.5:4b',
    sizeBytes: 3_324_173_934,
  }),
  assistantModel({
    id: 'llm-strong',
    label: 'Assistente avançado',
    description:
      'Respostas mais completas. Pede um computador forte: placa de vídeo com 8 GB ou 16 GB de memória.',
    ref: 'qwen3.5:9b',
    sizeBytes: 6_550_825_550,
  }),
  assistantModel({
    id: 'llm-max',
    label: 'Assistente máximo',
    description:
      'O mais capaz e o mais pesado. Só para placa de vídeo com 24 GB ou computador com 32 GB de memória ou mais.',
    ref: 'qwen3.5:27b',
    sizeBytes: 17_478_556_591,
  }),
  assistantModel({
    id: EMBEDDING_MODEL_ID,
    label: 'Busca por sentido',
    description:
      'Faz o chat achar as suas páginas pelo sentido da pergunta, e não só pelas palavras. Pequeno, funciona junto com qualquer assistente acima e roda em qualquer computador.',
    ref: EMBEDDING_MODEL,
    sizeBytes: EMBEDDING_MODEL_BYTES,
  }),
  ...OCR_TEMPLATES,
];

/** Os componentes do sistema dado: cada item já com a forma de obtenção daquele sistema. */
export function catalogFor(
  target: PlatformTarget,
  templates: readonly ComponentTemplate[] = COMPONENT_TEMPLATES,
): ComponentSpec[] {
  const specs: ComponentSpec[] = [];

  for (const { variants, ...template } of templates) {
    const variant = variants ? variants[target] : {};

    if (!variant) {
      continue;
    }

    specs.push({ ...template, ...variant } as ComponentSpec);
  }

  return specs;
}

export function findComponent(id: string, target: PlatformTarget): ComponentSpec | undefined {
  return catalogFor(target).find((spec) => spec.id === id);
}

export function modelSpecs(target: PlatformTarget): ComponentSpec[] {
  return catalogFor(target).filter((spec) => spec.group === 'model');
}
