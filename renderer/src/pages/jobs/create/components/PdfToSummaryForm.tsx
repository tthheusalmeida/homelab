import { useState } from 'react';

import type { PdfInspection } from '#shared/contracts/pdf';
import type { AiProviderId } from '#shared/contracts/ai';
import { useErrorAlert } from '#hooks/use-error-alert';
import { Callout } from '#components/Callout';
import { OptionSelect } from '#components/OptionSelect';
import { DialogForm } from '#ui/dialog';

import { ChatSettings } from '../../../ai/chat/components/ChatSettings';
import { useAiSelection } from '../../../ai/chat/hooks/useAiSelection';
import { useCreatePdfToSummary } from '../hooks/useCreatePdfToSummary';
import { useInspectPdf } from '../hooks/useInspectPdf';
import { buildDocumentHints } from '../hints';
import { PdfStrings } from '../pdf-text';
import {
  DEFAULT_SUMMARY_DETAIL,
  isSummaryDetail,
  summaryDetailOptions,
  type SummaryDetail,
} from '../summary-detail';
import { JobDocumentFields } from './JobDocumentFields';
import { PdfFileField } from './PdfFileField';
import { VideoJobFooter } from './VideoJobFooter';

interface PdfToSummaryFormProps {
  /** Chamado quando o job foi criado (a janela usa para fechar e limpar o formulário). */
  onCreated?: () => void;
}

/** Nome do arquivo sem a extensão, usado como título padrão do documento. */
const stem = (fileName: string) => fileName.replace(/\.pdf$/i, '');

export function PdfToSummaryForm({ onCreated }: PdfToSummaryFormProps) {
  const ai = useAiSelection();
  const read = useInspectPdf();
  const create = useCreatePdfToSummary();

  const [inspection, setInspection] = useState<PdfInspection | null>(null);
  const [detail, setDetail] = useState<SummaryDetail>(DEFAULT_SUMMARY_DETAIL);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const locked = create.isPending || sent;
  const ready = !!inspection && !!ai.providerId && !!ai.modelId && !!ai.thinkingId && !locked;

  useErrorAlert(read.isError && (read.error.message || 'Não foi possível ler o PDF.'));

  const choose = () =>
    read.mutate(undefined, {
      // Cancelar o diálogo ou a leitura responde `null`: o arquivo anterior continua valendo.
      onSuccess: (result) => {
        if (result) {
          setInspection(result);
        }
      },
    });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ready || !inspection || !ai.providerId || !ai.modelId || !ai.thinkingId) {
      return;
    }

    create.mutate(
      {
        token: inspection.token,
        providerId: ai.providerId as AiProviderId,
        modelId: ai.modelId,
        thinking: ai.thinkingId,
        detail,
        ...buildDocumentHints({ title, category, tags }),
      },
      {
        onSuccess: () => {
          setSent(true);
          onCreated?.();
        },
      },
    );
  };

  return (
    <DialogForm onSubmit={handleSubmit}>
      <PdfFileField
        inspection={inspection}
        progress={read.progress}
        isReading={read.isPending}
        disabled={locked}
        onChoose={choose}
        onCancelRead={() => void read.cancel()}
      />

      {inspection && (
        <>
          <ChatSettings {...ai} disabled={locked} />

          <div className="space-y-2">
            <OptionSelect
              value={detail}
              options={summaryDetailOptions}
              placeholder="Nível de detalhe"
              label="Nível de detalhe"
              triggerWidth="w-48"
              contentWidth="w-52"
              disabled={locked}
              onValueChange={(value) =>
                setDetail(isSummaryDetail(value) ? value : DEFAULT_SUMMARY_DETAIL)
              }
            />

            <p className="text-sm text-muted-foreground">
              {summaryDetailOptions.find((option) => option.id === detail)?.description}
            </p>
          </div>

          <JobDocumentFields
            idPrefix="pdf"
            defaultTitle={stem(inspection.fileName) || PdfStrings.defaultTitle}
            title={title}
            onTitleChange={setTitle}
            category={category}
            onCategoryChange={setCategory}
            tags={tags}
            onTagsChange={setTags}
            disabled={locked}
          />

          <Callout tone={ai.providerId === 'gemini' ? 'warning' : 'info'} role="note">
            {PdfStrings.sendsTo(ai.providerId)}
          </Callout>

          <p className="text-sm text-muted-foreground">{PdfStrings.resumeHint}</p>
        </>
      )}

      <VideoJobFooter
        submitLabel={PdfStrings.submit}
        canSubmit={ready}
        isPending={create.isPending}
        isError={create.isError}
        errorMessage={create.isError ? create.error.message : undefined}
      />
    </DialogForm>
  );
}
