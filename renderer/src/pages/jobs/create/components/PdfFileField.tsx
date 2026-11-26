import { FileText } from 'lucide-react';

import type { PdfInspection } from '#shared/contracts/pdf';
import { formatBytes, formatNumber } from '#lib/format';

import { Button } from '#ui/button';
import { Callout } from '#components/Callout';
import { HexFrame } from '#components/Hex';
import { ProgressBar } from '#components/ProgressBar';
import { Tip } from '#components/Tip';

import type { PdfReadProgress } from '../hooks/useInspectPdf';
import { PdfStrings, readProgressText } from '../pdf-text';

interface PdfFileFieldProps {
  inspection: PdfInspection | null;
  /** Leitura em andamento (`null` fora dela). */
  progress: PdfReadProgress | null;
  isReading: boolean;
  disabled?: boolean;
  onChoose: () => void;
  onCancelRead: () => void;
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>

      <Tip content={hint}>
        <dd className="font-medium">{value}</dd>
      </Tip>
    </div>
  );
}

/**
 * Escolha do PDF: o botão abre o seletor (só `.pdf`), mostra o progresso da leitura (com cancelar)
 * e, pronto o texto, o resumo do que foi lido, o que vai custar e os avisos antes de criar a tarefa.
 */
export function PdfFileField({
  inspection,
  progress,
  isReading,
  disabled = false,
  onChoose,
  onCancelRead,
}: PdfFileFieldProps) {
  const label = PdfStrings.fileLabel;

  return (
    <section aria-label={label} className="space-y-3">
      {isReading ? (
        <div className="space-y-2 rounded-md border border-dashed p-4">
          <p className="text-sm font-medium">{readProgressText(progress)}</p>

          <ProgressBar
            value={progress?.done ?? 0}
            total={progress?.total ?? 0}
            label={PdfStrings.reading}
          />

          {progress?.stage === 'recognize' && (
            <p className="text-xs text-muted-foreground">{PdfStrings.recognizeHint}</p>
          )}

          <Button type="button" size="sm" variant="outline" onClick={onCancelRead}>
            {PdfStrings.cancelRead}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={disabled} onClick={onChoose}>
            <FileText />
            {inspection ? PdfStrings.chooseAnother : PdfStrings.choose}
          </Button>

          {!inspection && <p className="text-sm text-muted-foreground">{PdfStrings.onlyPdf}</p>}
        </div>
      )}

      {inspection && !isReading && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-md border p-3">
            <HexFrame className="size-10 shrink-0">
              <FileText className="size-4" />
            </HexFrame>

            <div className="min-w-0 flex-1 space-y-2">
              <Tip content={inspection.fileName}>
                <p className="truncate text-sm font-semibold">{inspection.fileName}</p>
              </Tip>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <Fact label={PdfStrings.facts.pages} value={formatNumber(inspection.pageCount)} />
                <Fact label={PdfStrings.facts.size} value={formatBytes(inspection.sizeBytes)} />
                <Fact
                  label={PdfStrings.facts.tokens}
                  value={PdfStrings.tokens(inspection.estimatedTokens)}
                />
                <Fact label={PdfStrings.facts.parts} value={PdfStrings.parts(inspection.parts)} />
                <Fact
                  label={PdfStrings.facts.calls}
                  value={formatNumber(inspection.estimatedCalls)}
                  hint={PdfStrings.callsHint}
                />
                {inspection.ocrPages > 0 && (
                  <Fact
                    label={PdfStrings.facts.ocrPages}
                    value={PdfStrings.ocrPages(inspection.ocrPages)}
                    hint={PdfStrings.ocrPagesHint}
                  />
                )}
                {inspection.languages.length > 0 && (
                  <Fact
                    label={PdfStrings.facts.languages}
                    value={PdfStrings.languages(inspection.languages)}
                  />
                )}
              </dl>
            </div>
          </div>

          {inspection.warnings.map((warning) => (
            <Callout
              key={warning.code}
              tone={warning.level === 'warning' ? 'warning' : 'info'}
              role="note"
            >
              {warning.message}
            </Callout>
          ))}
        </div>
      )}
    </section>
  );
}
