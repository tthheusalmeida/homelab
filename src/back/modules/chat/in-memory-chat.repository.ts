import type { ChatsStartupReport, StoredChat } from './chat.model';
import type { ChatRepository } from './chat.repository';

export class InMemoryChatRepository implements ChatRepository {
  private readonly chats = new Map<string, StoredChat>();

  findAll(): StoredChat[] {
    return [...this.chats.values()].map((chat) => structuredClone(chat));
  }

  findById(id: string): StoredChat | null {
    const chat = this.chats.get(id);

    return chat ? structuredClone(chat) : null;
  }

  save(chat: StoredChat): void {
    this.chats.set(chat.id, structuredClone(chat));
  }

  remove(id: string): boolean {
    return this.chats.delete(id);
  }

  startupReport(): ChatsStartupReport {
    return { recoveredFromBackup: false, unreadable: false };
  }
}
