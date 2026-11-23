import type { AiProviderId } from '#shared/contracts/ai';
import { Button } from '#ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#ui/dialog';

import { ChatSettings } from '../../../ai/chat/components/ChatSettings';
import { useAiSelection } from '../../../ai/chat/hooks/useAiSelection';
import type { Job } from '../../types/job.types';
import { TrackStrings } from '../strings';

export interface ResumeModel {
  providerId: AiProviderId;
  modelId: string;
  thinking?: string;
}

interface ResumeWithModelDialogProps {
  /** Resumo de PDF que parou; `null` com a janela fechada. */
  job: Job | null;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (job: Job, model: ResumeModel) => void;
}

function ResumeForm({
  job,
  isPending,
  onClose,
  onConfirm,
}: {
  job: Job;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (job: Job, model: ResumeModel) => void;
}) {
  const ai = useAiSelection();
  const ready = !!ai.providerId && !!ai.modelId && ai.thinkingReady;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{TrackStrings.changeModel.title}</DialogTitle>

        <DialogDescription>
          {job.resume
            ? TrackStrings.changeModel.description(job.resume.done, job.resume.total)
            : TrackStrings.changeModel.descriptionSteps}
        </DialogDescription>
      </DialogHeader>

      <ChatSettings {...ai} disabled={isPending} />

      <DialogFooter>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          Cancelar
        </Button>

        <Button
          disabled={!ready || isPending}
          loading={isPending}
          onClick={() => {
            if (ai.providerId && ai.modelId && ai.thinkingReady) {
              onConfirm(job, {
                providerId: ai.providerId as AiProviderId,
                modelId: ai.modelId,
                thinking: ai.thinkingId,
              });
            }
          }}
        >
          {TrackStrings.changeModel.confirm}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * "Trocar modelo": continua um resumo de PDF que parou (por exemplo, porque o limite de uso do
 * modelo acabou) com outro modelo. As partes já resumidas continuam como estão; só as que faltam
 * usam o modelo novo.
 */
export function ResumeWithModelDialog({
  job,
  isPending = false,
  onOpenChange,
  onConfirm,
}: ResumeWithModelDialogProps) {
  return (
    <Dialog open={job !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {job && (
          <ResumeForm
            job={job}
            isPending={isPending}
            onClose={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
