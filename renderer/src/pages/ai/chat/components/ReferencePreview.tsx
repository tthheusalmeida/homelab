import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ExternalLink } from "lucide-react";

import type { ChatReference } from "#shared/contracts/chat";
import { DocumentBody } from "#components/DocumentBody";
import { LoadingState } from "#components/LoadingState";
import { Button } from "#ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#ui/dialog";

import { useDocument } from "../../../library/hooks/useLibrary";
import { referenceLabel, referenceTarget } from "../references";
import { ChatStrings } from "../strings";

interface ReferencePreviewProps {
  /** A referência aberta para consulta; `null` = fechado. */
  reference: ChatReference | null;
  onClose: () => void;
}

/**
 * Consulta rápida de uma referência: abre a página da biblioteca **sem sair da conversa**, já rolada
 * até a seção citada. "Abrir a página" leva à página inteira (o que o clique fazia antes); fechar
 * volta à conversa exatamente onde ela estava.
 */
export function ReferencePreview({ reference, onClose }: ReferencePreviewProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDocument(reference?.documentId);
  const anchor = reference?.anchor ?? null;

  // Com o texto desenhado, leva a seção citada ao topo do miolo (ele é o que rola).
  useEffect(() => {
    if (!data || !anchor) {
      return;
    }

    const frame = requestAnimationFrame(() =>
      document.getElementById(anchor)?.scrollIntoView?.({ block: "start" }),
    );

    return () => cancelAnimationFrame(frame);
  }, [data, anchor]);

  function openPage() {
    if (!reference) {
      return;
    }

    onClose();
    void navigate(referenceTarget(reference));
  }

  return (
    <Dialog open={reference !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl" bodyClassName="px-6">
        <DialogHeader>
          <DialogTitle>{reference ? referenceLabel(reference) : ""}</DialogTitle>

          <DialogDescription>{ChatStrings.previewDescription}</DialogDescription>
        </DialogHeader>

        <div className="min-h-64">
          {isLoading && <LoadingState message={ChatStrings.previewLoading} />}

          {isError && (
            <p role="alert" className="text-sm text-muted-foreground">
              {ChatStrings.previewFailed}
            </p>
          )}

          {data && (
            <DocumentBody
              content={data.content}
              isTranscription={data.meta.type === "transcription"}
              sourceUrl={data.meta.sourceUrl}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {ChatStrings.previewClose}
          </Button>

          <Button onClick={openPage}>
            <ExternalLink />
            {ChatStrings.previewOpenPage}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
