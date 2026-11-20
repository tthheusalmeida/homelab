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

  /** Árvore de categorias só dos documentos publicados. */
  categories(): CategoryNode[] {
    return buildCategoryTree(this.published().map((doc) => doc.meta.category));
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
   * Renomeia ou move uma categoria **com tudo o que há dentro**: cada página (publicada ou arquivada)
   * da categoria e das subcategorias vai para a pasta do caminho novo, e as pastas que ficarem
   * vazias somem. Se o caminho novo já existe, as páginas se juntam a ele. Trocar só a caixa ou os
   * acentos do nome ("tecnologia" → "Tecnologia") renomeia a pasta de verdade. O caminho novo pode ter
   * outra quantidade de níveis, desde que nenhuma página passe do limite. Devolve quantas páginas
   * mudaram de lugar.
   */
  async renameCategory(from: string[], to: string[]): Promise<{ moved: number }> {
    const source = sanitizeCategoryPath(from);
    const target = sanitizeCategoryPath(to);
    const affected = this.index
      .all()
      .filter(
        (doc) =>
          doc.meta.status !== DocumentStatusOptions.PENDING &&
          startsWithCategory(doc.meta.category, source),
      );

    if (affected.length === 0) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    const tooDeep = affected.some(
      (doc) => target.length + doc.meta.category.length - source.length > MAX_CATEGORY_DEPTH,
    );

    if (tooDeep) {
      throw new BadRequestException(
        `A categoria deve ter de 1 a ${MAX_CATEGORY_DEPTH} níveis, contando as subcategorias.`,
      );
    }

    const sameKeys =
      source.length === target.length &&
      source.every((name, level) => normalizeKey(name) === normalizeKey(target[level]));

    if (sameKeys) {
      return { moved: await this.renameFolders(source, target, affected.length) };
    }

    for (const doc of affected) {
      const { meta: current, body } = await this.storage.read(doc.path);
      const meta: DocumentMeta = {
        ...current,
        category: [...target, ...current.category.slice(source.length)],
        updatedAt: new Date().toISOString(),
      };

      await this.persist(meta, body, doc.path);
    }

    return { moved: affected.length };
  }

  /**
   * O caminho novo é o mesmo com outra caixa ou outros acentos: renomeia as pastas que mudaram (de
   * cima para baixo) e refaz o índice. Se nada mudou, não há o que fazer.
   */
  private async renameFolders(source: string[], target: string[], count: number): Promise<number> {
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

    return count;
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

    await this.storage.remove(indexed.path);
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
      await this.storage.remove(previousPath);
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
