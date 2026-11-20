import * as fs from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { createTmpLibrary, type TmpLibrary } from '../../../testing/tmp-library';
import { LibraryIndex } from '../infrastructure/library-index';

import { LibrarySearch } from './library-search';
import { LibraryService } from './library.service';

describe('LibraryService: categorias explícitas (pastas, mesmo vazias)', () => {
  let tmp: TmpLibrary;
  let service: LibraryService;

  const article = (title: string, category: string[]) =>
    service.createArticle({ title, category, content: `Texto de ${title}` });

  const dir = (...parts: string[]) => path.join(tmp.lib, ...parts);
  const names = async () => {
    const walk = (nodes: Awaited<ReturnType<LibraryService['categories']>>): string[] =>
      nodes.flatMap((node) => [node.path.join('/'), ...walk(node.children)]);

    return walk(await service.categories());
  };

  beforeEach(() => {
    tmp = createTmpLibrary();

    const index = new LibraryIndex(tmp.storage);

    service = new LibraryService(tmp.storage, index, new LibrarySearch(index, tmp.storage));
  });

  afterEach(() => tmp.cleanup());

  describe('createCategory', () => {
    it('when creating a category, should make an empty folder that shows in the tree with zero pages', async () => {
      await expect(service.createCategory(['Redes'])).resolves.toEqual({ created: true });

      expect(fs.existsSync(dir('Redes'))).toBe(true);
      expect(await service.categories()).toMatchObject([{ name: 'Redes', count: 0, children: [] }]);
    });

    it('when the path has levels that do not exist, should create all of them (empty levels in the middle)', async () => {
      await service.createCategory(['Redes', 'Segurança', 'Firewall']);

      expect(await names()).toEqual(['Redes', 'Redes/Segurança', 'Redes/Segurança/Firewall']);
    });

    it('when creating inside an existing category, should keep what was there', async () => {
      await article('Docker', ['Tecnologia']);
      await service.createCategory(['Tecnologia', 'Nova']);

      expect(await service.categories()).toMatchObject([
        { name: 'Tecnologia', count: 1, children: [{ name: 'Nova', count: 0 }] },
      ]);
    });

    it('when the category already exists (even with other capitals), should refuse', async () => {
      await service.createCategory(['Redes']);

      await expect(service.createCategory(['redes'])).rejects.toBeInstanceOf(BadRequestException);
    });

    it('when the path is invalid or too deep, should refuse and create nothing', async () => {
      await expect(service.createCategory([])).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createCategory(['con'])).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createCategory(['A', 'B', 'C', 'D', 'E'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(await names()).toEqual([]);
    });

    it('when a page is published in a created category, should count it there', async () => {
      await service.createCategory(['Redes', 'Segurança']);
      await article('Firewall', ['Redes', 'Segurança']);

      expect(await service.categories()).toMatchObject([
        { name: 'Redes', count: 1, children: [{ name: 'Segurança', count: 1 }] },
      ]);
    });
  });

  describe('categories', () => {
    it('when a page is removed from a category, should keep the category (it only goes when deleted)', async () => {
      const page = await article('Docker', ['Tecnologia']);

      await service.discard(page.meta.id);

      expect(await names()).toEqual(['Tecnologia']);
    });

    it('when a page is moved to another category, should keep the old one empty', async () => {
      const page = await article('Docker', ['Tecnologia']);

      await service.update(page.meta.id, { category: ['Outra'] });

      expect(await service.categories()).toMatchObject([
        { name: 'Outra', count: 1 },
        { name: 'Tecnologia', count: 0 },
      ]);
    });

    it('when the library has hidden or invalid folders, should not list them', async () => {
      fs.mkdirSync(dir('.git'), { recursive: true });
      fs.mkdirSync(dir('con'), { recursive: true });
      fs.mkdirSync(dir('Boa'), { recursive: true });

      expect(await names()).toEqual(['Boa']);
    });

    it('when folders go beyond 4 levels, should list only the first 4', async () => {
      fs.mkdirSync(dir('A', 'B', 'C', 'D', 'E'), { recursive: true });

      expect(await names()).toEqual(['A', 'A/B', 'A/B/C', 'A/B/C/D']);
    });
  });

  describe('deleteCategory', () => {
    it('when the category is empty, should delete it and its empty subcategories', async () => {
      await service.createCategory(['Redes', 'Segurança']);

      await expect(service.deleteCategory(['Redes'])).resolves.toEqual({ deleted: true });

      expect(fs.existsSync(dir('Redes'))).toBe(false);
      expect(await names()).toEqual([]);
    });

    it('when only a subcategory is deleted, should keep the parent', async () => {
      await service.createCategory(['Redes', 'Segurança']);

      await service.deleteCategory(['Redes', 'Segurança']);

      expect(await names()).toEqual(['Redes']);
    });

    it('when the category has a page, should refuse and keep everything', async () => {
      await article('Docker', ['Tecnologia', 'Containers']);

      await expect(service.deleteCategory(['Tecnologia'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(await names()).toEqual(['Tecnologia', 'Tecnologia/Containers']);
    });

    it('when a page was removed from the library (archived), should still refuse', async () => {
      const page = await article('Docker', ['Tecnologia']);

      await service.archive(page.meta.id);

      await expect(service.deleteCategory(['Tecnologia'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('when there is some other file inside, should refuse and not delete it', async () => {
      await service.createCategory(['Redes']);
      fs.writeFileSync(dir('Redes', 'anotacao.txt'), 'meu arquivo');

      await expect(service.deleteCategory(['Redes'])).rejects.toBeInstanceOf(BadRequestException);
      expect(fs.existsSync(dir('Redes', 'anotacao.txt'))).toBe(true);
    });

    it('when the category does not exist, should answer not found', async () => {
      await expect(service.deleteCategory(['Nada'])).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('mover e renomear categorias vazias', () => {
    it('when renaming an empty category, should rename its folder', async () => {
      await service.createCategory(['Redes']);

      await expect(service.renameCategory(['Redes'], ['Rede'])).resolves.toEqual({ moved: 0 });

      expect(await names()).toEqual(['Rede']);
    });

    it('when moving a category, should take its empty subcategories along', async () => {
      await article('Docker', ['Tecnologia', 'Containers']);
      await service.createCategory(['Tecnologia', 'Vazia', 'Fundo']);

      await service.renameCategory(['Tecnologia'], ['TI']);

      expect(await names()).toEqual(['TI', 'TI/Containers', 'TI/Vazia', 'TI/Vazia/Fundo']);
    });

    it('when moving a category into another, should nest it with everything inside', async () => {
      await article('Docker', ['Tecnologia', 'Containers']);
      await service.createCategory(['Culinária']);

      await expect(
        service.renameCategory(['Tecnologia'], ['Culinária', 'Tecnologia']),
      ).resolves.toEqual({ moved: 1 });

      expect(await names()).toEqual([
        'Culinária',
        'Culinária/Tecnologia',
        'Culinária/Tecnologia/Containers',
      ]);
    });

    it('when merging, should join the pages and the subfolders of both', async () => {
      await article('Docker', ['A', 'Comum']);
      await article('Compose', ['A', 'SoA']);
      await article('Podman', ['B', 'Comum']);
      await service.createCategory(['B', 'SoB']);

      await expect(service.renameCategory(['A'], ['B'])).resolves.toEqual({ moved: 2 });

      expect(await names()).toEqual(['B', 'B/Comum', 'B/SoA', 'B/SoB']);
      expect(fs.readdirSync(dir('B', 'Comum')).filter((f) => f.endsWith('.md'))).toHaveLength(2);
      expect(fs.existsSync(dir('A'))).toBe(false);
    });

    it('when merging a category into its parent, should flatten it', async () => {
      await article('Docker', ['Tecnologia', 'Containers']);
      await article('Visão', ['Tecnologia']);

      await service.renameCategory(['Tecnologia', 'Containers'], ['Tecnologia']);

      expect(await names()).toEqual(['Tecnologia']);
      expect(fs.readdirSync(dir('Tecnologia')).filter((file) => file.endsWith('.md'))).toHaveLength(
        2,
      );
    });

    it('when moving a category into itself, should refuse', async () => {
      await article('Docker', ['Tecnologia']);

      await expect(
        service.renameCategory(['Tecnologia'], ['Tecnologia', 'Dentro']),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(await names()).toEqual(['Tecnologia']);
    });

    it('when an empty subfolder would pass 4 levels, should refuse (empty levels count)', async () => {
      await service.createCategory(['A', 'B', 'C', 'D']);

      await expect(service.renameCategory(['A'], ['X', 'A'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(await names()).toEqual(['A', 'A/B', 'A/B/C', 'A/B/C/D']);
    });

    it('when a file with the same name is on both sides of a merge, should fail without overwriting', async () => {
      await article('Docker', ['A']);
      await service.createCategory(['B']);

      const [file] = fs.readdirSync(dir('A'));

      fs.copyFileSync(dir('A', file), dir('B', file));

      await expect(service.renameCategory(['A'], ['B'])).rejects.toThrow('Já existe um arquivo');
      expect(fs.existsSync(dir('A', file))).toBe(true);
    });

    it('when the moved pages are read again, should show the new category', async () => {
      const page = await article('Docker', ['Tecnologia', 'Containers']);

      await service.renameCategory(['Tecnologia'], ['TI']);

      expect((await service.get(page.meta.id)).meta.category).toEqual(['TI', 'Containers']);
      expect(await service.list({ category: ['TI'] })).toHaveLength(1);
      expect(await service.list({ category: ['Tecnologia'] })).toHaveLength(0);
    });
  });
});
