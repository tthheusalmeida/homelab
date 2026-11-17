/** Divisor sutil de módulo: título pequeno entre dois filetes (livro e preview da leitura). */
export function ModuleDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="reading-sep-line h-px flex-1" />

      <h2 className="reading-sep-text text-xs font-semibold uppercase tracking-[0.25em]">
        {title}
      </h2>

      <span aria-hidden className="reading-sep-line h-px flex-1" />
    </div>
  );
}
