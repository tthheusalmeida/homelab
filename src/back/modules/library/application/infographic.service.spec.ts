import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';

import type { AIService } from '../../ai/ai.service';
import { cheapestModel } from '../../ai/providers/gemini/gemini.pricing';

import type { LibraryInfographic } from '../../../../shared/contracts/library';
import type { StoredInfographic } from '../domain/infographic';
import { InfographicStore } from '../infrastructure/infographic-store';

import { InfographicService } from './infographic.service';
import type { LibraryService } from './library.service';

const goodAnswer = JSON.stringify({
  title: 'Como a internet chega',
  subtitle: 'Do servidor à tela',
  intro: 'Uma rede de redes.',
  piece: 'tecnologia.wifi',
  sections: [
    {
      layout: 'steps',
      title: 'O caminho',
      items: [
        { piece: 'tecnologia.servidor', title: 'Servidor', text: 'Guarda o site.' },
        { piece: 'tecnologia.nuvem', title: 'Rede', text: 'Leva os dados.' },
        { piece: 'tecnologia.celular', title: 'Aparelho', text: 'Mostra a página.' },
      ],
    },
    {
      layout: 'timeline',
      title: 'A história',
      items: [
        { title: 'A', text: 'a', tag: '1969' },
        { title: 'B', text: 'b', tag: '1990' },
        { title: 'C', text: 'c', tag: '2010' },
      ],
    },
    {
      layout: 'steps',
      title: 'As camadas',
      items: [
        { title: 'Enlace', text: 'Liga os aparelhos.' },
        { title: 'Rede', text: 'Escolhe o caminho.' },
        { title: 'Aplicação', text: 'Entrega ao programa.' },
      ],
    },
    {
      layout: 'timeline',
      title: 'Os marcos',
      items: [
        { title: 'D', text: 'd', tag: '1983' },
        { title: 'E', text: 'e', tag: '1991' },
        { title: 'F', text: 'f', tag: '2007' },
      ],
    },
  ],
  takeaways: ['Tudo é uma rede de redes.'],
});

