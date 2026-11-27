import { Logger } from '@nestjs/common';

import type { JsonFile } from '../../../storage/json-file';
import {
  CHATS_FILE_VERSION,
  type ChatsFileData,
  type ChatsStartupReport,
  type StoredChat,
} from './chat.model';
import type { ChatRepository } from './chat.repository';

/** Avisa que algo não pôde ser gravado (as conversas continuam válidas em memória). */
export type PersistFailureListener = (reason: string) => void;

export function isStoredChat(value: unknown): value is StoredChat {
  const chat = value as Partial<StoredChat> | null;

  return (
    typeof chat === 'object' &&
    chat !== null &&
    typeof chat.id === 'string' &&
    typeof chat.title === 'string' &&
    typeof chat.createdAt === 'string' &&
    typeof chat.updatedAt === 'string' &&
    typeof chat.providerId === 'string' &&
    typeof chat.modelId === 'string' &&
    Array.isArray(chat.messages) &&
    chat.messages.every(
      (message) =>
        typeof message?.id === 'string' &&
        typeof message?.content === 'string' &&
        (message?.role === 'user' || message?.role === 'assistant') &&
        (message?.references === undefined || Array.isArray(message.references)),
    )
  );
}

/**
 * Conversas em um único `chats.json` (escrita atômica, com cópia `.bak`). Lê tudo ao abrir e regrava
 * o arquivo a cada mudança. **Nunca lança ao gravar**: erro de disco vira aviso ao usuário e a conversa
 * continua valendo em memória.
 */
export class FileChatRepository implements ChatRepository {
  private readonly chats = new Map<string, StoredChat>();
  private readonly logger = new Logger(FileChatRepository.name);
  private readonly report: ChatsStartupReport = { recoveredFromBackup: false, unreadable: false };

  constructor(
    private readonly file: JsonFile<ChatsFileData>,
    private readonly onPersistFailure: PersistFailureListener = () => undefined,
  ) {
    this.load();
  }

  findAll(): StoredChat[] {
    return [...this.chats.values()].map((chat) => structuredClone(chat));
  }

  findById(id: string): StoredChat | null {
    const chat = this.chats.get(id);

    return chat ? structuredClone(chat) : null;
  }

  save(chat: StoredChat): void {
    this.chats.set(chat.id, structuredClone(chat));
    this.persist();
  }

  remove(id: string): boolean {
    const existed = this.chats.delete(id);

    if (existed) {
      this.persist();
    }

    return existed;
  }

  startupReport(): ChatsStartupReport {
    return { ...this.report };
  }

  private load(): void {
    let data: ChatsFileData | null = null;

    try {
      data = this.file.read();
      this.report.recoveredFromBackup = this.file.recovered;
    } catch {
      this.report.unreadable = true;
      this.file.quarantine();
    }

    for (const chat of (Array.isArray(data?.chats) ? data.chats : []).filter(isStoredChat)) {
      this.chats.set(chat.id, chat);
    }
  }

  private persist(): void {
    try {
      this.file.write({ version: CHATS_FILE_VERSION, chats: [...this.chats.values()] });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';

      this.logger.error(`Não foi possível gravar as conversas: ${reason}`);
      this.onPersistFailure(reason);
    }
  }
}
