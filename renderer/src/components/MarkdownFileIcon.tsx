import type { SVGProps } from "react";

/**
 * Ícone de página em Markdown (folha com o "M↓" do formato), no mesmo traço dos ícones do app. É o
 * sinal discreto de "isto vem de uma das suas páginas": usado nas referências do chat.
 */
export function MarkdownFileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8 17v-4l2 2.2 2-2.2v4" />
      <path d="M15.5 13v4m-1.3-1.3 1.3 1.3 1.3-1.3" />
    </svg>
  );
}
