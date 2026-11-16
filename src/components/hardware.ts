import type {
  GpuInfo,
  HardwareProfile,
  HardwareRecommendation,
} from '../shared/contracts/components';

import { CUDA_PACK_ID } from './component-manifest';

export const HardwareMessages = {
  cudaStrong: (gpu: string, gb: number) =>
    `Encontramos uma placa NVIDIA (${gpu}, ${gb} GB de memória de vídeo). Ela acelera muito a transcrição, então marcamos a aceleração CUDA e o modelo large-v3-turbo, o mais preciso que ela comporta.`,
  cudaMedium: (gpu: string, gb: number) =>
    `Encontramos uma placa NVIDIA (${gpu}, ${gb} GB de memória de vídeo). Marcamos a aceleração CUDA e a versão compacta do large-v3-turbo, que cabe bem nessa memória.`,
  cudaSmall: (gpu: string) =>
    `Encontramos uma placa NVIDIA (${gpu}) com pouca memória de vídeo. Marcamos a aceleração CUDA e o modelo small, que roda sem sobrecarregá-la.`,
  cpuRam: (ramGb: number, integrated: string | null) =>
    `${integrated ? `Sua placa de vídeo (${integrated}) é integrada e não acelera o Whisper. ` : 'Não encontramos uma placa NVIDIA. '}A transcrição vai usar o processador. Com ${ramGb} GB de memória, marcamos a versão compacta do large-v3-turbo: boa qualidade sem pesar.`,
  cpuLowRam: (ramGb: number, integrated: string | null) =>
    `${integrated ? `Sua placa de vídeo (${integrated}) é integrada e não acelera o Whisper. ` : 'Não encontramos uma placa NVIDIA. '}A transcrição vai usar o processador e, com ${ramGb} GB de memória, marcamos o modelo small, mais leve.`,
  unknown:
    'Não conseguimos identificar sua placa de vídeo. Marcamos uma opção segura, que usa o processador.',
} as const;

const MB = 1024;

const MODEL_TURBO = 'model-large-v3-turbo';
const MODEL_TURBO_Q5 = 'model-large-v3-turbo-q5';
const MODEL_SMALL = 'model-small';

/** Placa NVIDIA com pelo menos esta memória (MB) roda o turbo completo. */
const STRONG_VRAM_MB = 6 * MB;
/** Abaixo disso, só o modelo small. */
const MEDIUM_VRAM_MB = 3 * MB;
/** Memória (MB) a partir da qual a versão compacta do turbo é confortável no processador. */
const COMFORTABLE_RAM_MB = 15 * MB;

const gb = (mb: number) => Math.round(mb / MB);

/** Escolhe aceleração e modelo a partir do hardware. Função pura (testável). */
export function recommendFor(gpus: GpuInfo[], ramMb: number): HardwareRecommendation {
  const nvidia = gpus
    .filter((gpu) => gpu.vendor === 'nvidia' && gpu.kind === 'dedicated')
    .sort((a, b) => (b.vramMb ?? 0) - (a.vramMb ?? 0))[0];

  if (nvidia) {
    const vram = nvidia.vramMb ?? 0;

    if (vram >= STRONG_VRAM_MB) {
      return {
        accelerator: 'cuda',
        componentIds: [CUDA_PACK_ID, MODEL_TURBO],
        modelId: MODEL_TURBO,
        message: HardwareMessages.cudaStrong(nvidia.name, gb(vram)),
      };
    }

    if (vram >= MEDIUM_VRAM_MB) {
      return {
        accelerator: 'cuda',
        componentIds: [CUDA_PACK_ID, MODEL_TURBO_Q5],
        modelId: MODEL_TURBO_Q5,
        message: HardwareMessages.cudaMedium(nvidia.name, gb(vram)),
      };
    }

    return {
      accelerator: 'cuda',
      componentIds: [CUDA_PACK_ID, MODEL_SMALL],
      modelId: MODEL_SMALL,
      message: HardwareMessages.cudaSmall(nvidia.name),
    };
  }

  if (gpus.length === 0) {
    return {
      accelerator: 'cpu',
      componentIds: [MODEL_SMALL],
      modelId: MODEL_SMALL,
      message: HardwareMessages.unknown,
    };
  }

  const integrated = gpus.find((gpu) => gpu.kind === 'integrated')?.name ?? null;
  const comfortable = ramMb >= COMFORTABLE_RAM_MB;
  const modelId = comfortable ? MODEL_TURBO_Q5 : MODEL_SMALL;

  return {
    accelerator: 'cpu',
    componentIds: [modelId],
    modelId,
    message: comfortable
      ? HardwareMessages.cpuRam(gb(ramMb), integrated)
      : HardwareMessages.cpuLowRam(gb(ramMb), integrated),
  };
}

