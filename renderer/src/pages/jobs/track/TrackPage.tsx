import { useState } from "react";

import { Button } from "../../../ui/button";
import { Card, CardContent } from "../../../ui/card";

import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import { useSnackbar } from "../../../components/Snackbar";

import { isActiveJob } from "./active";
import { JobList } from "./components/JobList";
import { describeDeleteResult } from "./delete-message";
import { useDeleteAllJobs, useDeleteJobs } from "./hooks/useDeleteJobs";
import { useJobs } from "./hooks/useJobs";
import { TrackStrings } from "./strings";

type Confirming = "selected" | "all" | null;

export function TrackPage() {
  const { data, isLoading, isError } = useJobs();
  const snackbar = useSnackbar();
  const deleteSelected = useDeleteJobs();
  const deleteAll = useDeleteAllJobs();

  // A seleção vive aqui, fora da consulta: o polling de 1 s não a perde.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState<Confirming>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center">
        <LoadingState message="Carregando" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ErrorState
            primaryMessage="Oops! houve uma falha ao carregar os jobs."
            secondaryMessage="Tente novamente mais tarde."
          />
        </CardContent>
      </Card>
    );
  }

  const deletable = data.filter((job) => !isActiveJob(job));
  const deletableIds = new Set(deletable.map((job) => job.id));
  // Só conta o que ainda existe e já terminou (um job some da lista ou pode ter sido excluído fora daqui).
  const chosen = [...selected].filter((id) => deletableIds.has(id));
  const activeCount = data.length - deletable.length;
  const mutation = confirming === "all" ? deleteAll : deleteSelected;

  const finish = (result: Parameters<typeof describeDeleteResult>[0]) => {
    snackbar.show(describeDeleteResult(result));
    setConfirming(null);
    setSelected(new Set());
    setSelecting(false);
  };

  const confirm = () =>
    confirming === "all"
      ? deleteAll.mutate(undefined, { onSuccess: finish })
      : deleteSelected.mutate(chosen, { onSuccess: finish });

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <div className="animate-enter-fade space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>

          <p className="text-sm text-muted-foreground">
            Acompanhe o processamento dos jobs e seus respectivos resultados.
          </p>
        </div>

        {data.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {selecting ? (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    setSelected(
                      chosen.length === deletable.length ? new Set() : new Set(deletableIds),
                    )
                  }
                  disabled={deletable.length === 0}
                >
                  {chosen.length === deletable.length && deletable.length > 0
                    ? TrackStrings.clearSelection
                    : TrackStrings.selectAll}
                </Button>

                <Button
                  variant="destructive"
                  disabled={chosen.length === 0}
                  onClick={() => setConfirming("selected")}
                >
                  {TrackStrings.deleteSelected(chosen.length)}
                </Button>

                <Button variant="outline" onClick={stopSelecting}>
                  {TrackStrings.cancelSelection}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSelecting(true)}>
                  {TrackStrings.select}
                </Button>

                <Button
                  variant="destructive"
                  disabled={deletable.length === 0}
                  title={deletable.length === 0 ? TrackStrings.nothingToDelete : undefined}
                  onClick={() => setConfirming("all")}
                >
                  {TrackStrings.deleteAll}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <JobList
        jobs={data}
        selectable={selecting}
        selectedIds={selected}
        onSelectedChange={toggle}
      />

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) {
            mutation.reset();
            setConfirming(null);
          }
        }}
        title={
          confirming === "all" ? TrackStrings.confirmAllTitle : TrackStrings.confirmSelectedTitle
        }
        description={
          confirming === "all"
            ? TrackStrings.confirmAll(deletable.length, activeCount)
            : TrackStrings.confirmSelected(chosen.length)
        }
        confirmLabel={TrackStrings.confirmLabel}
        destructive
        isPending={mutation.isPending}
        errorMessage={mutation.isError ? mutation.error.message : undefined}
        onConfirm={confirm}
      />
    </div>
  );
}
