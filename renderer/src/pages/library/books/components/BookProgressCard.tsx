import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "#ui/card";
import { formatDate } from "#lib/format";

import { BookProgress } from "./BookProgress";

/** Compacto: o quadro de progresso ocupa pouco do painel lateral. */
const CARD_CLASS = "sidebar-card gap-2 py-3";

interface BookProgressCardProps {
  read: number;
  total: number;
  /** Quando o livro foi concluído; null/ausente se ainda não. */
  completedAt?: string | null;
}

/**
 * Quadro do painel fixo, no mesmo padrão e com a altura baixa do "Sumário do
 * livro". Enquanto o livro não termina mostra o "Progresso" (barra e capítulos
 * lidos); depois de concluído vira uma linha só, com "Conclusão" e, na frente,
 * quando foi concluído. Fica no painel para o leitor ver mesmo com o topo fora da tela.
 */
export function BookProgressCard({
  read,
  total,
  completedAt,
}: BookProgressCardProps) {
  if (total <= 0) {
    return null;
  }

  if (completedAt) {
    // Concluído: uma linha só, com o status na frente do título, para o quadro ficar baixo.
    return (
      <Card className="sidebar-card gap-0 py-2.5">
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <CardTitle className="text-sm">Conclusão</CardTitle>

          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Trophy className="size-4 shrink-0" />
            Concluído em {formatDate(completedAt)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className="text-sm">Progresso</CardTitle>
      </CardHeader>

      <CardContent>
        <BookProgress read={read} total={total} />
      </CardContent>
    </Card>
  );
}
