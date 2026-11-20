import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';

import { uuidv7 } from 'uuidv7';

import { buildCategoryTree, startsWithCategory, type CategoryNode } from '../domain/categories';
import { normalizeTags } from '../domain/document';
import {
  DocumentSourceOptions,
  DocumentStatusOptions,
  DocumentTypeOptions,
  MAX_CATEGORY_DEPTH,
  type DocumentMeta,
} from '../domain/library.types';
import { compareNatural, normalizeKey, sanitizeCategoryPath } from '../domain/naming';
import {
  LibraryIndex,
  type IndexError,
  type IndexedDocument,
  type RebuildResult,
} from '../infrastructure/library-index';
import { LibraryStorage } from '../infrastructure/library-storage';
import { InfographicStore } from '../infrastructure/infographic-store';
import { MindMapStore } from '../infrastructure/mind-map-store';
import {
  LibrarySearch,
  toSummary,
  type DocumentSummary,
  type SearchFilters,
} from './library-search';

export interface DocumentDetail {
  meta: DocumentMeta;
  content: string;
}

export interface PublishInput {
  title?: string;
  category: string[];
  tags?: string[];
}

export interface UpdateInput {
  title?: string;
  category?: string[];
  tags?: string[];
  content?: string;
}

export interface ArticleInput {
  title: string;
  category: string[];
  tags?: string[];
  content: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface IndexStatus {
  total: number;
  errors: IndexError[];
}

@Injectable()
export class LibraryService implements OnModuleInit {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    private readonly storage: LibraryStorage,
    private readonly index: LibraryIndex,
    private readonly search: LibrarySearch,
    /** Mapas mentais guardados: sair da biblioteca de vez leva o mapa da página junto. */
    @Optional() private readonly mindMaps?: MindMapStore,
    /** Infográficos guardados: idem, saem junto com a página. */
    @Optional() private readonly infographics?: InfographicStore,
  ) {}

  /** Na inicialização, reconstrói o índice a partir dos arquivos. */
  async onModuleInit(): Promise<void> {
    try {
      const { indexed, errors } = await this.index.rebuild();

      this.logger.log(`Índice da biblioteca: ${indexed} documento(s), ${errors.length} erro(s).`);
    } catch (error) {
      this.logger.error('Falha ao indexar a biblioteca.', error);
    }
  }

  reindex(): Promise<RebuildResult> {
    return this.index.rebuild();
  }

  indexStatus(): IndexStatus {
    return { total: this.index.size, errors: this.index.errors };
  }

  list(filters: SearchFilters): Promise<DocumentSummary[]> {
    return this.search.search(filters);
  }

  /** Documentos gerados aguardando decisão, do mais recente ao mais antigo. */
  inbox(): DocumentSummary[] {
    return this.index
      .all()
      .filter((doc) => doc.meta.status === DocumentStatusOptions.PENDING)
      .sort((a, b) => b.meta.createdAt.localeCompare(a.meta.createdAt))
      .map((doc) => toSummary(doc));
  }

  async get(id: string): Promise<DocumentDetail> {
    const indexed = this.find(id);
    const { meta, body } = await this.storage.read(indexed.path);

    return { meta, content: body };
  }

  /**
   * Árvore de categorias: as dos documentos publicados (com a contagem) e também as pastas que
   * existem **sem páginas**, com contagem zero. Uma categoria é uma pasta e continua existindo
   * depois que a última página sai dela.
   */
  async categories(): Promise<CategoryNode[]> {
    return buildCategoryTree(
      this.published().map((doc) => doc.meta.category),
      await this.storage.listCategoryDirs(),
    );
  }

  tags(): TagCount[] {
    const counts = new Map<string, TagCount>();

    for (const doc of this.published()) {
      for (const tag of doc.meta.tags) {
        const current = counts.get(tag);

        if (current) {
          current.count += 1;
        } else {
          counts.set(tag, { tag, count: 1 });
        }
      }
    }

    return [...counts.values()].sort((a, b) => compareNatural(a.tag, b.tag));
  }

  /**
   * Adiciona à biblioteca um documento pendente ou arquivado: define título,
   * categoria (1 a 4 níveis) e tags, move o arquivo para a pasta da
   * categoria e, se estava na entrada, apaga de lá.
   */
  async publish(id: string, input: PublishInput): Promise<DocumentDetail> {
    const indexed = this.find(id);

    if (indexed.meta.status === DocumentStatusOptions.PUBLISHED) {
      throw new BadRequestException('O documento já está na biblioteca.');
    }

    const { meta: current, body } = await this.storage.read(indexed.path);

    const meta: DocumentMeta = {
      ...current,
      title: input.title === undefined ? current.title : cleanTitle(input.title),
      category: sanitizeCategoryPath(input.category),
      tags: normalizeTags(input.tags ?? current.tags),
      status: DocumentStatusOptions.PUBLISHED,
      updatedAt: new Date().toISOString(),
    };

    await this.persist(meta, body, indexed.path);

    return { meta, content: body };
  }

