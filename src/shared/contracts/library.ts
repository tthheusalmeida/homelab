import type { InfographicLayoutId } from '../infographic-layouts';

export type LibraryDocumentType = 'summary' | 'transcription' | 'article';
export type LibraryDocumentSource = 'video' | 'manual' | 'pdf';
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
  /** O resumo já tem infográfico guardado (só vem quando é verdade). */
  hasInfographic?: boolean;
  /** O resumo já tem mapa mental guardado (só vem quando é verdade). */
  hasMindMap?: boolean;
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

/** Renomeia ou move uma categoria (e tudo o que há dentro dela) para outro caminho, de 1 a 4 níveis. */
export interface LibraryRenameCategoryRequest {
  /** O caminho de hoje (a categoria e, por baixo, as subcategorias vão junto). */
  from: string[];
  /** O caminho novo. Se já existir, as páginas se juntam a ele. */
  to: string[];
}

/** Cria uma categoria vazia (e os níveis que faltarem no caminho). */
export interface LibraryCategoryPathRequest {
  /** O caminho da categoria, de 1 a 4 níveis. */
  path: string[];
}

export interface LibraryRenameCategoryResult {
  /** Quantas páginas mudaram de pasta. */
  moved: number;
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
/** Conteúdo gerado que a página precisa ter para entrar na lista (todos os pedidos valem juntos). */
export type LibraryContentFilter = 'infographic' | 'mind-map';

export const LIBRARY_CONTENT_FILTERS: readonly LibraryContentFilter[] = ['infographic', 'mind-map'];

export interface LibraryListFilters {
  q?: string;
  category?: string[];
  type?: LibraryDocumentType;
  source?: LibraryDocumentSource;
  tags?: string[];
  /** Só páginas que têm o infográfico e/ou o mapa mental gerados. */
  has?: LibraryContentFilter[];
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

/** Formatos de arquivo que o mapa mental e o infográfico podem ser salvos. */
export const LIBRARY_IMAGE_FORMATS = ['png', 'svg', 'pdf'] as const;
export type LibraryImageFormat = (typeof LIBRARY_IMAGE_FORMATS)[number];

/** Imagem (PNG, SVG) ou PDF do mapa mental ou do infográfico, para o usuário salvar num arquivo. */
export interface LibraryMindMapImageRequest {
  /** Nome sugerido no diálogo de salvar (a extensão do formato é garantida pelo main). */
  fileName: string;
  /** O arquivo em base64, sem o prefixo `data:`. */
  dataBase64: string;
  /** Formato do conteúdo; sem ele, PNG. */
  format?: LibraryImageFormat;
}

export interface LibraryMindMapImageResult {
  /** `false` quando o usuário fechou o diálogo sem escolher onde salvar. */
  saved: boolean;
  /** Onde o arquivo foi gravado (só com `saved`). */
  path?: string;
}

/** Quem leva o lado de um comparativo (infográfico). */
export type LibraryInfographicWinner = 'a' | 'b' | 'tie';

/** Um espaço do infográfico: uma peça do banco, um título e o texto. Os campos extras variam por modelo. */
export interface LibraryInfographicItem {
  /** Chave de uma peça do banco (ex.: `jogos.controle`); vazia ou desconhecida vira um hexágono. */
  piece: string;
  title: string;
  text: string;
  /** Data, número ou valor curto (linha do tempo, funil, números, mosaico). */
  tag?: string;
  /** Texto do lado B (comparativo). */
  extra?: string;
  /** Medida de 0 a 100 (ranking). */
  value?: number;
  /** Quem se sai melhor no critério (comparativo). */
  winner?: LibraryInfographicWinner;
}

/** Um dos dois lados do comparativo. */
export interface LibraryInfographicSide {
  piece: string;
  title: string;
}

/**
 * Uma seção do infográfico: um trecho da história, desenhado em um dos modelos. Os campos que cada
 * modelo usa estão em `shared/infographic-layouts.ts`.
 */
export interface LibraryInfographicSection {
  layout: InfographicLayoutId;
  /** Título da seção (o que ela explica). */
  title: string;
  /** Uma linha sob o título da seção. */
  subtitle?: string;
  /** Peça da seção (centro, destaque ou cabeçalho, conforme o modelo); vazia se o modelo não usa. */
  piece: string;
  /** Só no comparativo: exatamente dois lados. */
  sides?: LibraryInfographicSide[];
  items: LibraryInfographicItem[];
  tips?: string[];
  note?: string;
  /** O que o `value` do ranking mede (ex.: "Intensidade"). */
  meterLabel?: string;
}

/**
 * Infográfico de um resumo, gerado pela IA e guardado em disco. Conta uma história: uma **capa**
 * (título, subtítulo, abertura e peça principal), uma sequência de **seções** que explicam o
 * assunto em ordem (cada uma no modelo que melhor a mostra) e um **fechamento** com o que lembrar.
 */
export interface LibraryInfographic {
  /** Assunto em poucas palavras, acima do título (ex.: "Saúde · Sono"). */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Texto de abertura: o que a pessoa precisa saber para acompanhar o resto (uma definição, um gancho). */
  intro?: string;
  /** Peça da capa. */
  piece: string;
  sections: LibraryInfographicSection[];
  /** O que lembrar no fim (fechamento). */
  takeaways?: string[];
  /** Modelo do Gemini que gerou o infográfico. */
  model: string;
  createdAt: string;
  /** O texto do resumo mudou depois que o infográfico foi gerado. */
  stale: boolean;
  /** O usuário editou o infográfico à mão (trocou peças): gerar de novo com a IA apagaria as edições. */
  edited?: boolean;
}

/** O que o usuário envia ao salvar um infográfico editado (o servidor cuida do resto). */
export type LibraryInfographicInput = Omit<
  LibraryInfographic,
  'model' | 'createdAt' | 'stale' | 'edited'
>;

export interface LibraryInfographicSaveRequest {
  id: string;
  infographic: LibraryInfographicInput;
}

export interface LibraryInfographicRequest {
  id: string;
  /** Modelo do Gemini; sem ele usa o mais barato cadastrado. */
  modelId?: string;
  /**
   * Um único modelo para o infográfico todo (uma seção só). Sem ele a IA conta a história inteira,
   * com várias seções, cada uma no modelo que melhor a mostra.
   */
  layout?: InfographicLayoutId;
}
