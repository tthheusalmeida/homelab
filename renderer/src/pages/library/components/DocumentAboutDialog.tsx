import type { ReactNode } from "react";

import { ArchiveX, BookPlus, ExternalLink, Pencil, Trash2 } from "lucide-react";

import { Badge } from "#ui/badge";
import { Button } from "#ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#ui/dialog";
import { formatDateTime } from "#lib/format";

import { ActionMenu } from "#components/ActionMenu";

import {
  documentSourceLabels,
  type DocumentMeta,
} from "../types/library.types";

import { DocumentStatusBadge } from "./DocumentBadges";

interface DocumentAboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: DocumentMeta;
  /** Sem esta função o botão Editar não aparece (documento não publicado). */
  onEdit?: () => void;
  /** Sem esta função o botão Remover não aparece (documento não publicado). */
  onRemove?: () => void;
  /** Sem esta função o botão "Adicionar a um livro" não aparece. */
  onAddToBook?: () => void;
  /** Exclui a página de vez (qualquer situação). Sem esta função o botão Excluir não aparece. */
  onDelete?: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>

      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/**
 * Janela "Sobre a página": informações separadas por rótulo e, em documento
 * publicado, as ações Editar e Remover (cada uma abre a sua própria janela) e, em qualquer
 * situação, Excluir (apaga de vez, com confirmação). As ações são só ícones, com tooltip.
 */
export function DocumentAboutDialog({
  open,
  onOpenChange,
  meta,
  onEdit,
  onRemove,
  onAddToBook,
  onDelete,
}: DocumentAboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sobre a página</DialogTitle>
        </DialogHeader>

        <dl className="space-y-4">
          <Row label="Situação">
            <DocumentStatusBadge status={meta.status} />
          </Row>

          <Row label="Origem">{documentSourceLabels[meta.source]}</Row>

          <Row label="Tags">
            {meta.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {meta.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Sem tags</span>
            )}
          </Row>

          <Row label="Criado em">{formatDateTime(meta.createdAt)}</Row>

          <Row label="Atualizado em">{formatDateTime(meta.updatedAt)}</Row>

          {meta.sourceUrl && (
            <Row label="Fonte">
              <a
                href={meta.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" /> Fonte original
              </a>
            </Row>
          )}
        </dl>

        {(onEdit || onRemove || onAddToBook || onDelete) && (
          <DialogFooter className="sm:flex-wrap sm:items-center">
            {/* Terciárias (raras ou perigosas): dentro do menu, longe das principais. */}
            {(onRemove || onDelete) && (
              <div className="sm:mr-auto">
                <ActionMenu
                  label="Mais ações"
                  iconOnly
                  align="start"
                  groups={[
                    onRemove
                      ? [
                          {
                            id: "remove",
                            label: "Remover da biblioteca",
                            icon: ArchiveX,
                            onSelect: onRemove,
                          },
                        ]
                      : [],
                    onDelete
                      ? [
                          {
                            id: "delete",
                            label: "Excluir",
                            icon: Trash2,
                            destructive: true,
                            onSelect: onDelete,
                          },
                        ]
                      : [],
                  ]}
                />
              </div>
            )}

            {/* Secundária: contorno. */}
            {onAddToBook && (
              <Button variant="outline" onClick={onAddToBook}>
                <BookPlus /> Adicionar a um livro
              </Button>
            )}

            {/* Primária: em destaque. */}
            {onEdit && (
              <Button onClick={onEdit}>
                <Pencil /> Editar
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
