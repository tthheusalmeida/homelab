import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleCheck, X } from 'lucide-react';

export const SNACKBAR_DURATION_MS = 3000;
/** Tempo da animação de saída: a mensagem só sai do DOM depois dela. */
export const SNACKBAR_EXIT_MS = 240;

interface SnackbarApi {
  /** Mostra uma mensagem no canto inferior direito; uma nova mensagem substitui a anterior. */
  show(message: string): void;
}

const SnackbarContext = createContext<SnackbarApi | null>(null);

interface ActiveMessage {
  id: number;
  text: string;
}

export function SnackbarProvider({
  children,
  duration = SNACKBAR_DURATION_MS,
  raised = false,
}: {
  children: ReactNode;
  duration?: number;
  /** Sobe a mensagem para não cobrir uma barra fixa no rodapé (ex.: o aviso de reinício). */
  raised?: boolean;
}) {
  const [active, setActive] = useState<ActiveMessage | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const counter = useRef(0);

  // Sai com uma animação curta e só então some do DOM.
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setLeaving(true);
    timer.current = setTimeout(() => {
      setActive(null);
      setLeaving(false);
    }, SNACKBAR_EXIT_MS);
  }, []);

  const show = useCallback(
    (text: string) => {
      clearTimeout(timer.current);
      counter.current += 1;
      setLeaving(false);
      setActive({ id: counter.current, text });
      timer.current = setTimeout(dismiss, duration);
    },
    [dismiss, duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={api}>
      {children}

      {active && (
        <div
          key={active.id}
          role="status"
          aria-live="polite"
          className={`fixed right-4 z-50 flex ${raised ? 'bottom-20' : 'bottom-4'} items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg ${leaving ? 'animate-exit-down' : 'animate-enter'}`}
        >
          <CircleCheck className="size-4 shrink-0 text-emerald-500" />
          <span>{active.text}</span>
          <button
            type="button"
            aria-label="Fechar"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={dismiss}
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  const context = useContext(SnackbarContext);

  if (!context) {
    throw new Error('useSnackbar precisa estar dentro de um SnackbarProvider.');
  }

  return context;
}
