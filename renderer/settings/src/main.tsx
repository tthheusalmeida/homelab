import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppearanceProvider } from '#components/AppearanceProvider';

import { SettingsApp } from './SettingsApp';

import './settings.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
      <QueryClientProvider client={queryClient}>
        <SettingsApp />
      </QueryClientProvider>
    </AppearanceProvider>
  </StrictMode>,
);
