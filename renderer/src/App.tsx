import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";

import { AppearanceProvider } from "#components/AppearanceProvider";
import { SnackbarProvider } from "#components/Snackbar";

import { queryClient } from "./lib/queryClient";
import { preloadRoutes, router } from "./app/router";

export default function App() {
  // Depois que o app abre, busca em segundo plano o código das outras telas (sem atrapalhar o uso).
  useEffect(() => preloadRoutes(), []);

  return (
    <AppearanceProvider>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <RouterProvider router={router} />
        </SnackbarProvider>
      </QueryClientProvider>
    </AppearanceProvider>
  );
}
