// Funções de empacotamento dos binários embutidos, usadas por `bin-fetch.mjs` e `bin-pack.mjs`.
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Arquivos que NÃO entram no pacote (iguais aos excluídos do instalador em electron-builder.yml). */
export function isExcludedFromPack(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.bin') ||
    /^(cublas|cudart|nvblas|nvrtc)/.test(lower) ||
    lower === 'ggml-cuda.dll' ||
    // O app baixa e atualiza o yt-dlp pelo assistente (muda toda semana): não vai no instalador.
    lower === 'yt-dlp.exe'
  );
}

/**
 * `tar` que sabe ler e criar .zip (bsdtar). No Windows é o do sistema, pelo caminho completo: o
 * `tar` do Git Bash é o GNU tar, que não abre zip.
 */
export function zipTar() {
  return process.platform === 'win32'
    ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar';
}

export function sha256OfFile(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Baixa `url` para `target` e confere o SHA-256. Apaga o arquivo e lança erro se não bater. */
export async function downloadVerified(url, sha256, target, fetchImpl = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  const actual = sha256OfFile(target);
  if (actual !== sha256.toLowerCase()) {
    fs.rmSync(target, { force: true });
    throw new Error(`SHA-256 de ${url} não confere (esperado ${sha256}, recebido ${actual}).`);
  }
}
