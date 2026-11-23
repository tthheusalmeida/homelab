import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CircleAlert, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";

import { IpcChannels } from "#shared/channels";
import type { AppNotice, NoticeLevel } from "#shared/contracts/events";
import { IpcEvents } from "#shared/events";
import { useIpcEvent } from "#hooks/use-ipc-event";
import { ipc } from "#lib/ipc";
import { cn } from "#lib/utils";
import { Button } from "#ui/button";

/** Avisos informativos somem sozinhos; avisos de erro e atenção ficam até serem dispensados. */
export const INFO_NOTICE_MS = 8000;

const STYLES: Record<NoticeLevel, { icon: LucideIcon; className: string }> = {
  error: { icon: CircleAlert, className: "text-destructive" },
  warning: { icon: TriangleAlert, className: "text-amber-500" },
  info: { icon: Info, className: "text-primary" },
};

const Texts = {
  region: "Avisos",
  dismiss: "Dispensar aviso",
  showDetails: "Ver detalhes",
  hideDetails: "Ocultar detalhes",
} as const;

/**
 * Central de avisos do app: falhas e situações importantes (job que falhou, processos interrompidos,
 * falha ao gravar em disco, arquivo recuperado da cópia...) aparecem aqui, em qualquer tela. Busca os
 * que nasceram antes de a tela existir e escuta os novos (`app:notice`). Um aviso com o mesmo id
 * substitui o anterior. Aviso que leva à tela em que o usuário já está (o de job, com "Ver tarefas",
 * dentro de Em andamento) não aparece: o resultado já está à vista, no próprio job.
 */
export function NoticeCenter() {
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = (id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setNotices((current) => current.filter((notice) => notice.id !== id));
  };

  const show = (notice: AppNotice) => {
    if (notice.link?.path === pathname) {
      return;
    }

    clearTimeout(timers.current.get(notice.id));
    setNotices((current) => [...current.filter((item) => item.id !== notice.id), notice]);

    if (notice.level === "info") {
      timers.current.set(
        notice.id,
        setTimeout(() => dismiss(notice.id), INFO_NOTICE_MS),
      );
    }
  };

  useIpcEvent(IpcEvents.notice, show);

  useEffect(() => {
    let cancelled = false;

    ipc
      .invoke(IpcChannels.notices.pending)
      .then((pending) => {
        if (!cancelled) {
          pending.forEach(show);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // só na montagem: os avisos seguintes chegam por evento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pending = timers.current;

    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  if (notices.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={Texts.region}
      className="fixed top-16 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {notices.map((notice) => {
        const { icon: Icon, className } = STYLES[notice.level];
        const open = expanded.has(notice.id);

        return (
          <div
            key={notice.id}
            role={notice.level === "error" ? "alert" : "status"}
            className="animate-enter flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-lg"
          >
            <div className="flex items-start gap-2">
              <Icon className={cn("mt-0.5 size-4 shrink-0", className)} />

              <div className="min-w-0 flex-1">
                <p className="font-medium">{notice.title}</p>

                {notice.message && <p className="text-muted-foreground">{notice.message}</p>}
              </div>

              <button
                type="button"
                aria-label={Texts.dismiss}
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => dismiss(notice.id)}
              >
                <X className="size-4" />
              </button>
            </div>

            {(notice.detail || notice.link) && (
              <div className="flex items-center justify-between gap-2 pl-6">
                {notice.detail ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() =>
                      setExpanded((current) => {
                        const next = new Set(current);

                        if (next.has(notice.id)) {
                          next.delete(notice.id);
                        } else {
                          next.add(notice.id);
                        }

                        return next;
                      })
                    }
                  >
                    {open ? Texts.hideDetails : Texts.showDetails}
                  </button>
                ) : (
                  <span />
                )}

                {notice.link && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      dismiss(notice.id);
                      void navigate(notice.link!.path);
                    }}
                  >
                    {notice.link.label}
                  </Button>
                )}
              </div>
            )}

            {open && notice.detail && (
              <pre className="ml-6 max-h-32 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
                {notice.detail}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