  /**
   * Edita um documento que está na biblioteca. Só os campos informados mudam;
   * trocar título ou categoria renomeia/move o arquivo (o antigo só é apagado
   * depois de gravar o novo).
   */
  async update(id: string, input: UpdateInput): Promise<DocumentDetail> {
    const indexed = this.find(id);

    if (indexed.meta.status !== DocumentStatusOptions.PUBLISHED) {
      throw new BadRequestException('Só é possível editar um documento que está na biblioteca.');
    }

    if (
      input.content !== undefined &&
      (typeof input.content !== 'string' || input.content.trim() === '')
    ) {
      throw new BadRequestException('O conteúdo não pode ficar vazio.');
    }

    const { meta: current, body } = await this.storage.read(indexed.path);

    const meta: DocumentMeta = {
      ...current,
      title: input.title === undefined ? current.title : cleanTitle(input.title),
      category:
        input.category === undefined ? current.category : sanitizeCategoryPath(input.category),
      tags: normalizeTags(input.tags ?? current.tags),
      updatedAt: new Date().toISOString(),
    };

    const newBody = input.content ?? body;

    await this.persist(meta, newBody, indexed.path);

    return { meta, content: newBody.trim() };
  }

  /**
   * Cria uma categoria **vazia** (a pasta), em qualquer lugar, de 1 a 4 níveis. Os níveis que ainda
   * não existem no caminho também são criados, então "Redes / Segurança / Firewall" cria os três.
   * Uma categoria é uma pasta e existe mesmo sem páginas; só some quando é excluída. Já existir é erro.
   */
  async createCategory(category: string[]): Promise<{ created: true }> {
    const clean = sanitizeCategoryPath(category);

    if (await this.storage.categoryExists(clean)) {
      throw new BadRequestException('Já existe uma categoria com esse caminho.');
    }

    await this.storage.resolveCategoryDir(clean, true);

    return { created: true };
  }

  /**
   * Exclui uma categoria **sem páginas** (e as subcategorias vazias dela). Se houver página dentro,
   * mesmo uma removida da biblioteca, recusa e não apaga nada: mova as páginas antes.
   */
  async deleteCategory(category: string[]): Promise<{ deleted: true }> {
    const clean = sanitizeCategoryPath(category);

    if (!(await this.storage.categoryExists(clean))) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    const hasPages = this.index
      .all()
      .some(
        (doc) =>
          doc.meta.status !== DocumentStatusOptions.PENDING &&
          startsWithCategory(doc.meta.category, clean),
      );

    if (hasPages || !(await this.storage.removeCategoryDir(clean))) {
      throw new BadRequestException(
        'A categoria tem páginas ou arquivos. Mova as páginas para outra categoria antes de excluir.',
      );
    }

    return { deleted: true };
  }

  /**
   * Renomeia ou move uma categoria **com tudo o que há dentro**: a pasta inteira (páginas publicadas
   * e arquivadas, subcategorias e até as vazias) vai para o caminho novo, de uma vez. Se o caminho
   * novo já existe, o conteúdo se junta ao que está lá. Trocar só a caixa ou os acentos do nome
   * ("tecnologia" → "Tecnologia") renomeia a pasta de verdade. O caminho novo pode ter outra
   * quantidade de níveis, desde que nada passe de 4; não pode ficar dentro da própria categoria.
   * A categoria pode estar vazia. Devolve quantas páginas mudaram de pasta.
   */
  async renameCategory(from: string[], to: string[]): Promise<{ moved: number }> {
    const source = sanitizeCategoryPath(from);
    const target = sanitizeCategoryPath(to);

    if (!(await this.storage.categoryExists(source))) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    // O nível mais fundo dentro da categoria (pastas vazias contam).
    const deepest = (await this.storage.listCategoryDirs())
      .filter((dir) => startsWithCategory(dir, source))
      .reduce((max, dir) => Math.max(max, dir.length), source.length);

    if (target.length + deepest - source.length > MAX_CATEGORY_DEPTH) {
      throw new BadRequestException(
        `A categoria deve ter de 1 a ${MAX_CATEGORY_DEPTH} níveis, contando as subcategorias.`,
      );
    }

    if (target.length > source.length && startsWithCategory(target, source)) {
      throw new BadRequestException('Uma categoria não pode ir para dentro dela mesma.');
    }

    const ids = this.index
      .all()
      .filter(
        (doc) =>
          doc.meta.status !== DocumentStatusOptions.PENDING &&
          startsWithCategory(doc.meta.category, source),
      )
      .map((doc) => doc.meta.id);

    const sameKeys =
      source.length === target.length &&
      source.every((name, level) => normalizeKey(name) === normalizeKey(target[level]));

    if (sameKeys) {
      return { moved: await this.renameFolders(source, target, ids) };
    }

    await this.storage.moveCategoryDir(source, target);
    await this.index.rebuild();
    await this.alignPages(ids);

    return { moved: ids.length };
  }

