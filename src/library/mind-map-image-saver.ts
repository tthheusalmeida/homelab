import * as fs from 'node:fs/promises';

import type { FilePicker } from '../ipc/file-picker';
import type { MindMapImagePort } from '../ipc/handlers/mind-map.handler';
import type { LibraryMindMapImageResult } from '../shared/contracts/library';
import { IpcError, IpcErrorCode } from '../shared/errors';

export const MindMapImageMessages = {
  invalid: 'A imagem do mapa mental não é válida. Tente baixar de novo.',
  tooLarge: 'A imagem do mapa mental ficou grande demais para salvar.',
  writeFailed: 'Não foi possível salvar a imagem. Verifique a pasta escolhida e o espaço em disco.',
} as const;

/** Maior PNG aceito (o mapa de um resumo cabe com folga; é só um limite de segurança). */
export const MAX_MIND_MAP_IMAGE_BYTES = 40 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DEFAULT_FILE_NAME = 'mapa-mental.png';

/** Escritor de arquivo (trocado nos testes). */
export type FileWriter = (path: string, data: Buffer) => Promise<void>;

/** Nome de arquivo seguro: sem caracteres proibidos no Windows, sem pontos nas pontas, com `.png`. */
export function safePngName(name: string): string {
  const base = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.png$/i, '')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 100)
    .trim();

  return `${base || DEFAULT_FILE_NAME.replace(/\.png$/, '')}.png`;
}

/**
 * Salva a imagem PNG do mapa mental onde o usuário escolher (diálogo "Salvar como" do sistema).
 * Confere que o conteúdo é mesmo um PNG antes de abrir o diálogo, e acrescenta `.png` se o usuário
 * digitar um nome sem extensão. Fechar o diálogo não é erro: devolve `{ saved: false }`.
 */
export class MindMapImageSaver implements MindMapImagePort {
  constructor(
    private readonly picker: FilePicker,
    private readonly write: FileWriter = (path, data) => fs.writeFile(path, data),
  ) {}

  async save(fileName: string, dataBase64: string): Promise<LibraryMindMapImageResult> {
    const png = Buffer.from(dataBase64, 'base64');

    if (png.length < PNG_SIGNATURE.length || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new IpcError(IpcErrorCode.VALIDATION, MindMapImageMessages.invalid);
    }

    if (png.length > MAX_MIND_MAP_IMAGE_BYTES) {
      throw new IpcError(IpcErrorCode.VALIDATION, MindMapImageMessages.tooLarge);
    }

    const chosen = await this.picker.pickSavePath({
      defaultPath: safePngName(fileName),
      filters: [{ name: 'Imagem PNG', extensions: ['png'] }],
    });

    if (!chosen) {
      return { saved: false };
    }

    const path = /\.png$/i.test(chosen) ? chosen : `${chosen}.png`;

    try {
      await this.write(path, png);
    } catch {
      throw new IpcError(IpcErrorCode.PERSIST_FAILED, MindMapImageMessages.writeFailed);
    }

    return { saved: true, path };
  }
}
