import type { CSSProperties } from "react";
import { Link } from "react-router";

import { formatDate } from "#lib/format";

import { useDocuments } from "../../library/hooks/useLibrary";

import { HomeBaseSection } from "./BaseSection";

const MAX_RECENT = 5;

/** As últimas páginas adicionadas à biblioteca, para retomar de onde parou. */
export function RecentPagesSection() {
  const { data } = useDocuments({ status: "published", sort: "recent" });
  const recent = (data ?? []).slice(0, MAX_RECENT);

  return (
    <HomeBaseSection
      title="Recentes"
      subtitle="As últimas páginas da sua biblioteca."
      titleMono="/library --recent"
    >
      {recent.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma página na biblioteca ainda. Crie uma tarefa para gerar resumos ou escreva uma
          página.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {recent.map((document, index) => (
            <li
              key={document.id}
              className="animate-enter"
              style={{ "--i": index } as CSSProperties}
            >
              <Link
                to={`/library/${document.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{document.title}</span>

                  {document.category.length > 0 && (
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {document.category.join(" / ")}
                    </span>
                  )}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(document.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HomeBaseSection>
  );
}
