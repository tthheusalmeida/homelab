import * as path from 'node:path';

import { INDEX_FILE } from './constants';

/**
 * Converte uma URL do protocolo `app` em arquivo do build do front.
 * - Caminho sem extensão (rota do React Router) cai no `index.html`.
 * - Tentativa de sair da pasta do build devolve `null`.
 * - Arquivo com extensão que não existe devolve `null` (404).
 */
export function resolveStaticFile(
  distDir: string,
  requestUrl: string,
  exists: (file: string) => boolean,
): string | null {
  const pathname = decodeURIComponent(new URL(requestUrl).pathname);
  const root = path.resolve(distDir);
  const target = path.resolve(root, `.${pathname}`);

  if (target !== root && !target.startsWith(root + path.sep)) {
    return null;
  }

  if (path.extname(target) === '') {
    return path.join(root, INDEX_FILE);
  }

  return exists(target) ? target : null;
}
