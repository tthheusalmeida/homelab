export type LibraryDocumentType = 'summary' | 'transcription' | 'article';
export type LibraryDocumentSource = 'video' | 'manual';
export type LibraryDocumentStatus = 'pending' | 'published' | 'archived';
export type LibrarySort = 'title' | 'recent';

export interface LibraryDocumentMeta {
  id: string;
  title: string;
  type: LibraryDocumentType;
  source: LibraryDocumentSource;
  sourceUrl?: string;
  status: LibraryDocumentStatus;
  category: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LibraryDocumentSummary extends LibraryDocumentMeta {
  fileName: string;
  preview: string;
  matchedIn?: 'metadata' | 'content';
}

export interface LibraryDocumentDetail {
  meta: LibraryDocumentMeta;
  content: string;
}

export interface LibraryCategoryNode {
  name: string;
  path: string[];
  count: number;
  children: LibraryCategoryNode[];
}

export interface LibraryTagCount {
  tag: string;
  count: number;
}

export interface LibraryIndexError {
  file: string;
  message: string;
}

export interface LibraryIndexStatus {
  total: number;
  errors: LibraryIndexError[];
}

/**
 * Payload de `library:documents:list` (os parâmetros de query do `GET library/documents`).
 * `status` vazio vale `published`; `sort` vazio vale `title`. Valor fora da lista → `VALIDATION`.
 */
export interface LibraryListFilters {
  q?: string;
  category?: string[];
  type?: LibraryDocumentType;
  source?: LibraryDocumentSource;
  tags?: string[];
  status?: LibraryDocumentStatus;
  sort?: LibrarySort;
}

export interface LibraryDocumentRequest {
  id: string;
}

export interface LibraryRebuildResult {
  indexed: number;
  errors: LibraryIndexError[];
}

/** Payload de `library:documents:create-article` (corpo do `POST library/documents/article`). */
export interface LibraryCreateArticleRequest {
  title: string;
  category: string[];
  tags?: string[];
  content: string;
}

/** Payload de `library:documents:publish` (adicionar à biblioteca um pendente ou arquivado). */
export interface LibraryPublishRequest {
  id: string;
  title?: string;
  category: string[];
  tags?: string[];
}

/** Payload de `library:documents:update`: só os campos informados mudam. */
export interface LibraryUpdateRequest {
  id: string;
  title?: string;
  category?: string[];
  tags?: string[];
  content?: string;
}

export interface LibrarySuggestRequest {
  id: string;
  /** Modelo do Gemini; sem ele usa o mais barato cadastrado. */
  modelId?: string;
}

export interface LibraryClassificationSuggestion {
  title: string;
  category: string[];
  tags: string[];
  /** Modelo do Gemini que gerou a sugestão. */
  model: string;
}
