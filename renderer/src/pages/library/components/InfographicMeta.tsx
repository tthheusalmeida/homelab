import { useInfographic } from '../hooks/useLibrary';

interface InfographicMetaProps {
  documentId: string;
}

/**
 * O que se sabe do infográfico aberto: quantas seções ele tem e se foi editado. Fica na linha de
 * cima da página, junto das ações (e na barra do modo leitura), e não dentro do infográfico: assim o
 * infográfico começa no mesmo ponto do Resumo e do Mapa mental. Lê a mesma consulta da aba, então não
 * pede nada de novo. Sem infográfico ainda, não mostra nada; ao aparecer, entra com fade (só
 * opacidade), para não surgir do nada.
 */
export function InfographicMeta({ documentId }: InfographicMetaProps) {
  const { data } = useInfographic(documentId);

  if (!data) {
    return null;
  }

  const count = data.sections.length;

  return (
    <div className="flex animate-enter-fade items-center gap-2">
      {data.edited && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-brand-text">
          Editado
        </span>
      )}

      <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
        {count === 1 ? '1 seção' : `${count} seções`}
      </span>
    </div>
  );
}