  /**
   * O caminho novo é o mesmo com outra caixa ou outros acentos: renomeia as pastas que mudaram (de
   * cima para baixo) e refaz o índice. Se nada mudou, não há o que fazer.
   */
  private async renameFolders(source: string[], target: string[], ids: string[]): Promise<number> {
    let renamed = false;

    for (let level = 0; level < source.length; level += 1) {
      if (source[level] !== target[level]) {
        const done = await this.storage.renameCategoryFolder(
          [...target.slice(0, level), source[level]],
          target[level],
        );

        renamed = renamed || done;
      }
    }

    if (!renamed) {
      return 0;
    }

    await this.index.rebuild();
    await this.alignPages(ids);

    return ids.length;
  }

  /**
   * Alinha o frontmatter (`category`) das páginas com a pasta onde elas estão agora. Depois de mover a
   * pasta de uma categoria, a pasta já manda na categoria ao ler, mas o arquivo ainda dizia a antiga:
   * aqui cada um é reescrito (só se estiver diferente, e sem mexer em `updatedAt`, porque o conteúdo
   * não mudou). Roda página por página, depois que a pasta já foi movida.
   */
  private async alignPages(ids: string[]): Promise<void> {
    for (const id of ids) {
      const indexed = this.index.get(id);

      if (indexed) {
        await this.storage.alignCategory(indexed.path);
      }
    }
  }

  /**
   * Remoção lógica: o arquivo continua em `lib/`, mas deixa de aparecer na
   * biblioteca. Pode ser readicionado com `publish`.
   */
  async archive(id: string): Promise<DocumentDetail> {
    const indexed = this.find(id);

    if (indexed.meta.status !== DocumentStatusOptions.PUBLISHED) {
      throw new BadRequestException('Só é possível remover da biblioteca um documento publicado.');
    }

    const { meta: current, body } = await this.storage.read(indexed.path);

    const meta: DocumentMeta = {
      ...current,
      status: DocumentStatusOptions.ARCHIVED,
      updatedAt: new Date().toISOString(),
    };

    await this.persist(meta, body, indexed.path);

    return { meta, content: body };
  }

  /**
   * Exclui de verdade, em qualquer status (pendente, publicado ou arquivado): apaga o arquivo, tira
   * do índice e apaga o mapa mental da página, se houver. Não há como desfazer.
   */
  async discard(id: string): Promise<void> {
    const indexed = this.find(id);

    await this.storage.remove(indexed.path, false);
    this.index.remove(id);
    // O mapa mental (e as edições do usuário) pertence ao texto: apagou o texto, apaga o mapa.
    this.mindMaps?.delete(id);
    // O mesmo vale para o infográfico.
    this.infographics?.delete(id);
  }

  /** Cria um artigo escrito manualmente, já publicado. */
  async createArticle(input: ArticleInput): Promise<DocumentDetail> {
    const title = cleanTitle(input.title);

    if (typeof input.content !== 'string' || input.content.trim() === '') {
      throw new BadRequestException('O conteúdo do artigo é obrigatório.');
    }

    const now = new Date().toISOString();

    const meta: DocumentMeta = {
      id: uuidv7(),
      title,
      type: DocumentTypeOptions.ARTICLE,
      source: DocumentSourceOptions.MANUAL,
      status: DocumentStatusOptions.PUBLISHED,
      category: sanitizeCategoryPath(input.category),
      tags: normalizeTags(input.tags ?? []),
      createdAt: now,
      updatedAt: now,
    };

    await this.persist(meta, input.content);

    return { meta, content: input.content.trim() };
  }

  /**
   * Grava o documento e atualiza o índice. Se o arquivo mudou de lugar ou de
   * nome, apaga o antigo só depois de gravar o novo (nunca perde conteúdo).
   */
  private async persist(meta: DocumentMeta, body: string, previousPath?: string): Promise<void> {
    const newPath = await this.storage.save(meta, body);

    if (previousPath && previousPath !== newPath) {
      await this.storage.remove(previousPath, false);
    }

    this.index.upsert(await this.storage.read(newPath));
  }

  private find(id: string): IndexedDocument {
    const indexed = this.index.get(id);

    if (!indexed) {
      throw new NotFoundException(`Documento "${id}" não encontrado.`);
    }

    return indexed;
  }

  private published(): IndexedDocument[] {
    return this.index.all().filter((doc) => doc.meta.status === DocumentStatusOptions.PUBLISHED);
  }
}

function cleanTitle(title: unknown): string {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new BadRequestException('O título é obrigatório.');
  }

  return title.trim();
}
