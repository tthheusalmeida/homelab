import { MarkdownFileIcon } from "#components/MarkdownFileIcon";

/**
 * Aviso discreto sob a resposta quando a pergunta parecia ser sobre as páginas e nenhuma serviu de
 * referência. É do app (sempre as mesmas palavras), não do modelo: modelos pequenos variam o
 * texto, copiam instruções e às vezes dizem "não encontrei" sobre o que está nas páginas.
 */
export function ChatNotInPages() {
  return (
    <p
      role="note"
      className="flex w-full items-center gap-2 text-xs text-muted-foreground"
    >
      <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-border" />

      <MarkdownFileIcon className="size-3.5 shrink-0 opacity-60" />

      <span className="shrink-0">Não achei isso nas suas páginas</span>
    </p>
  );
}
