import type { GpuInfo } from '../shared/contracts/components';

import {
  detectHardware,
  HardwareMessages,
  parseGpuList,
  parseNvidiaSmi,
  recommendFor,
} from './hardware';

const nvidia = (vramMb: number | null, name = 'NVIDIA GeForce RTX 3060'): GpuInfo => ({
  name,
  vendor: 'nvidia',
  kind: 'dedicated',
  vramMb,
});
const intel: GpuInfo = {
  name: 'Intel(R) UHD Graphics',
  vendor: 'intel',
  kind: 'integrated',
  vramMb: 128,
};

describe('recommendFor', () => {
  it('when there is an NVIDIA card with 6 GB or more, should recommend CUDA and the full turbo model', () => {
    const result = recommendFor([nvidia(12288)], 32768);

    expect(result.accelerator).toBe('cuda');
    expect(result.componentIds).toEqual(['cuda-pack', 'model-large-v3-turbo', 'yt-dlp']);
    expect(result.modelId).toBe('model-large-v3-turbo');
    expect(result.message).toBe(HardwareMessages.cudaStrong('NVIDIA GeForce RTX 3060', 12));
  });

  it('when the NVIDIA card has between 3 and 6 GB, should recommend CUDA and the compact turbo', () => {
    const result = recommendFor([nvidia(4096)], 16384);

    expect(result.componentIds).toEqual(['cuda-pack', 'model-large-v3-turbo-q5', 'yt-dlp']);
  });

  it('when the NVIDIA card has little memory, should recommend CUDA and the small model', () => {
    const result = recommendFor([nvidia(2048)], 16384);

    expect(result.componentIds).toEqual(['cuda-pack', 'model-small', 'yt-dlp']);
  });

  it('when there is only an integrated GPU and plenty of RAM, should recommend CPU and the compact turbo', () => {
    const result = recommendFor([intel], 16384);

    expect(result.accelerator).toBe('cpu');
    expect(result.componentIds).toEqual(['model-large-v3-turbo-q5', 'yt-dlp']);
    expect(result.message).toContain('integrada');
  });

  it('when there is only an integrated GPU and little RAM, should recommend the small model', () => {
    const result = recommendFor([intel], 8192);

    expect(result.componentIds).toEqual(['model-small', 'yt-dlp']);
  });

  it('when the hardware is any, should always recommend yt-dlp to download platform videos', () => {
    for (const gpus of [[], [intel], [nvidia(12288)]]) {
      expect(recommendFor(gpus, 8192).componentIds).toContain('yt-dlp');
    }
  });

  it('when no GPU is known, should recommend a safe CPU option', () => {
    const result = recommendFor([], 16384);

    expect(result.accelerator).toBe('cpu');
    expect(result.message).toBe(HardwareMessages.unknown);
  });

  it('when the only NVIDIA entry is not dedicated, should not recommend CUDA', () => {
    const result = recommendFor([{ ...nvidia(8192), kind: 'integrated' }], 16384);

    expect(result.accelerator).toBe('cpu');
  });
});

describe('parseGpuList', () => {
  it('when the output is a list, should classify vendor and dedicated or integrated', () => {
    const json = JSON.stringify([
      { Name: 'NVIDIA GeForce RTX 3060', AdapterRAM: 4293918720 },
      { Name: 'AMD Radeon(TM) Graphics', AdapterRAM: 536870912 },
      { Name: 'AMD Radeon RX 7600', AdapterRAM: 4293918720 },
      { Name: 'Intel(R) Arc(TM) A750 Graphics', AdapterRAM: 0 },
      { Name: 'Microsoft Basic Display Adapter', AdapterRAM: 0 },
    ]);

    const gpus = parseGpuList(json);

    expect(gpus.map((gpu) => [gpu.vendor, gpu.kind])).toEqual([
      ['nvidia', 'dedicated'],
      ['amd', 'integrated'],
      ['amd', 'dedicated'],
      ['intel', 'dedicated'],
    ]);
    expect(gpus[0].vramMb).toBe(4095);
    expect(gpus[3].vramMb).toBeNull();
  });

  it('when the output is a single object, should treat it as one GPU', () => {
    expect(parseGpuList('{"Name":"NVIDIA GeForce GTX 1650","AdapterRAM":4294967295}')).toHaveLength(
      1,
    );
  });

  it('when the output is not JSON, should return an empty list', () => {
    expect(parseGpuList('erro')).toEqual([]);
  });
});

describe('parseNvidiaSmi', () => {
  it('when reading csv lines, should return name and memory in MB', () => {
    expect(parseNvidiaSmi('NVIDIA GeForce RTX 3060, 12288\n')).toEqual([
      { name: 'NVIDIA GeForce RTX 3060', vramMb: 12288 },
    ]);
  });

  it('when a line is invalid, should skip it', () => {
    expect(parseNvidiaSmi('lixo\nNVIDIA X, abc')).toEqual([]);
  });
});

describe('detectHardware', () => {
  const list = JSON.stringify([{ Name: 'NVIDIA GeForce RTX 3060', AdapterRAM: 4293918720 }]);

  it('when nvidia-smi answers, should use its real memory', async () => {
    const run = jest
      .fn()
      .mockResolvedValueOnce(list)
      .mockResolvedValueOnce('NVIDIA GeForce RTX 3060, 12288');

    const profile = await detectHardware({ platform: 'win32', run, totalMemoryMb: () => 32768 });

    expect(profile.gpus[0].vramMb).toBe(12288);
    expect(profile.recommendation.modelId).toBe('model-large-v3-turbo');
    expect(profile.ramMb).toBe(32768);
  });

  it('when nvidia-smi is missing, should keep the Windows estimate', async () => {
    const run = jest.fn().mockResolvedValueOnce(list).mockRejectedValueOnce(new Error('ENOENT'));

    const profile = await detectHardware({ platform: 'win32', run, totalMemoryMb: () => 16384 });

    expect(profile.gpus[0].vramMb).toBe(4095);
    expect(profile.recommendation.accelerator).toBe('cuda');
  });

  it('when listing the GPUs fails, should still return a CPU recommendation', async () => {
    const run = jest.fn().mockRejectedValue(new Error('sem powershell'));

    const profile = await detectHardware({ platform: 'win32', run, totalMemoryMb: () => 16384 });

    expect(profile.gpus).toEqual([]);
    expect(profile.recommendation.accelerator).toBe('cpu');
  });

  it('when the platform is not Windows, should not run anything and recommend CPU', async () => {
    const run = jest.fn();

    const profile = await detectHardware({ platform: 'linux', run, totalMemoryMb: () => 8192 });

    expect(run).not.toHaveBeenCalled();
    expect(profile.recommendation.accelerator).toBe('cpu');
  });
});
