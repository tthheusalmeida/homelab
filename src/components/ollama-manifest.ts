import * as path from 'node:path';

/**
 * Arquivo que prova que o modelo está instalado: o "manifesto" que o assistente grava ao terminar o
 * download (`<modelos>/manifests/registry.ollama.ai/library/<nome>/<tamanho>`). Ele só aparece com
 * o modelo completo, então a detecção não precisa ligar o assistente.
 */
export function manifestPath(modelsDir: string, ref: string): string {
  const [name, tag = 'latest'] = ref.split(':');
  const namespaced = name.includes('/') ? name : `library/${name}`;

  return path.join(modelsDir, 'manifests', 'registry.ollama.ai', ...namespaced.split('/'), tag);
}
