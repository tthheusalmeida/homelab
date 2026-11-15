import type { ChatDetail } from '../../../shared/contracts/chat';

/** Chat como fica gravado em disco: o mesmo formato que a tela recebe em `chats:get`. */
export type StoredChat = ChatDetail;

export const CHATS_FILE_VERSION = 1;

export interface ChatsFileData {
  version: number;
  chats: StoredChat[];
}

/** O que aconteceu com o arquivo de conversas ao abrir o app (para avisar o usuário). */
export interface ChatsStartupReport {
  /** O arquivo principal estava ilegível e a cópia `.bak` foi usada. */
  recoveredFromBackup: boolean;
  /** Nem o arquivo nem a cópia puderam ser lidos: as conversas começaram vazias. */
  unreadable: boolean;
}
