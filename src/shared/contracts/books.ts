export type BookKind = 'pos' | 'course' | 'study' | 'book';
export type BookCoverColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';

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
