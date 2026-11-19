import { BookOpenText, Info } from 'lucide-react';

import { IconButton } from '#components/IconButton';

interface DocumentActionsProps {
  /** Entra no modo leitura. */
  onStartReading: () => void;
  /** Abre a janela "Sobre a página". */
  onOpenAbout: () => void;
}

/**
 * Ações da página, **na linha de cima** (ao lado das abas Resumo | Mapa mental, ou na linha do
 * "Voltar" quando não há abas): Modo leitura e Sobre a página, só com o ícone e um tooltip com a
 * ação. São as mesmas em todo tipo de página (resumo, transcrição, criação). Assim o painel
 * lateral fica só com os ajustes de leitura.
 */
export function DocumentActions({ onStartReading, onOpenAbout }: DocumentActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <IconButton label="Modo leitura" tooltipSide="bottom" onClick={onStartReading}>
        <BookOpenText />
      </IconButton>

      <IconButton label="Sobre a página" tooltipSide="bottom" onClick={onOpenAbout}>
        <Info />
      </IconButton>
    </div>
  );
}
