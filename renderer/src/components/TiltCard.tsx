import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "#lib/utils";

/** Atributo que marca o "cartão" inteiro cuja área de hover aciona o efeito (inclui links sobrepostos). */
export const TILT_GROUP_ATTRIBUTE = "data-tilt-group";

interface TiltCardProps {
  children: ReactNode;
  /** Inclinação máxima, em graus, quando o ponteiro está na borda. */
  maxTilt?: number;
  /** Raio de borda do brilho, para acompanhar o formato do conteúdo (ex.: "rounded-md"). */
  glareClassName?: string;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Efeito de carta (como as da Steam): ao passar o mouse, o conteúdo se inclina para onde o ponteiro
 * está, sobe um pouco e ganha um brilho que o acompanha; sem o mouse em cima, fica normal. Escuta o
 * ancestral marcado com `data-tilt-group` (o cartão todo, inclusive o link que o cobre) ou, sem ele, o
 * próprio elemento. Não anima com `prefers-reduced-motion` nem com toque.
 */
export function TiltCard({ children, maxTilt = 10, glareClassName, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const host = element?.closest<HTMLElement>(`[${TILT_GROUP_ATTRIBUTE}]`) ?? element;

    if (!element || !host || prefersReducedMotion()) {
      return undefined;
    }

    let frame = 0;

    const reset = () => {
      cancelAnimationFrame(frame);
      delete element.dataset.hovering;
      element.style.removeProperty("--tilt-x");
      element.style.removeProperty("--tilt-y");
      element.style.removeProperty("--glare-x");
      element.style.removeProperty("--glare-y");
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      const rect = element.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      // 0 a 1 dentro do conteúdo (o ponteiro pode estar um pouco fora, no texto do cartão)
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.dataset.hovering = "true";
        element.style.setProperty("--tilt-x", `${((0.5 - y) * 2 * maxTilt).toFixed(2)}deg`);
        element.style.setProperty("--tilt-y", `${((x - 0.5) * 2 * maxTilt).toFixed(2)}deg`);
        element.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
        element.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
      });
    };

    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", reset);
    host.addEventListener("pointercancel", reset);

    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", reset);
      host.removeEventListener("pointercancel", reset);
      cancelAnimationFrame(frame);
    };
  }, [maxTilt]);

  return (
    <div
      ref={ref}
      data-slot="tilt-card"
      className={cn(
        "group/tilt relative transform-gpu transition-transform duration-500 ease-out will-change-transform",
        "[transform:perspective(700px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))_translateY(0)_scale(1)]",
        "data-[hovering=true]:duration-100",
        "data-[hovering=true]:[transform:perspective(700px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))_translateY(-6px)_scale(1.04)]",
        className,
      )}
    >
      {children}

      <span
        aria-hidden
        data-slot="tilt-glare"
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-data-[hovering=true]/tilt:opacity-100",
          glareClassName,
        )}
        style={{
          background:
            "radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgb(255 255 255 / 0.7), transparent 60%)",
        }}
      />
    </div>
  );
}
