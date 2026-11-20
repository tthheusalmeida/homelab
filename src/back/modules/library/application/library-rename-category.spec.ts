import * as fs from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { createTmpLibrary, type TmpLibrary } from '../../../testing/tmp-library';
import { LibraryIndex } from '../infrastructure/library-index';

import { LibrarySearch } from './library-search';
import { LibraryService } from './library.service';

describe('LibraryService: renomear categoria', () => {
  let tmp: TmpLibrary;
  let service: LibraryService;

  const article = (title: string, category: string[]) =>
    service.createArticle({ title, category, content: `Texto de ${title}` });

  /** Nomes exatos das pastas (o `existsSync` do Windows ignora maiúsculas). */
  const folders = (...parts: string[]) =>
    fs.existsSync(path.join(tmp.lib, ...parts))
      ? fs
          .readdirSync(path.join(tmp.lib, ...parts), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort()
      : [];

  const files = (...parts: string[]) =>
    fs.existsSync(path.join(tmp.lib, ...parts))
      ? fs.readdirSync(path.join(tmp.lib, ...parts)).filter((name) => name.endsWith('.md'))
      : [];

  beforeEach(() => {
    tmp = createTmpLibrary();

    const index = new LibraryIndex(tmp.storage);

    service = new LibraryService(tmp.storage, index, new LibrarySearch(index, tmp.storage));
  });

  afterEach(() => tmp.cleanup());

  it('when renaming a category, should move its pages to the new folder and drop the old one', async () => {
    const a = await article('Docker', ['Tecnologia', 'Containers']);

    await expect(
      service.renameCategory(['Tecnologia', 'Containers'], ['Tecnologia', 'Infra']),
    ).resolves.toEqual({
      moved: 1,
    });

    expect(folders('Tecnologia')).toEqual(['Infra']);
    expect(files('Tecnologia', 'Infra')).toHaveLength(1);
    expect((await service.get(a.meta.id)).meta.category).toEqual(['Tecnologia', 'Infra']);
  });

  it('when renaming a category, should write the new category in the page too and keep its content and id', async () => {
    const a = await article('Docker', ['Tecnologia', 'Containers']);

    await service.renameCategory(['Tecnologia', 'Containers'], ['Tecnologia', 'Infra']);

    const detail = await service.get(a.meta.id);
    const raw = fs.readFileSync(
      path.join(tmp.lib, 'Tecnologia', 'Infra', files('Tecnologia', 'Infra')[0]),
      'utf8',
    );

    expect(detail.content.trim()).toBe('Texto de Docker');
    expect(detail.meta.id).toBe(a.meta.id);
    expect(raw).toContain('Infra');
    expect(raw).not.toContain('Containers');
  });

  it('when renaming a parent category, should take the subcategories and their pages along', async () => {
    const root = await article('Visão geral', ['Tecnologia']);
    const child = await article('Docker', ['Tecnologia', 'Containers']);
    const deep = await article('Compose', ['Tecnologia', 'Containers', 'Compose']);

    await expect(service.renameCategory(['Tecnologia'], ['TI'])).resolves.toEqual({ moved: 3 });

    expect(folders()).toEqual(['TI']);
    expect((await service.get(root.meta.id)).meta.category).toEqual(['TI']);
    expect((await service.get(child.meta.id)).meta.category).toEqual(['TI', 'Containers']);
    expect((await service.get(deep.meta.id)).meta.category).toEqual([
      'TI',
      'Containers',
      'Compose',
    ]);
  });

  it('when renaming back and forth, should not grow the page content', async () => {
    const page = await article('Docker', ['Tecnologia']);
    const before = (await service.get(page.meta.id)).content;

    await service.renameCategory(['Tecnologia'], ['TI']);
    await service.renameCategory(['TI'], ['Tecnologia']);

    expect((await service.get(page.meta.id)).content).toBe(before);
  });

  it('when the new path already exists, should merge the pages into it', async () => {
    await article('Docker', ['Tecnologia', 'Containers']);
    await article('Kubernetes', ['Tecnologia', 'Infra']);

    await expect(
      service.renameCategory(['Tecnologia', 'Containers'], ['Tecnologia', 'Infra']),
    ).resolves.toEqual({ moved: 1 });

    expect(folders('Tecnologia')).toEqual(['Infra']);
    expect(files('Tecnologia', 'Infra')).toHaveLength(2);
  });

  it('when moving a category under another one, should nest it and keep the levels below', async () => {
    const page = await article('Docker', ['Containers', 'Docker']);

    await service.renameCategory(['Containers'], ['Tecnologia', 'Infra']);

    expect((await service.get(page.meta.id)).meta.category).toEqual([
      'Tecnologia',
      'Infra',
      'Docker',
    ]);
    expect(folders()).toEqual(['Tecnologia']);
  });

  it('when moving a subcategory up to the top, should leave no empty folder behind', async () => {
    await article('Docker', ['Tecnologia', 'Containers']);

    await service.renameCategory(['Tecnologia', 'Containers'], ['Containers']);

    expect(folders()).toEqual(['Containers']);
  });

  it('when only the capitals change, should rename the folder itself', async () => {
    const page = await article('Docker', ['tecnologia', 'containers']);

    await expect(
      service.renameCategory(['tecnologia', 'containers'], ['Tecnologia', 'Containers']),
    ).resolves.toEqual({ moved: 1 });

    expect(folders()).toEqual(['Tecnologia']);
    expect(folders('Tecnologia')).toEqual(['Containers']);
    expect((await service.get(page.meta.id)).meta.category).toEqual(['Tecnologia', 'Containers']);
    expect(service.categories().map((node) => node.name)).toEqual(['Tecnologia']);
  });

  it('when only the accents change, should rename the folder itself', async () => {
    await article('Rock', ['Musica']);

    await service.renameCategory(['Musica'], ['Música']);

    expect(folders()).toEqual(['Música']);
  });

  it('when the new path is exactly the same, should do nothing', async () => {
    await article('Docker', ['Tecnologia']);

    await expect(service.renameCategory(['Tecnologia'], ['Tecnologia'])).resolves.toEqual({
      moved: 0,
    });
    expect(folders()).toEqual(['Tecnologia']);
  });

  it('when the category does not exist, should answer not found', async () => {
    await expect(service.renameCategory(['Nada'], ['Algo'])).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('when a page would go deeper than 4 levels, should refuse and move nothing', async () => {
    await article('Fundo', ['A', 'B', 'C', 'D']);
    await article('Raso', ['A']);

    await expect(service.renameCategory(['A'], ['X', 'Y'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(folders()).toEqual(['A']);
  });

  it('when a name is not valid, should refuse', async () => {
    await article('Docker', ['Tecnologia']);

    await expect(service.renameCategory(['Tecnologia'], ['con'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.renameCategory(['Tecnologia'], [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(folders()).toEqual(['Tecnologia']);
  });

  it('when a page of the category is archived, should move it too and keep it archived', async () => {
    const page = await article('Docker', ['Tecnologia']);

    await service.archive(page.meta.id);
    await service.renameCategory(['Tecnologia'], ['TI']);

    const detail = await service.get(page.meta.id);

    expect(detail.meta.category).toEqual(['TI']);
    expect(detail.meta.status).toBe('archived');
  });

  it('when renaming, should keep the other categories as they were', async () => {
    await article('Docker', ['Tecnologia']);
    const other = await article('Receita', ['Culinária']);

    await service.renameCategory(['Tecnologia'], ['TI']);

    expect(folders()).toEqual(['Culinária', 'TI']);
    expect((await service.get(other.meta.id)).meta.category).toEqual(['Culinária']);
  });

  it('when the move works, should show the new tree with the counts', async () => {
    await article('Docker', ['Tecnologia', 'Containers']);
    await article('Compose', ['Tecnologia', 'Containers']);

    await service.renameCategory(['Tecnologia', 'Containers'], ['Tecnologia', 'Infra']);

    const [tree] = service.categories();

    expect(tree.name).toBe('Tecnologia');
    expect(tree.children).toMatchObject([{ name: 'Infra', count: 2 }]);
  });
});
