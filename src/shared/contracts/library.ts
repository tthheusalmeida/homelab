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

/** Um nó do mapa mental de um resumo: só o rótulo curto e o que vem dentro dele. */
export interface LibraryMindMapNode {
  /** O termo, curto: é a pista que faz lembrar. */
  label: string;
  /** Uma frase curta do resumo sobre o termo (definição, função, regra); nem todo nó tem. */
  note?: string;
  children: LibraryMindMapNode[];
}

export interface LibraryMindMapRequest {
  id: string;
  /** Modelo do Gemini; sem ele usa o mais barato cadastrado. */
  modelId?: string;
}

/** Mapa mental de revisão de um resumo, gerado pela IA e guardado em disco. */
export interface LibraryMindMap {
  /** Uma linha sob o título do mapa dizendo do que o resumo trata (ex.: "Estuda a hereditariedade"). */
  subtitle?: string;
  /** Ramos de primeiro nível (a raiz é o título da página). */
  nodes: LibraryMindMapNode[];
  /** Modelo do Gemini que gerou o mapa. */
  model: string;
  createdAt: string;
  /** O texto do resumo mudou depois que o mapa foi gerado (ou editado). */
  stale: boolean;
  /** O usuário editou o mapa à mão: gerar de novo com a IA apagaria as edições. */
  edited: boolean;
}

/** O mapa como o usuário o deixou na edição, para guardar. */
export interface LibraryMindMapSaveRequest {
  id: string;
  subtitle?: string;
  nodes: LibraryMindMapNode[];
}

/** Imagem PNG do mapa mental, para o usuário salvar num arquivo. */
export interface LibraryMindMapImageRequest {
  /** Nome sugerido no diálogo de salvar (a extensão `.png` é garantida pelo main). */
  fileName: string;
  /** O PNG em base64, sem o prefixo `data:`. */
  dataBase64: string;
}

export interface LibraryMindMapImageResult {
  /** `false` quando o usuário fechou o diálogo sem escolher onde salvar. */
  saved: boolean;
  /** Onde o arquivo foi gravado (só com `saved`). */
  path?: string;
}
