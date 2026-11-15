import type { ChatsStartupReport, StoredChat } from './chat.model';

export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface ChatRepository {
  findAll(): StoredChat[];

  findById(id: string): StoredChat | null;

  /** Cria ou substitui o chat. */
  save(chat: StoredChat): void;

  /** `true` se o chat existia. */
  remove(id: string): boolean;

  startupReport(): ChatsStartupReport;
}
