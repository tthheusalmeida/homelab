import * as fs from 'node:fs/promises';

import type { FilePicker } from '../ipc/file-picker';
import type { MindMapImagePort } from '../ipc/handlers/mind-map.handler';
import type { LibraryImageFormat, LibraryMindMapImageResult } from '../shared/contracts/library';
import { IpcError, IpcErrorCode } from '../shared/errors';

export const MindMapImageMessages = {
  invalid: 'A imagem não é válida. Tente baixar de novo.',
  tooLarge: 'A imagem ficou grande demais para salvar.',
  writeFailed: 'Não foi possível salvar a imagem. Verifique a pasta escolhida e o espaço em disco.',
} as const;

/** Maior arquivo aceito (o mapa ou o infográfico de um resumo cabe com folga; é só um limite de segurança). */
export const MAX_MIND_MAP_IMAGE_BYTES = 40 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_SIGNATURE = Buffer.from('%PDF-');
const DEFAULT_FILE_NAME = 'mapa-mental';

/** Como cada formato aparece no diálogo de salvar. */
const FORMATS: Record<LibraryImageFormat, { filter: string; extension: string }> = {
  png: { filter: 'Imagem PNG', extension: 'png' },
  svg: { filter: 'Imagem SVG', extension: 'svg' },
  pdf: { filter: 'Documento PDF', extension: 'pdf' },
};

/** Escritor de arquivo (trocado nos testes). */
export type FileWriter = (path: string, data: Buffer) => Promise<void>;

/** O conteúdo é mesmo do formato dito? (PNG e PDF pelo começo do arquivo; SVG pela tag raiz.) */
function matchesFormat(data: Buffer, format: LibraryImageFormat): boolean {
  if (format === 'png') {
    return data.length >= PNG_SIGNATURE.length && data.subarray(0, 8).equals(PNG_SIGNATURE);
  }

  if (format === 'pdf') {
    return data.length >= PDF_SIGNATURE.length && data.subarray(0, 5).equals(PDF_SIGNATURE);
  }

  return /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(data.subarray(0, 512).toString('utf8'));
}

/** Nome de arquivo seguro: sem caracteres proibidos no Windows, sem pontos nas pontas, com a extensão do formato. */
export function safeFileName(name: string, format: LibraryImageFormat = 'png'): string {
  const { extension } = FORMATS[format];
  const base = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`\\.${extension}$`, 'i'), '')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 100)
    .trim();

  return `${base || DEFAULT_FILE_NAME}.${extension}`;
}

/** Nome seguro de um PNG. */
export const safePngName = (name: string): string => safeFileName(name, 'png');

/**
 * Salva a imagem (PNG, SVG) ou o PDF do mapa mental ou do infográfico onde o usuário escolher
 * (diálogo "Salvar como" do sistema). Confere que o conteúdo é mesmo do formato dito antes de abrir o
 * diálogo, e acrescenta a extensão se o usuário digitar um nome sem ela. Fechar o diálogo não é
 * erro: devolve `{ saved: false }`.
 */
export class MindMapImageSaver implements MindMapImagePort {
  constructor(
    private readonly picker: FilePicker,
    private readonly write: FileWriter = (path, data) => fs.writeFile(path, data),
  ) {}

  async save(
    fileName: string,
    dataBase64: string,
    format: LibraryImageFormat = 'png',
  ): Promise<LibraryMindMapImageResult> {
    const data = Buffer.from(dataBase64, 'base64');

    if (!matchesFormat(data, format)) {
      throw new IpcError(IpcErrorCode.VALIDATION, MindMapImageMessages.invalid);
    }

    if (data.length > MAX_MIND_MAP_IMAGE_BYTES) {
      throw new IpcError(IpcErrorCode.VALIDATION, MindMapImageMessages.tooLarge);
    }

    const { filter, extension } = FORMATS[format];
    const chosen = await this.picker.pickSavePath({
      defaultPath: safeFileName(fileName, format),
      filters: [{ name: filter, extensions: [extension] }],
    });

    if (!chosen) {
      return { saved: false };
    }

    const path = new RegExp(`\\.${extension}$`, 'i').test(chosen)
      ? chosen
      : `${chosen}.${extension}`;

    try {
      await this.write(path, data);
    } catch {
      throw new IpcError(IpcErrorCode.PERSIST_FAILED, MindMapImageMessages.writeFailed);
    }

    return { saved: true, path };
  }
}
