import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';

import { Confetti } from '#components/Confetti';
import { LogoImplosion } from '#components/LogoImplosion';
import { SettingsGroup, SettingsPanel } from '#components/SettingsGroup';
import { useErrorAlert } from '#hooks/use-error-alert';
import { useHideStarPrompt, useSupport } from '#hooks/use-support';
import {
  CRITICAL_POINT_MS,
  REPOSITORY_URL,
  RETURN_MS,
  SupportStrings,
  THANKS_VISIBLE_MS,
} from '#lib/support-text';
import { cn } from '#lib/utils';
import { Button } from '#ui/button';

/** Tempo da animação de saída do cartão (`--duration-exit`). */
const EXIT_MS = 240;

/** ask: convite · thanks: agradecimento · leaving: saindo · done: fora da tela. */
type Phase = 'ask' | 'thanks' | 'leaving' | 'done';

/**
 * Convite discreto para apoiar o projeto com uma estrela no GitHub. Não bloqueia nada e só vive na
 * tela Sobre. O app não sabe se a pessoa estrelou (exigiria login), então o convite fica até ela
 * clicar em "Já dei minha estrela". Aí os três hexágonos da logo giram e encolhem como uma galáxia
 * implodindo; no ponto crítico o confete sai dali; eles voltam crescendo e girando até a posição
 * certa e o cartão agradece; depois sai sozinho. A escolha fica nas configurações.
 */
export function StarSupportCard() {
  const { data: support } = useSupport();
  const hide = useHideStarPrompt();
  const [phase, setPhase] = useState<Phase>('ask');
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useErrorAlert(hide.isError && SupportStrings.requestFailed);

  useEffect(() => {
    if (phase === 'thanks') {
      // No ponto crítico, o confete sai do centro da logo.
      const burst = setTimeout(() => {
        const box = logoRef.current?.getBoundingClientRect();

        setOrigin(
          box
            ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        );
      }, CRITICAL_POINT_MS);
      const leave = setTimeout(() => setPhase('leaving'), THANKS_VISIBLE_MS);

      return () => {
        clearTimeout(burst);
        clearTimeout(leave);
      };
    }

    if (phase === 'leaving') {
      const timer = setTimeout(() => setPhase('done'), EXIT_MS);

      return () => clearTimeout(timer);
    }
  }, [phase]);

  const alreadyStarred = () => {
    // A fase muda antes de salvar: ao gravar, o cache vira "escondido" e o cartão não pode sumir já.
    setPhase('thanks');
    hide.mutate(undefined, {
      onError: () => {
        setOrigin(null);
        setPhase('ask');
      },
    });
  };

  const thanking = phase === 'thanks' || phase === 'leaving';

  // Enquanto carrega ou depois de escolher: nada na tela (nunca pisca antes de saber).
  if (phase === 'done' || (!thanking && (!support || support.starPromptHidden))) {
    return null;
  }

  return (
    <SettingsGroup
      title={SupportStrings.title}
      className={cn(phase === 'leaving' && 'animate-exit-down')}
    >
      <SettingsPanel highlight={thanking}>
        {thanking ? (
          <div role="status" className="flex items-center gap-4">
            <LogoImplosion ref={logoRef} />

            {/* O texto entra quando os hexágonos começam a voltar. */}
            <div className="animate-enter" style={{ animationDelay: `${RETURN_MS}ms` }}>
              <p className="text-sm font-medium">{SupportStrings.thanksTitle}</p>
              <p className="text-sm text-muted-foreground">{SupportStrings.thanksMessage}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm">
              <Star aria-hidden className="size-4 shrink-0 text-primary" />
              {SupportStrings.message}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => window.open(REPOSITORY_URL, '_blank', 'noopener,noreferrer')}>
                <Star />
                {SupportStrings.open}
              </Button>

              <Button variant="outline" disabled={hide.isPending} onClick={alreadyStarred}>
                {SupportStrings.alreadyStarred}
              </Button>
            </div>
          </>
        )}
      </SettingsPanel>

      {thanking && origin && <Confetti origin={origin} />}
    </SettingsGroup>
  );
}
