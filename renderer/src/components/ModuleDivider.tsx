/** Divisor sutil de módulo: título pequeno entre dois filetes (livro e preview da leitura). */
export function ModuleDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="h-px flex-1 bg-border" />

      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {title}
      </h2>

      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}