describe('InfographicService', () => {
  let library: { get: jest.Mock };
  let ai: { chat: jest.Mock };
  let store: InfographicStore;
  let service: InfographicService;
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
    store = new InfographicStore();
    service = new InfographicService(
      library as unknown as LibraryService,
      ai as unknown as AIService,
      store,
    );
  });

  describe('delete', () => {
    it('when deleting, should remove only the infographic of the page', async () => {
      await service.generate('1');
      await service.generate('2');

      await service.delete('1');

      expect(store.get('1')).toBeUndefined();
      expect(store.get('2')).toBeDefined();
      await expect(service.get('1')).resolves.toBeNull();
    });

    it('when the page has no infographic, should not fail', async () => {
      await expect(service.delete('1')).resolves.toBeUndefined();
    });

    it('when the page does not exist, should let the NotFoundException through and delete nothing', async () => {
      await service.generate('1');
      library.get.mockRejectedValueOnce(new NotFoundException('Documento não encontrado'));

      await expect(service.delete('1')).rejects.toBeInstanceOf(NotFoundException);
      expect(store.get('1')).toBeDefined();
    });

    it('when deleting, should be possible to generate it again afterwards', async () => {
      await service.generate('1');
      await service.delete('1');

      await expect(service.generate('1')).resolves.toMatchObject({
        title: 'Como a internet chega',
      });
    });
  });

  describe('save', () => {
    const edited = async (patch: (view: LibraryInfographic) => LibraryInfographic) => {
      const generated = await service.generate('1');
      const { model, createdAt, stale, edited: flag, ...input } = patch(generated);

      void model;
      void createdAt;
      void stale;
      void flag;

      return input;
    };

    it('when the user swapped a piece, should save it, mark the infographic as edited and keep the model and the date', async () => {
      const input = await edited((view) => ({
        ...view,
        sections: view.sections.map((section, index) =>
          index === 0
            ? {
                ...section,
                items: [
                  { ...section.items[0], piece: 'financas.moedas' },
                  ...section.items.slice(1),
                ],
              }
            : section,
        ),
      }));

      const before = store.get('1');
      const saved = await service.save('1', input);

      expect(saved.sections[0].items[0].piece).toBe('financas.moedas');
      expect(saved).toMatchObject({
        edited: true,
        model: before?.model,
        createdAt: before?.createdAt,
      });
      expect(store.get('1')?.edited).toBe(true);
    });

    it('when saving, should not be stale even if the summary changed (the user checked it against the current text)', async () => {
      const input = await edited((view) => view);

      content = 'Outro texto do resumo';

      await expect(service.save('1', input)).resolves.toMatchObject({ stale: false });
    });

    it('when the infographic is read back after saving, should still be edited', async () => {
      await service.save('1', await edited((view) => view));

      await expect(service.get('1')).resolves.toMatchObject({ edited: true, stale: false });
    });

    it('when the user sends texts above the limits, should cut them like the AI answer', async () => {
      const input = await edited((view) => ({ ...view, title: 'x'.repeat(300) }));

      const saved = await service.save('1', input);

      expect(saved.title.length).toBeLessThanOrEqual(70);
    });

    it('when a piece key is unknown, should fill the space with a piece of the catalog', async () => {
      const input = await edited((view) => ({
        ...view,
        sections: view.sections.map((section, index) =>
          index === 0
            ? {
                ...section,
                items: section.items.map((item) => ({ ...item, piece: 'inventada.coisa' })),
              }
            : section,
        ),
      }));

      const saved = await service.save('1', input);

      expect(saved.sections[0].items.every((item) => item.piece.includes('.'))).toBe(true);
      expect(saved.sections[0].items.some((item) => item.piece === 'inventada.coisa')).toBe(false);
    });

    it('when the infographic has only one section (a chosen layout), should save it', async () => {
      await service.generate('1', { layout: 'steps' });
      const only = store.get('1');
      const input = {
        title: only?.title ?? 'T',
        piece: only?.piece ?? '',
        sections: only?.sections ?? [],
      };

      await expect(service.save('1', input)).resolves.toMatchObject({ edited: true });
    });

    it('when there is no title or no valid section, should throw BadRequestException and save nothing', async () => {
      await service.generate('1');
      const before = store.get('1');

      await expect(
        service.save('1', { title: '', piece: '', sections: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(store.get('1')).toEqual(before);
    });

    it('when the page is not a summary, should throw BadRequestException', async () => {
      type = 'article';

      await expect(
        service.save('1', { title: 'T', piece: '', sections: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('when the page does not exist, should let the NotFoundException through', async () => {
      library.get.mockRejectedValueOnce(new NotFoundException('Documento não encontrado'));

      await expect(
        service.save('x', { title: 'T', piece: '', sections: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('when generating again after an edit, should replace the edit and clear the edited mark', async () => {
      await service.save('1', await edited((view) => view));

      const again = await service.generate('1');

      expect(again.edited).toBeUndefined();
      expect(store.get('1')?.edited).toBeUndefined();
    });
  });

  describe('generate', () => {
    it('when the AI answers, should save and return the story with the model and no stale flag', async () => {
      const result = await service.generate('1');

      expect(result).toMatchObject({
        title: 'Como a internet chega',
        intro: 'Uma rede de redes.',
        piece: 'tecnologia.wifi',
        takeaways: ['Tudo é uma rede de redes.'],
        model: cheapestModel(),
        stale: false,
      });
      expect(result.sections.map((section) => section.layout)).toEqual([
        'steps',
        'timeline',
        'steps',
        'timeline',
      ]);
      expect(store.get('1')?.title).toBe('Como a internet chega');
    });

    it('when generating, should use the infographic prompt with the title and content, on Gemini', async () => {
      await service.generate('1');

      expect(sentMessage()).toContain('Título: Redes');
      expect(sentMessage()).toContain('- **TCP**: transporte');
      expect(sentMessage()).toContain('orquestradora');
      expect(sentMessage()).toContain('HISTÓRIA');
      expect(ai.chat).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'gemini' }));
    });

    it('when a model is chosen, should use it instead of the cheapest', async () => {
      await service.generate('1', { modelId: ' gemini-x ' });

      expect(ai.chat).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'gemini-x' }));
    });

    it('when the user chooses a layout, should tell the AI to make one section and keep only that layout', async () => {
      ai.chat.mockResolvedValue(
        JSON.stringify({
          title: 'T',
          sections: [
            {
              layout: 'timeline',
              title: 'Linha',
              items: [
                { title: 'A', text: 'a', tag: '1990' },
                { title: 'B', text: 'b', tag: '2000' },
                { title: 'C', text: 'c', tag: '2010' },
              ],
            },
          ],
        }),
      );

      const result = await service.generate('1', { layout: 'timeline' });

      expect(sentMessage()).toContain('UMA seção só');
      expect(sentMessage()).toContain('"timeline"');
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].layout).toBe('timeline');
    });

    it('when the page is not a summary, should throw BadRequestException without calling the AI', async () => {
      type = 'article';

      await expect(service.generate('1')).rejects.toThrow(BadRequestException);
      expect(ai.chat).not.toHaveBeenCalled();
    });

    it('when the page does not exist, should let the NotFoundException through', async () => {
      library.get.mockRejectedValue(new NotFoundException());

      await expect(service.generate('x')).rejects.toThrow(NotFoundException);
    });

    it('when the AI fails, should throw BadGatewayException with the provider message', async () => {
      ai.chat.mockRejectedValue(new Error('O limite de uso foi atingido.'));

      await expect(service.generate('1')).rejects.toThrow('O limite de uso foi atingido.');
      await expect(service.generate('1')).rejects.toBeInstanceOf(BadGatewayException);
      expect(store.get('1')).toBeUndefined();
    });

    it('when the AI fails without a message, should use a generic Portuguese message', async () => {
      ai.chat.mockRejectedValue('x');

      await expect(service.generate('1')).rejects.toThrow(
        'Não foi possível gerar o infográfico com a IA. Tente novamente.',
      );
    });

    it('when the AI answer is not a valid story, should throw BadGatewayException and save nothing', async () => {
      ai.chat.mockResolvedValue('não sei fazer');

      await expect(service.generate('1')).rejects.toThrow(
        'A IA não retornou um infográfico válido. Tente novamente.',
      );
      expect(store.get('1')).toBeUndefined();
    });

    it('when the AI answers with a single section in the free mode, should reject it (it is not a story)', async () => {
      ai.chat.mockResolvedValue(
        JSON.stringify({
          title: 'T',
          sections: [
            {
              layout: 'steps',
              title: 'Só uma',
              items: [
                { title: 'A', text: 'a' },
                { title: 'B', text: 'b' },
                { title: 'C', text: 'c' },
              ],
            },
          ],
        }),
      );

      await expect(service.generate('1')).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('when a failure happens after a good infographic, should keep the old one', async () => {
      await service.generate('1');
      ai.chat.mockRejectedValue(new Error('sem internet'));

      await expect(service.generate('1')).rejects.toThrow('sem internet');
      expect(store.get('1')?.title).toBe('Como a internet chega');
    });

    it('when generation is requested twice at once, should call the AI only once', async () => {
      const [first, second] = await Promise.all([service.generate('1'), service.generate('1')]);

      expect(first).toBe(second);
      expect(ai.chat).toHaveBeenCalledTimes(1);
    });

    it('when a generation ends, should allow a new one for the same page', async () => {
      await service.generate('1');
      await service.generate('1');

      expect(ai.chat).toHaveBeenCalledTimes(2);
    });

    it('when the content is huge, should cut it before sending', async () => {
      content = 'x'.repeat(200_000);

      await service.generate('1');

      expect(sentMessage().length).toBeLessThan(200_000);
    });
  });

  describe('get', () => {
    it('when nothing was generated, should return null', async () => {
      await expect(service.get('1')).resolves.toBeNull();
    });

    it('when it was generated and the text is the same, should return it without the stale flag', async () => {
      await service.generate('1');

      await expect(service.get('1')).resolves.toMatchObject({
        title: 'Como a internet chega',
        stale: false,
      });
    });

    it('when the summary text changed after generating, should mark it as stale', async () => {
      await service.generate('1');
      content = '## Outro texto';

      await expect(service.get('1')).resolves.toMatchObject({ stale: true });
    });

    it('when returning it, should not leak the internal content hash', async () => {
      await service.generate('1');

      expect(await service.get('1')).not.toHaveProperty('contentHash');
    });

    it('when what is saved is from the single-layout format (no sections), should answer as if there was none', async () => {
      store.set('1', {
        contentHash: 'h',
        model: 'm',
        createdAt: 'd',
        layout: 'steps',
        title: 'Antigo',
        piece: '',
        items: [],
      } as unknown as StoredInfographic);

      await expect(service.get('1')).resolves.toBeNull();
    });

    it('when the page does not exist, should throw NotFoundException', async () => {
      library.get.mockRejectedValue(new NotFoundException());

      await expect(service.get('x')).rejects.toThrow(NotFoundException);
    });
  });
});
