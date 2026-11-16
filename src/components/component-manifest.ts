import type { ComponentGroup } from '../shared/contracts/components';

/**
 * Catálogo de componentes. Para acrescentar uma dependência, acrescente uma entrada aqui: o
 * assistente e Configurações > Componentes mostram a lista a partir dele.
 *
 * - `bundled`: já vem no instalador; só é conferido (existe o arquivo?).
 * - `file`: arquivo baixado para a pasta de modelos.
 * - `zip`: pacote baixado e extraído na pasta de binários (ao lado do `whisper-cli`).
 */
export interface ComponentSpec {
  id: string;
  group: ComponentGroup;
  label: string;
  description: string;
  required: boolean;
  kind: 'bundled' | 'file' | 'zip';
  sizeBytes: number;
  /** Arquivo que prova que está instalado (relativo à pasta de binários ou à de modelos). */
  file: string;
  /** Só para `file` e `zip`. */
  download?: { url: string; sha256: string };
  /** Só para `zip`: arquivos extraídos (relativos à pasta de binários), conferidos na detecção. */
  provides?: string[];
}

const HUGGING_FACE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';
const RELEASES = 'https://github.com/tthheusalmeida/homelab/releases/download/components-v1';

export const CUDA_PACK_ID = 'cuda-pack';
export const WHISPER_RUNTIME_ID = 'whisper-runtime';
export const FFMPEG_ID = 'ffmpeg';

export interface ModelSpecInput {
  id: string;
  label: string;
  description: string;
  file: string;
  sizeBytes: number;
  sha256: string;
}

function model(input: ModelSpecInput): ComponentSpec {
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

/** Ordem de preferência quando o usuário ainda não escolheu o modelo ativo. */
export const COMPONENT_CATALOG: readonly ComponentSpec[] = [
  {
    id: WHISPER_RUNTIME_ID,
    group: 'runtime',
    label: 'Whisper (transcrição)',
    description: 'Programa que transforma o áudio das aulas em texto. Roda no seu computador.',
    required: true,
    kind: 'bundled',
    sizeBytes: 0,
    file: 'whisper-cli',
  },
  {
    id: FFMPEG_ID,
    group: 'runtime',
    label: 'ffmpeg (áudio)',
    description: 'Extrai o áudio dos vídeos antes de transcrever.',
    required: true,
    kind: 'bundled',
    sizeBytes: 0,
    file: 'ffmpeg',
  },
  {
    id: CUDA_PACK_ID,
    group: 'gpu',
    label: 'Aceleração por placa NVIDIA (CUDA)',
    description:
      'Faz o Whisper usar a placa de vídeo NVIDIA, bem mais rápido que o processador. Só funciona com placa NVIDIA.',
    required: false,
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
  model({
    id: 'model-large-v3-turbo',
    label: 'Modelo large-v3-turbo',
    description: 'Muito preciso e rápido. Pede uma boa placa de vídeo (6 GB ou mais) ou paciência.',
    file: 'ggml-large-v3-turbo.bin',
    sizeBytes: 1_624_555_275,
    sha256: '1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69',
  }),
  model({
    id: 'model-large-v3-turbo-q5',
    label: 'Modelo large-v3-turbo (compacto)',
    description: 'Quase a mesma qualidade do turbo, com um terço do tamanho. Bom para processador.',
    file: 'ggml-large-v3-turbo-q5_0.bin',
    sizeBytes: 574_041_195,
    sha256: '394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2',
  }),
  model({
    id: 'model-large-v3',
    label: 'Modelo large-v3',
    description: 'O mais preciso, porém lento e pesado. Para placa de vídeo forte (10 GB ou mais).',
    file: 'ggml-large-v3.bin',
    sizeBytes: 3_095_033_483,
    sha256: '64d182b440b98d5203c4f9bd541544d84c605196c4f7b845dfa11fb23594d1e2',
  }),
  model({
    id: 'model-medium-q5',
    label: 'Modelo medium (compacto)',
    description: 'Equilibrado e leve. Boa opção para computador com pouca memória.',
    file: 'ggml-medium-q5_0.bin',
    sizeBytes: 539_212_467,
    sha256: '19fea4b380c3a618ec4723c3eef2eb785ffba0d0538cf43f8f235e7b3b34220f',
  }),
  model({
    id: 'model-small',
    label: 'Modelo small',
    description: 'Rápido e leve, com qualidade razoável. Para computadores simples.',
    file: 'ggml-small.bin',
    sizeBytes: 487_601_967,
    sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
  }),
  model({
    id: 'model-base',
    label: 'Modelo base',
    description: 'O menor e mais rápido, mas erra mais. Serve para testar.',
    file: 'ggml-base.bin',
    sizeBytes: 147_951_465,
    sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
  }),
];

export function findComponent(id: string): ComponentSpec | undefined {
  return COMPONENT_CATALOG.find((spec) => spec.id === id);
}

export function modelSpecs(): ComponentSpec[] {
  return COMPONENT_CATALOG.filter((spec) => spec.group === 'model');
}
