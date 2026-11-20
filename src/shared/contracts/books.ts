import type { AccentId } from './appearance';

export type BookKind = 'pos' | 'course' | 'study' | 'book';
/** As 15 cores do tema (`AccentId`) mais `slate`, que só existe em livros criados antes da troca. */
export type BookCoverColor = AccentId | 'slate';

/** Último ponto lido: o capítulo e o elemento (título) que estava na tela. */
export interface BookPosition {
  documentId: string;
  elementId: string;
}

export interface BookSummary {
  id: string;
  title: string;
  kind: BookKind;
  description: string;
  subtitle: string;
  coverColor: BookCoverColor;
  coverImageUrl: string;
  chapterCount: number;
  /** Capítulos que ainda existem na biblioteca (base do progresso). */
  availableCount: number;
  /** Quantos desses já foram lidos. */
  readCount: number;
  moduleCount: number;
  completedAt: string | null;
  lastPosition: BookPosition | null;
  updatedAt: string;
  /** Só quando a lista é pedida para um documento. */
  containsDocument?: boolean;
}

export interface BookChapter {
  documentId: string;
  title: string;
  category: string[];
  /** `false` quando o documento saiu da biblioteca ou foi apagado. */
  available: boolean;
}

export interface BookModule {
  id: string;
  /** Vazio = capítulos soltos, sem cabeçalho de módulo. */
  title: string;
  chapters: BookChapter[];
}

export interface BookDetail {
  id: string;
  title: string;
  kind: BookKind;
  description: string;
  subtitle: string;
  coverColor: BookCoverColor;
  coverImageUrl: string;
  /** Ids dos capítulos (documentos) marcados como lidos. */
  readDocumentIds: string[];
  completedAt: string | null;
  lastPosition: BookPosition | null;
  createdAt: string;
  updatedAt: string;
  modules: BookModule[];
}

export interface BookReadingChapter extends BookChapter {
  content: string;
}

export interface BookReading {
  book: Omit<BookDetail, 'modules'>;
  modules: { id: string; title: string; chapters: BookReadingChapter[] }[];
}

export interface BookSearchHit {
  documentId: string;
  chapterTitle: string;
  moduleId: string;
  moduleTitle: string;
  /** Linha (base 1) do trecho dentro do documento. */
  line: number;
  snippet: string;
}

/** Payload de `library:books:list` (a query `documentId` do `GET library/books`). */
export interface BookListRequest {
  /** Marca em cada livro se ele contém esse documento (`containsDocument`). */
  documentId?: string;
}

export interface BookRequest {
  id: string;
}

/** Payload de `library:books:search`. Termo vazio ou só de espaços → lista vazia. */
export interface BookSearchRequest {
  id: string;
  q: string;
}

/** Campos da capa e do cabeçalho de um livro (criar e editar). */
export interface BookFields {
  kind?: BookKind;
  description?: string;
  subtitle?: string;
  coverColor?: BookCoverColor;
  /** URL http(s) da imagem; vazio remove a imagem. */
  coverImageUrl?: string;
}

/** Payload de `library:books:create` (corpo do `POST library/books`). */
export interface BookCreateRequest extends BookFields {
  title: string;
}

/** Payload de `library:books:update`: só os campos informados mudam. */
export interface BookUpdateRequest extends BookFields {
  id: string;
  title?: string;
}

/** Módulo como enviado ao salvar a estrutura (só ids de documentos). Sem `id`, ganha um novo. */
export interface BookModuleDraft {
  id?: string;
  title?: string;
  documentIds: string[];
}

export interface BookSetStructureRequest {
  id: string;
  modules: BookModuleDraft[];
}

export interface BookAddChapterRequest {
  id: string;
  documentId: string;
  /** Sem módulo, entra no último. */
  moduleId?: string;
}

export interface BookMarkChapterReadRequest {
  id: string;
  documentId: string;
  /** `true` marca o capítulo como lido; `false` desmarca. */
  read: boolean;
}

export interface BookSetPositionRequest extends BookPosition {
  id: string;
}
