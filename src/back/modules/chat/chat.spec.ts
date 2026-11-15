import { ChatService } from './chat.service';
import type { AIService } from '../ai/ai.service';

const dto = {
  message: 'oi',
  modelId: 'm',
  providerId: 'ollama' as const,
};

describe('ChatService', () => {
  it('when chatting, should wrap the AI answer in { message }', async () => {
    const ai = { chat: jest.fn().mockResolvedValue('resposta') };
    const service = new ChatService(ai as unknown as AIService);

    await expect(service.chat(dto)).resolves.toEqual({ message: 'resposta' });
    expect(ai.chat).toHaveBeenCalledWith(dto);
  });

  it('when the AI service fails, should propagate the error', async () => {
    const ai = { chat: jest.fn().mockRejectedValue(new Error('x')) };
    const service = new ChatService(ai as unknown as AIService);

    await expect(service.chat(dto)).rejects.toThrow('x');
  });
});
