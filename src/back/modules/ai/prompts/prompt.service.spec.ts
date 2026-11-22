import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PROMPT_LIMITS } from '../../../../shared/contracts/prompts';

import { PROMPT_CATALOG } from './prompt-catalog';
import { PromptMessages, PromptService } from './prompt.service';
import { PromptStore } from './prompt.store';

const text = (size = 60) => 'x'.repeat(size);

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(() => {
    service = new PromptService(new PromptStore());
  });

  describe('overview', () => {
    it('when nothing was customized, should list each prompt with its default and no versions', () => {
      const { kinds, limits } = service.overview();
      const mindMap = kinds.find((kind) => kind.kind === 'mindMap');

      expect(mindMap).toEqual(
        expect.objectContaining({
          label: 'Mapa mental',
          defaultText: PROMPT_CATALOG.mindMap.defaultText,
          versions: [],
          activeId: null,
        }),
      );
      expect(limits).toEqual(PROMPT_LIMITS);
    });

    it('when listing, should never expose the fixed contract (limits, output format) in the default text', () => {
      for (const { defaultText } of service.overview().kinds) {
        expect(defaultText).not.toContain('Responda APENAS com um JSON');
        expect(defaultText).not.toContain('REGRAS FIXAS');
      }
    });
  });

  describe('save', () => {
    it('when creating a version, should add it without activating it by default', () => {
      const overview = service.save({ kind: 'mindMap', name: 'Curto', text: text() });
      const [version] = overview.kinds[0].versions;

      expect(version).toEqual({ id: expect.any(String), name: 'Curto', text: text() });
      expect(overview.kinds[0].activeId).toBeNull();
    });

    it('when creating with activate, should leave the new version in use', () => {
      const overview = service.save({
        kind: 'mindMap',
        name: 'Curto',
        text: text(),
        activate: true,
      });

      expect(overview.kinds[0].activeId).toBe(overview.kinds[0].versions[0].id);
    });

    it('when updating a version, should change its name and text and keep its id', () => {
      const { id } = service.save({ kind: 'mindMap', name: 'Curto', text: text() }).kinds[0]
        .versions[0];

      const [version] = service.save({ kind: 'mindMap', id, name: 'Longo', text: text(80) })
        .kinds[0].versions;

      expect(version).toEqual({ id, name: 'Longo', text: text(80) });
    });

    it('when the name is blank, should refuse', () => {
      expect(() => service.save({ kind: 'mindMap', name: '   ', text: text() })).toThrow(
        PromptMessages.nameRequired,
      );
    });

    it('when the name is too long, should refuse', () => {
      expect(() =>
        service.save({
          kind: 'mindMap',
          name: 'n'.repeat(PROMPT_LIMITS.maxNameChars + 1),
          text: text(),
        }),
      ).toThrow(PromptMessages.nameTooLong(PROMPT_LIMITS.maxNameChars));
    });

    it('when the text is shorter than the minimum, should refuse', () => {
      expect(() =>
        service.save({ kind: 'mindMap', name: 'A', text: text(PROMPT_LIMITS.minChars - 1) }),
      ).toThrow(PromptMessages.textTooShort(PROMPT_LIMITS.minChars));
    });

    it('when the text is longer than the maximum, should refuse', () => {
      expect(() =>
        service.save({ kind: 'mindMap', name: 'A', text: text(PROMPT_LIMITS.maxChars + 1) }),
      ).toThrow(PromptMessages.textTooLong(PROMPT_LIMITS.maxChars));
    });

    it('when the text is at the limits, should accept it', () => {
      expect(() =>
        service.save({ kind: 'mindMap', name: 'Min', text: text(PROMPT_LIMITS.minChars) }),
      ).not.toThrow();
      expect(() =>
        service.save({ kind: 'mindMap', name: 'Max', text: text(PROMPT_LIMITS.maxChars) }),
      ).not.toThrow();
    });

    it('when the text is not a string, should refuse as too short', () => {
      expect(() =>
        service.save({ kind: 'mindMap', name: 'A', text: 123 as unknown as string }),
      ).toThrow(PromptMessages.textTooShort(PROMPT_LIMITS.minChars));
    });

    it('when the text has surrounding blanks and Windows line breaks, should clean them', () => {
      const body = `  linha um ${'a'.repeat(40)}\r\nlinha dois  `;
      const [version] = service.save({ kind: 'mindMap', name: ' Meu   prompt ', text: body })
        .kinds[0].versions;

      expect(version.name).toBe('Meu prompt');
      expect(version.text).toBe(`linha um ${'a'.repeat(40)}\nlinha dois`);
    });

    it('when another version already has the name (ignoring case and accents), should refuse', () => {
      service.save({ kind: 'mindMap', name: 'Revisão', text: text() });

      expect(() => service.save({ kind: 'mindMap', name: 'REVISAO', text: text() })).toThrow(
        PromptMessages.nameTaken,
      );
    });

    it('when renaming a version to its own name, should not count it as taken', () => {
      const { id } = service.save({ kind: 'mindMap', name: 'Curto', text: text() }).kinds[0]
        .versions[0];

      expect(() =>
        service.save({ kind: 'mindMap', id, name: 'curto', text: text(70) }),
      ).not.toThrow();
    });

    it('when the limit of versions is reached, should refuse a new one', () => {
      for (let index = 0; index < PROMPT_LIMITS.maxVersionsPerKind; index += 1) {
        service.save({ kind: 'mindMap', name: `V${index}`, text: text() });
      }

      expect(() => service.save({ kind: 'mindMap', name: 'Mais uma', text: text() })).toThrow(
        PromptMessages.tooManyVersions(PROMPT_LIMITS.maxVersionsPerKind),
      );
    });

    it('when updating a version that does not exist, should answer not found', () => {
      expect(() => service.save({ kind: 'mindMap', id: 'sumiu', name: 'A', text: text() })).toThrow(
        NotFoundException,
      );
    });

    it('when the kind is unknown, should refuse', () => {
      expect(() => service.save({ kind: 'nada' as never, name: 'A', text: text() })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('activate and delete', () => {
    it('when activating a version and going back to the default, should follow the choice', () => {
      const { id } = service.save({ kind: 'mindMap', name: 'Curto', text: text() }).kinds[0]
        .versions[0];

      expect(service.activate({ kind: 'mindMap', id }).kinds[0].activeId).toBe(id);
      expect(service.activate({ kind: 'mindMap', id: null }).kinds[0].activeId).toBeNull();
    });

    it('when activating a version that does not exist, should answer not found', () => {
      expect(() => service.activate({ kind: 'mindMap', id: 'sumiu' })).toThrow(NotFoundException);
    });

    it('when deleting the version in use, should go back to the default', () => {
      const { id } = service.save({
        kind: 'mindMap',
        name: 'Curto',
        text: text(),
        activate: true,
      }).kinds[0].versions[0];

      const [kind] = service.delete({ kind: 'mindMap', id }).kinds;

      expect(kind.versions).toEqual([]);
      expect(kind.activeId).toBeNull();
    });

    it('when deleting a version that is not in use, should keep the active one', () => {
      const first = service.save({ kind: 'mindMap', name: 'A', text: text(), activate: true })
        .kinds[0].versions[0];
      const second = service.save({ kind: 'mindMap', name: 'B', text: text() }).kinds[0]
        .versions[1];

      const [kind] = service.delete({ kind: 'mindMap', id: second.id }).kinds;

      expect(kind.versions).toEqual([first]);
      expect(kind.activeId).toBe(first.id);
    });

    it('when deleting a version that does not exist, should answer not found', () => {
      expect(() => service.delete({ kind: 'mindMap', id: 'sumiu' })).toThrow(NotFoundException);
    });
  });

  describe('instructionsFor', () => {
    it('when no version is in use, should return the default text', () => {
      expect(service.instructionsFor('mindMap')).toBe(PROMPT_CATALOG.mindMap.defaultText);
    });

    it('when a version is in use, should return its text right away (no restart)', () => {
      service.save({ kind: 'mindMap', name: 'Meu', text: text(), activate: true });

      expect(service.instructionsFor('mindMap')).toBe(text());
    });

    it('when the version in use is deleted, should return the default again', () => {
      const { id } = service.save({ kind: 'mindMap', name: 'Meu', text: text(), activate: true })
        .kinds[0].versions[0];

      service.delete({ kind: 'mindMap', id });

      expect(service.instructionsFor('mindMap')).toBe(PROMPT_CATALOG.mindMap.defaultText);
    });
  });
});
