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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const counter = useRef(0);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setActive(null);
  }, []);

  const show = useCallback(
    (text: string) => {
      clearTimeout(timer.current);
      counter.current += 1;
      setActive({ id: counter.current, text });
      timer.current = setTimeout(() => setActive(null), duration);
    },
    [duration],
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
          className={`fixed right-4 z-50 flex ${raised ? 'bottom-20' : 'bottom-4'} items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2`}
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