export interface HardwareDeps {
  platform: NodeJS.Platform;
  /** Executa um programa e devolve a saída; falha se o programa não existir. */
  run: (file: string, args: string[]) => Promise<string>;
  totalMemoryMb: () => number;
}

const LIST_GPUS_SCRIPT =
  'Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress';

function vendorOf(name: string): GpuInfo['vendor'] {
  if (/nvidia|geforce|quadro|rtx|gtx/i.test(name)) {
    return 'nvidia';
  }

  if (/amd|radeon/i.test(name)) {
    return 'amd';
  }

  if (/intel/i.test(name)) {
    return 'intel';
  }

  return 'other';
}

function kindOf(name: string, vendor: GpuInfo['vendor']): GpuInfo['kind'] {
  if (vendor === 'nvidia') {
    return 'dedicated';
  }

  if (vendor === 'amd') {
    // "Radeon RX 7600" é dedicada; "Radeon(TM) Graphics" é a integrada do processador.
    return /radeon\s*(rx|pro|vii|r[579])\b/i.test(name) ? 'dedicated' : 'integrated';
  }

  if (vendor === 'intel') {
    // Arc dedicada tem número de modelo (A750, B580); "Arc(TM) Graphics" é a integrada.
    return /\barc\b.*\b[ab]\d{3}\b/i.test(name) ? 'dedicated' : 'integrated';
  }

  return 'integrated';
}

export function parseGpuList(json: string): GpuInfo[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const gpus: GpuInfo[] = [];

  for (const row of rows) {
    const { Name: name, AdapterRAM: adapterRam } = (row ?? {}) as {
      Name?: unknown;
      AdapterRAM?: unknown;
    };

    if (typeof name !== 'string' || !name.trim() || /basic|remote|virtual|microsoft/i.test(name)) {
      continue;
    }

    const vendor = vendorOf(name);

    gpus.push({
      name: name.trim(),
      vendor,
      kind: kindOf(name, vendor),
      // `AdapterRAM` satura em 4 GB (32 bits): serve de estimativa, o `nvidia-smi` corrige.
      vramMb:
        typeof adapterRam === 'number' && adapterRam > 0 ? Math.round(adapterRam / 1048576) : null,
    });
  }

  return gpus;
}

/** `nvidia-smi --query-gpu=name,memory.total` (csv, sem cabeçalho, MB): corrige a memória real. */
export function parseNvidiaSmi(output: string): Array<{ name: string; vramMb: number }> {
  return output
    .split(/\r?\n/)
    .map((line) => line.split(',').map((part) => part.trim()))
    .filter(([name, memory]) => name && Number.isFinite(Number(memory)) && Number(memory) > 0)
    .map(([name, memory]) => ({ name, vramMb: Number(memory) }));
}

/** Lê placa(s) de vídeo e memória e já devolve a recomendação. Nunca falha: sem dados, perfil "desconhecido". */
export async function detectHardware(deps: HardwareDeps): Promise<HardwareProfile> {
  const ramMb = Math.round(deps.totalMemoryMb());
  let gpus: GpuInfo[] = [];

  if (deps.platform === 'win32') {
    try {
      gpus = parseGpuList(
        await deps.run('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          LIST_GPUS_SCRIPT,
        ]),
      );
    } catch {
      gpus = [];
    }
  }

  if (gpus.some((gpu) => gpu.vendor === 'nvidia')) {
    try {
      const smi = parseNvidiaSmi(
        await deps.run('nvidia-smi', [
          '--query-gpu=name,memory.total',
          '--format=csv,noheader,nounits',
        ]),
      );

      gpus = gpus.map((gpu) => {
        const match = smi.find(
          (entry) => gpu.name.includes(entry.name) || entry.name.includes(gpu.name),
        );

        return match ? { ...gpu, vramMb: match.vramMb } : gpu;
      });
    } catch {
      // sem driver/nvidia-smi: segue com a estimativa do Windows
    }
  }

  return { gpus, ramMb, recommendation: recommendFor(gpus, ramMb) };
}
