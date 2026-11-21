import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SeedBinDirResult {
  copied: number;
  kept: number;
}

/**
 * Leva os binários que vêm no instalador (`source`) para a pasta persistente (`target`, nos dados do
 * usuário). Só copia o que falta ou mudou de tamanho: o que já está ali (inclusive o pacote CUDA e os
 * programas baixados pelo assistente) nunca é refeito, então atualizar o app não reinstala nada que
 * já foi instalado. Sem `source` (desenvolvimento sem binários) não faz nada.
 */
export async function seedBinDir(source: string, target: string): Promise<SeedBinDirResult> {
  const result: SeedBinDirResult = { copied: 0, kept: 0 };
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(source, { withFileTypes: true });
  } catch {
    return result;
  }
  const files = entries.filter((entry) => entry.isFile());
  if (files.length === 0) {
    return result;
  }
  await fs.promises.mkdir(target, { recursive: true });
  for (const file of files) {
    const from = path.join(source, file.name);
    const to = path.join(target, file.name);
    if (await sameSize(from, to)) {
      result.kept += 1;
      continue;
    }
    const temp = `${to}.partial`;
    await fs.promises.copyFile(from, temp);
    await fs.promises.rename(temp, to);
    result.copied += 1;
  }
  return result;
}

async function sameSize(from: string, to: string): Promise<boolean> {
  try {
    const [a, b] = await Promise.all([fs.promises.stat(from), fs.promises.stat(to)]);
    return a.size === b.size;
  } catch {
    return false;
  }
}
