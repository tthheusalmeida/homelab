import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';

import type { AIService } from '../../ai/ai.service';
import { cheapestModel } from '../../ai/providers/gemini/gemini.pricing';

import { MindMapStore } from '../infrastructure/mind-map-store';

import { MindMapService } from './mind-map.service';
import type { LibraryService } from './library.service';

const goodAnswer = JSON.stringify({
  subtitle: 'Estuda a comunicação',
  nodes: [
    { label: 'Camadas', note: 'Níveis de uma pilha.', children: [{ label: 'TCP', children: [] }] },
  ],
});

describe('MindMapService', () => {
  let library: { get: jest.Mock };
  let ai: { chat: jest.Mock };
  let store: MindMapStore;
  let service: MindMapService;
  let content: string;
  let type: string;

  const sentMessage = () => (ai.chat.mock.calls as Array<[{ message: string }]>)[0][0].message;

  beforeEach(() => {
    content = '## Camadas\n- **TCP**: transporte';
    type = 'summary';
    library = {
      get: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ meta: { title: 'Redes', type }, content })),
    };
    ai = { chat: jest.fn().mockResolvedValue(goodAnswer) };
    store = new MindMapStore();
    service = new MindMapService(
      library as unknown as LibraryService,
      ai as unknown as AIService,
      store,
    );
  });

  describe('generate', () => {
    it('when the AI answers, should save and return the map with the model and no stale flag', async () => {
      const map = await service.generate('1');

      expect(map.nodes).toEqual([
        {
          label: 'Camadas',
          note: 'Níveis de uma pilha.',
          children: [{ label: 'TCP', children: [] }],
        },
      ]);
      expect(map.subtitle).toBe('Estuda a comunicação');
      expect(map.model).toBe(cheapestModel());
      expect(map.stale).toBe(false);
      expect(store.get('1')?.nodes).toEqual(map.nodes);
    });

    it('when generating, should use the mind map prompt with the title and content, on Gemini', async () => {
      await service.generate('1');

      expect(sentMessage()).toContain('Título: Redes');
      expect(sentMessage()).toContain('- **TCP**: transporte');
      expect(ai.chat).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'gemini' }));
    });

    it('when the user has custom instructions, should send them (with the fixed rules) instead of the default', async () => {
      const withPrompts = new MindMapService(
        library as unknown as LibraryService,
        ai as unknown as AIService,
        store,
        { instructionsFor: jest.fn().mockReturnValue('Mapa só com palavras-chave.') } as never,
      );

      await withPrompts.generate('1');

      expect(sentMessage().startsWith('Mapa só com palavras-chave.')).toBe(true);
      expect(sentMessage()).toContain('# REGRAS FIXAS DO APLICATIVO');
      expect(sentMessage()).toContain('Responda APENAS com um JSON válido');
    });

    it('when a model is chosen, should use it instead of the cheapest', async () => {
      const map = await service.generate('1', ' gemini-x ');

      expect(ai.chat).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'gemini-x' }));
      expect(map.model).toBe('gemini-x');
    });

    it('when the content is huge, should send only the first part', async () => {
      content = 'a'.repeat(200_000);

      await service.generate('1');

      expect(sentMessage().length).toBeLessThan(160_000);
    });

    it('when the page is not a summary, should refuse without calling the AI', async () => {
      type = 'transcription';

      await expect(service.generate('1')).rejects.toBeInstanceOf(BadRequestException);
      expect(ai.chat).not.toHaveBeenCalled();
    });

    it('when the page does not exist, should propagate the not found error', async () => {
      library.get.mockRejectedValue(new NotFoundException('sem página'));

      await expect(service.generate('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('when the provider fails, should answer 502 with the provider message and save nothing', async () => {
      ai.chat.mockRejectedValue(new Error('O limite de uso do Gemini foi atingido.'));

      const failure = service.generate('1');

      await expect(failure).rejects.toBeInstanceOf(BadGatewayException);
      await expect(failure).rejects.toThrow('O limite de uso do Gemini foi atingido.');
      expect(store.get('1')).toBeUndefined();
    });

    it('when the provider fails without a message, should use a generic one', async () => {
      ai.chat.mockRejectedValue(new Error(''));

      await expect(service.generate('1')).rejects.toThrow(
        'Não foi possível gerar o mapa mental com a IA. Tente novamente.',
      );
    });

    it('when the answer is not a valid map, should answer 502, save nothing and keep the old map', async () => {
      await service.generate('1');
      ai.chat.mockResolvedValue('isso não é JSON');

      await expect(service.generate('1')).rejects.toThrow(
        'A IA não retornou um mapa mental válido. Tente novamente.',
      );
      expect(store.get('1')?.nodes[0].label).toBe('Camadas');
    });

    it('when generated again, should replace the saved map', async () => {
      await service.generate('1');
      ai.chat.mockResolvedValue(JSON.stringify({ nodes: [{ label: 'Novo' }] }));

      await service.generate('1');

      expect(store.get('1')?.nodes).toEqual([{ label: 'Novo', children: [] }]);
    });

    it('when asked twice at the same time, should call the AI once and share the answer', async () => {
      const [first, second] = await Promise.all([service.generate('1'), service.generate('1')]);

      expect(ai.chat).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it('when a generation failed, should allow trying again', async () => {
      ai.chat.mockRejectedValueOnce(new Error('falhou'));

      await expect(service.generate('1')).rejects.toThrow('falhou');
      await expect(service.generate('1')).resolves.toBeDefined();
    });
  });

  describe('delete', () => {
    it('when deleting, should remove only the mind map of the page', async () => {
      await service.generate('1');
      await service.generate('2');

      await service.delete('1');

      expect(store.get('1')).toBeUndefined();
      expect(store.get('2')).toBeDefined();
      await expect(service.get('1')).resolves.toBeNull();
    });

    it('when the map was edited by the user, should delete it as well (the caller confirms before)', async () => {
      await service.generate('1');
      await service.save('1', { nodes: [{ label: 'Meu ramo', children: [] }] });

      await service.delete('1');

      await expect(service.get('1')).resolves.toBeNull();
    });

    it('when the page has no mind map, should not fail', async () => {
      await expect(service.delete('1')).resolves.toBeUndefined();
    });

    it('when the page does not exist, should let the NotFoundException through and delete nothing', async () => {
      await service.generate('1');
      library.get.mockRejectedValueOnce(new NotFoundException('Documento não encontrado'));

      await expect(service.delete('1')).rejects.toBeInstanceOf(NotFoundException);
      expect(store.get('1')).toBeDefined();
    });
  });

  describe('get', () => {
    it('when no map was generated, should return null', async () => {
      await expect(service.get('1')).resolves.toBeNull();
    });

    it('when a map exists and the text is unchanged, should return it not stale', async () => {
      await service.generate('1');

      await expect(service.get('1')).resolves.toMatchObject({ stale: false });
    });

    it('when the text changed after the map was generated, should return it marked as stale', async () => {
      await service.generate('1');
      content = '## Outra coisa';

      await expect(service.get('1')).resolves.toMatchObject({
        stale: true,
        nodes: [{ label: 'Camadas' }],
      });
    });

    it('when the page does not exist, should propagate the not found error', async () => {
      library.get.mockRejectedValue(new NotFoundException('sem página'));

      await expect(service.get('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('save', () => {
    const edited = {
      subtitle: 'Meu subtítulo',
      nodes: [
        { label: 'Meu termo', note: 'Minha frase', children: [{ label: 'Filho', children: [] }] },
      ],
    };

    it('when the user saves the edited map, should store it marked as edited and return it', async () => {
      const map = await service.save('1', edited);

      expect(map).toMatchObject({ subtitle: 'Meu subtítulo', edited: true, stale: false });
      expect(map.nodes[0]).toMatchObject({ label: 'Meu termo', note: 'Minha frase' });
      expect(store.get('1')).toMatchObject({ edited: true, subtitle: 'Meu subtítulo' });
    });

    it('when there was an AI map, should keep its model and creation date', async () => {
      const generated = await service.generate('1');

      await service.save('1', edited);

      expect(store.get('1')).toMatchObject({
        model: generated.model,
        createdAt: generated.createdAt,
      });
    });

    it('when there was no map yet (the user edited the simple one), should save it as a manual map', async () => {
      await service.save('1', edited);

      expect(store.get('1')?.model).toBe('manual');
    });

    it('when the summary text changed since the AI map, saving should clear the stale mark', async () => {
      await service.generate('1');
      content = '## Texto novo';

      await expect(service.get('1')).resolves.toMatchObject({ stale: true });

      await service.save('1', edited);

      await expect(service.get('1')).resolves.toMatchObject({ stale: false, edited: true });
    });

    it('when the text changes after saving, should mark the edited map as stale again but keep it edited', async () => {
      await service.save('1', edited);
      content = '## Outro texto';

      await expect(service.get('1')).resolves.toMatchObject({ stale: true, edited: true });
    });

    it('when the map has no branch with text, should answer 400 and keep the saved map', async () => {
      await service.save('1', edited);

      const failure = service.save('1', { nodes: [{ label: '  ', children: [] }] });

      await expect(failure).rejects.toBeInstanceOf(BadRequestException);
      await expect(failure).rejects.toThrow('O mapa precisa ter pelo menos um ramo com texto.');
      expect(store.get('1')?.nodes[0].label).toBe('Meu termo');
    });

    it('when the page is not a summary, should answer 400', async () => {
      type = 'transcription';

      await expect(service.save('1', edited)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('when the page does not exist, should propagate the not found error', async () => {
      library.get.mockRejectedValue(new NotFoundException('sem página'));

      await expect(service.save('x', edited)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('when generated again after an edit, should replace the edited map and drop the edited mark', async () => {
      await service.save('1', edited);

      const map = await service.generate('1');

      expect(map.edited).toBe(false);
      expect(store.get('1')?.edited).toBeUndefined();
    });

    it('when the AI map was never edited, should say it is not edited', async () => {
      await expect(service.generate('1')).resolves.toMatchObject({ edited: false });
      await expect(service.get('1')).resolves.toMatchObject({ edited: false });
    });
  });
});
