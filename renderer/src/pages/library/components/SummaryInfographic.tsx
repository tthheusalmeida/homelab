import { useEffect, useRef, useState } from 'react';

import { Download, ImageOff, LayoutPanelTop } from 'lucide-react';

import { captureInfographicPng } from '#lib/infographic-image';
import {
  AUTO_LAYOUT,
  infographicImageName,
  LAYOUT_OPTIONS,
  type LayoutChoice,
} from '#lib/infographic';
import { cn } from '#lib/utils';

import { Callout } from '#components/Callout';
import { EmptyState } from '#components/EmptyState';
import { GenerateButton } from '#components/GenerateButton';
import { HexLoader } from '#components/Hex';
import { IconButton } from '#components/IconButton';
import { InfographicView } from '#components/InfographicView';
import { LoadingState } from '#components/LoadingState';
import { OptionSelect } from '#components/OptionSelect';
import { useSnackbar } from '#components/Snackbar';

import { useGenerateInfographic, useInfographic, useSaveMindMapImage } from '../hooks/useLibrary';

interface SummaryInfographicProps {
  documentId: string;
  title: string;
  className?: string;
}

const DOWNLOAD_FAILED = 'Não foi possível gerar a imagem do infográfico.';

/**
 * Páginas para as quais a IA já foi chamada nesta sessão. Abrir a aba chama a IA **uma vez** por
 * resumo que ainda não tem infográfico (como no mapa mental): se falhar (sem chave, limite de uso,
 * sem internet), reabrir a aba não gasta de novo, e quem decide tentar outra vez é o botão.
 */
const requestedThisSession = new Set<string>();

/**
 * Aba "Infográfico" de um resumo. Como no mapa mental, **na primeira vez que a aba abre e o resumo
 * ainda não tem infográfico, a IA já gera um** (história completa: capa, seções e fechamento). Se já
 * existe um, ele aparece na hora e a IA só roda de novo quando a pessoa clica em Gerar de novo.
 * O resultado fica guardado em disco e volta a abrir sem gastar.
 */
export function SummaryInfographic({ documentId, title, className }: SummaryInfographicProps) {
  const saved = useInfographic(documentId);
  const generate = useGenerateInfographic();
  const saveImage = useSaveMindMapImage();
  const snackbar = useSnackbar();

  const [choice, setChoice] = useState<LayoutChoice>(AUTO_LAYOUT);
  const [exporting, setExporting] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const pending = generate.isPending;
  const data = saved.data ?? null;
  const failed = generate.isError && !pending;

  const generateNow = () =>
    generate.mutate({ id: documentId, layout: choice === AUTO_LAYOUT ? undefined : choice });

  const missing = !saved.isPending && saved.data === null;

  useEffect(() => {
    if (missing && !requestedThisSession.has(documentId)) {
      requestedThisSession.add(documentId);
      generate.mutate({ id: documentId });
    }
    // `generate` muda a cada render; só a falta do infográfico dispara a geração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, documentId]);

  const download = async (transparent: boolean) => {
    const element = stage.current;

    if (!element || exporting) {
      return;
    }

    setExporting(true);

    try {
      const dataBase64 = await captureInfographicPng(element, transparent);
      const result = await saveImage.mutateAsync({
        fileName: infographicImageName(title, transparent),
        dataBase64,
      });

      if (result.saved) {
        snackbar.success('Imagem do infográfico salva.');
      }
    } catch (error) {
      snackbar.error(error instanceof Error && error.message ? error.message : DOWNLOAD_FAILED);
    } finally {
      setExporting(false);
    }
  };

  if (saved.isPending) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <LoadingState message="Carregando o infográfico" />
      </div>
    );
  }

  let notice = null;

  if (failed) {
    notice = (
      <Callout
        tone="danger"
        role="alert"
        action={
          <GenerateButton pending={pending} onClick={generateNow} primary>
            Tentar de novo
          </GenerateButton>
        }
      >
        {`Não foi possível gerar com a IA: ${generate.error?.message ?? ''}`}
        {data ? ' O infográfico anterior continua aqui.' : ''}
      </Callout>
    );
  } else if (data?.stale && !pending) {
    notice = (
      <Callout
        tone="warning"
        role="status"
        action={
          <GenerateButton pending={pending} onClick={generateNow}>
            Atualizar com IA
          </GenerateButton>
        }
      >
        O resumo mudou depois que este infográfico foi gerado.
      </Callout>
    );
  }

  return (
    <div className={cn('space-y-4', className)} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <OptionSelect
            label="Estrutura do infográfico"
            value={choice}
            options={LAYOUT_OPTIONS}
            placeholder="Modelo"
            triggerWidth="w-44"
            contentWidth="w-56"
            disabled={pending}
            onValueChange={(value) => value && setChoice(value as LayoutChoice)}
          />

          {data && !notice && (
            <GenerateButton pending={pending} onClick={generateNow}>
              Gerar de novo
            </GenerateButton>
          )}
        </div>

        {data && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {data.sections.length === 1 ? '1 seção' : `${data.sections.length} seções`}
            </span>

            <IconButton
              label={exporting ? 'Gerando imagem…' : 'Baixar o infográfico como PNG com fundo'}
              disabled={exporting || pending}
              aria-busy={exporting}
              onClick={() => void download(false)}
            >
              {exporting ? <HexLoader className="size-4" label="Gerando imagem" /> : <Download />}
            </IconButton>

            <IconButton
              label={
                exporting
                  ? 'Gerando imagem…'
                  : 'Baixar o infográfico como PNG sem fundo (transparente)'
              }
              disabled={exporting || pending}
              onClick={() => void download(true)}
            >
              <ImageOff />
            </IconButton>
          </div>
        )}
      </div>

      {notice}

      {data ? (
        <div className={cn('transition-opacity', pending && 'opacity-50')}>
          <InfographicView ref={stage} data={data} />
        </div>
      ) : pending ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border border-dashed">
          <LoadingState message="Montando o infográfico com a IA" />
        </div>
      ) : (
        <EmptyState
          icon={LayoutPanelTop}
          title="Este resumo ainda não tem infográfico"
          description="A IA conta a história do resumo em seções, cada uma no modelo que melhor a mostra, com os textos tirados do resumo e as peças ilustradas do HomeLab."
          action={
            <GenerateButton pending={pending} onClick={generateNow} primary>
              Gerar infográfico
            </GenerateButton>
          }
        />
      )}
    </div>
  );
}
