import type {
  ComponentInfo,
  ComponentsStatus,
  HardwareProfile,
} from '#shared/contracts/components';

export const component = (overrides: Partial<ComponentInfo> = {}): ComponentInfo => ({
  id: 'model-small',
  group: 'model',
  label: 'Modelo small',
  description: 'Rápido e leve.',
  required: false,
  bundled: false,
  sizeBytes: 487_601_967,
  state: 'missing',
  progress: null,
  error: null,
  recommended: false,
  active: false,
  ...overrides,
});

export const hardware = (overrides: Partial<HardwareProfile> = {}): HardwareProfile => ({
  gpus: [{ name: 'NVIDIA GeForce RTX 3060', vendor: 'nvidia', kind: 'dedicated', vramMb: 12288 }],
  ramMb: 32768,
  recommendation: {
    accelerator: 'cuda',
    componentIds: ['cuda-pack', 'model-small'],
    modelId: 'model-small',
    message: 'Encontramos uma placa NVIDIA. Marcamos a aceleração CUDA e o modelo small.',
  },
  ...overrides,
});

/** Estado típico de um primeiro uso: obrigatórios instalados e nenhum modelo ainda. */
export const setupStatus = (overrides: Partial<ComponentsStatus> = {}): ComponentsStatus => ({
  components: [
    component({
      id: 'whisper-runtime',
      group: 'runtime',
      label: 'Whisper (transcrição)',
      required: true,
      bundled: true,
      sizeBytes: 0,
      state: 'installed',
    }),
    component({
      id: 'cuda-pack',
      group: 'gpu',
      label: 'Aceleração por placa NVIDIA (CUDA)',
      sizeBytes: 654_034_278,
      recommended: true,
    }),
    component({ id: 'model-small', recommended: true }),
    component({
      id: 'model-base',
      label: 'Modelo base',
      sizeBytes: 147_951_465,
    }),
  ],
  hardware: hardware(),
  running: false,
  overall: null,
  needsSetup: true,
  ...overrides,
});
