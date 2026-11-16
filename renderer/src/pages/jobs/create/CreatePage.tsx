import { useState } from "react";

import { useNavigate } from "react-router";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "#ui/dialog";
import { Card, CardContent } from "#ui/card";

import { ErrorState } from "#components/ErrorState";
import { PageHeader } from "#components/PageHeader";
import { useSnackbar } from "#components/Snackbar";
import { LoadingState } from "#components/LoadingState";

import { JobTypeList } from "./components/JobTypeList";
import { JobForm } from "./components/JobForm";
import { useJobTypes } from "./hooks/useJobsTypes";

import { type JobType } from "../types/job.types";

export function CreatePage() {
  const [selectedJobType, setSelectedJobType] = useState<JobType | null>(null);
  const snackbar = useSnackbar();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useJobTypes();

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
            primaryMessage="Oops! houve uma falha ao carregar os tipos de jobs."
            secondaryMessage="Tente novamente mais tarde."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="animate-enter-fade space-y-6">
        <PageHeader
          title="Nova tarefa"
          command="jobs --new"
          description="Selecione o tipo de tarefa que deseja executar."
          status={`${data.length} ${data.length === 1 ? "tipo disponível" : "tipos disponíveis"}`}
        />

        <JobTypeList
          jobTypes={data}
          onSelect={setSelectedJobType}
        />
      </div>

      <Dialog
        open={selectedJobType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJobType(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedJobType ? selectedJobType.label : ""}
            </DialogTitle>

            <DialogDescription>
              Preencha os dados para criar este job.
            </DialogDescription>
          </DialogHeader>

          {selectedJobType && (
            <JobForm
              jobType={selectedJobType}
              onCreated={() => {
                // Fecha a janela: ao desmontar, o formulário é descartado e a
                // próxima abertura começa limpa (sem risco de criar o job duas vezes).
                snackbar.created(`Tarefa criada: ${selectedJobType.label}`, {
                  label: "Acompanhar",
                  onClick: () => void navigate("/jobs/track"),
                });
                setSelectedJobType(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
