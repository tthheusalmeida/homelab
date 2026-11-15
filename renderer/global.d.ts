import type { RendererApi } from '../src/shared/renderer-api';

declare global {
  interface Window {
    /** Ponte do preload (ver src/preload). */
    api: RendererApi;
  }
}

export {};
