import { useEffect, useMemo, type ReactNode } from 'react';

import { Sparkles } from 'lucide-react';

import { buildMindMap, fromAiMap } from '#lib/mind-map';
import { cn } from '#lib/utils';
import { Button } from '#ui/button';

import { Callout } from '#components/Callout';
import { HexLoader } from '#components/Hex';
import { IconButton } from '#components/IconButton';
import { LoadingState } from '#components/LoadingState';
import { MindMapView } from '#components/MindMapView';
import { useSnackbar } from '#components/Snackbar';

import { useGenerateMindMap, useMindMap, useSaveMindMapImage } from '../hooks/useLibrary';

interface SummaryMindMapProps {
  documentId: string;
  title: string;
  /** O Markdown do resumo (para o mapa simples de reserva). */
  content: string;
  className?: string;
}

/**
 * Páginas para as quais a IA já foi chamada nesta sessão. Abrir a aba chama a IA **uma vez** por
 * resumo: se falhar (sem chave, limite de uso, sem internet), reabrir a aba não gasta de novo, e
 * quem decide tentar outra vez é o botão.
 */
const requestedThisSession = new Set<string>();

/** Botão de gerar: enquanto a IA trabalha, mostra a colmeia carregando e fica desabilitado. */
function GenerateButton({
  pending,
  onClick,
  children,
  primary = false,
}: {
  pending: boolean;
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={primary ? 'default' : 'outline'}
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
    >
      {pending ? (
        <>
          <span aria-hidden="true" className="inline-flex">
            <HexLoader className="size-4" />
          </span>
          Gerando…
        </>
      ) : (
        <>
          <Sparkles />
          {children}
        </>
      )}
    </Button>
  );
}

/**
 * Aba "Mapa mental" de um resumo. O mapa de **revisão** é gerado pela IA com um prompt próprio na
 * primeira vez que a aba abre e fica guardado em disco. Enquanto a IA trabalha, ou se ela falhar,
 * aparece um mapa simples montado do texto (sem IA), com o aviso do que está acontecendo e, se
 * falhou, o botão de tentar de novo **dentro** da mensagem de erro.
 */
export function SummaryMindMap({ documentId, title, content, className }: SummaryMindMapProps) {
  const saved = useMindMap(documentId);
  const generate = useGenerateMindMap();
  const saveImage = useSaveMindMapImage();
  const snackbar = useSnackbar();

  const missing = saved.isSuccess && saved.data === null;

  useEffect(() => {
    if (missing && !requestedThisSession.has(documentId)) {
      requestedThisSession.add(documentId);
      generate.mutate({ id: documentId });
    }
    // `generate` muda a cada render; só a falta do mapa dispara a geração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, documentId]);

  const map = useMemo(
    () => (saved.data ? fromAiMap(title, saved.data) : buildMindMap(content, title)),
    [saved.data, title, content],
  );

  const pending = generate.isPending;
  const regenerate = () => generate.mutate({ id: documentId });

  if (saved.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState message="Carregando o mapa mental" />
      </div>
    );
  }

  const hasMap = Boolean(saved.data);
  const failed = generate.isError && !pending;

  // Um aviso por vez, com o botão do que fazer dentro dele (o erro e a ação ficam juntos).
  let notice: ReactNode = null;

  if (failed) {
    notice = (
      <Callout
        tone="danger"
        role="alert"
        action={
          <GenerateButton pending={pending} onClick={regenerate} primary>
            Tentar de novo
          </GenerateButton>
        }
      >
        {`Não foi possível gerar com a IA: ${generate.error?.message ?? ''}`}
        {hasMap ? ' O mapa anterior continua aqui.' : ' Este é um mapa simples feito do texto.'}
      </Callout>
    );
  } else if (!hasMap) {
    notice = pending ? (
      <Callout role="status">
        Gerando o mapa de revisão com a IA. Enquanto isso, este é um mapa simples feito do texto.
      </Callout>
    ) : (
      <Callout
        role="note"
        action={
          <GenerateButton pending={pending} onClick={regenerate} primary>
            Gerar com IA
          </GenerateButton>
        }
      >
        Este é um mapa simples feito do texto, sem IA.
      </Callout>
    );
  } else if (saved.data?.stale && !pending) {
    notice = (
      <Callout
        tone="warning"
        role="status"
        action={
          <GenerateButton pending={pending} onClick={regenerate}>
            Atualizar com IA
          </GenerateButton>
        }
      >
        O resumo mudou depois que este mapa foi gerado.
      </Callout>
    );
  }

  // Com mapa da IA e sem aviso, gerar de novo fica entre os controles do mapa, só com o ícone.
  const toolbar =
    hasMap && !notice ? (
      <IconButton
        label={pending ? 'Gerando…' : 'Gerar de novo com IA'}
        disabled={pending}
        aria-busy={pending}
        onClick={regenerate}
      >
        {pending ? <HexLoader className="size-4" label="Gerando" /> : <Sparkles />}
      </IconButton>
    ) : undefined;

  return (
    <div className={cn('h-full', className)} aria-live="polite">
      <MindMapView
        map={map}
        notice={notice}
        toolbar={toolbar}
        overlay={
          pending ? (
            <div aria-hidden="true">
              <LoadingState message="Gerando o mapa de revisão com a IA" />
            </div>
          ) : undefined
        }
        onDownloadImage={async (image) => {
          const result = await saveImage.mutateAsync(image);

          if (result.saved) {
            snackbar.success('Imagem do mapa salva.');
          }
        }}
        onDownloadError={(message) => snackbar.error(message)}
      />
    </div>
  );
}
