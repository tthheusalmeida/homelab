// `import.meta.env` dos arquivos do front que o renderer importa só pelos tipos
// (ex.: `services.types.ts` lê `VITE_API_URL`).
interface ImportMetaEnv {
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
