import { LayoutPanelTop, Network } from 'lucide-react';

import { Badge } from '#ui/badge';
import { cn } from '#lib/utils';

import { documentTypeLabels, type DocumentStatus, type DocumentType } from '../types/library.types';

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  return <Badge variant="secondary">{documentTypeLabels[type]}</Badge>;
}

/** Os conteúdos gerados que uma página pode ter, cada um com a sua marca (o mapa mental vem primeiro). */
const GENERATED = [
  { key: 'hasMindMap', label: 'Mapa mental', icon: Network },
  { key: 'hasInfographic', label: 'Infográfico', icon: LayoutPanelTop },
] as const;

interface GeneratedMarksProps {
  document: { hasInfographic?: boolean; hasMindMap?: boolean };
  /**
   * `text`: um selo com ícone e nome (lista e cartão); `icon`: só o ícone, pequeno, para a
   * miniatura (o nome fica no tooltip). Cada conteúdo tem a sua marca; sem conteúdo, nada aparece.
   */
  variant?: 'text' | 'icon';
  className?: string;
}

/**
 * Marcas de "esta página tem infográfico" e "tem mapa mental", uma para cada, para ver de longe na
 * lista de Páginas o que já foi gerado.
 */
export function GeneratedMarks({ document, variant = 'text', className }: GeneratedMarksProps) {
  const marks = GENERATED.filter(({ key }) => document[key]);

  if (marks.length === 0) {
    return null;
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {marks.map(({ key, label, icon: Icon }) =>
        variant === 'icon' ? (
          <span
            key={key}
            role="img"
            data-mark={key}
            title={`Tem ${label.toLowerCase()}`}
            aria-label={`Tem ${label.toLowerCase()}`}
            // Fica sobre o fundo do app (abaixo da folha): a cor de destaque sólida, com o ícone na cor própria
            // dela, contrasta nos dois temas e acompanha a cor escolhida.
            className="relative z-10 grid size-5 place-items-center rounded bg-primary text-primary-foreground shadow-sm"
          >
            <Icon className="size-3" />
          </span>
        ) : (
          <Badge
            key={key}
            variant="outline"
            data-mark={key}
            title={`Tem ${label.toLowerCase()}`}
            className="gap-1 text-brand-text"
          >
            <Icon className="size-3" />

            {label}
          </Badge>
        ),
      )}
    </span>
  );
}

const statusLabels: Record<DocumentStatus, string> = {
  pending: 'Pendente',
  published: 'Na biblioteca',
  archived: 'Removido',
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant={status === 'published' ? 'default' : 'outline'}>{statusLabels[status]}</Badge>
  );
}
