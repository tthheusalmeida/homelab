import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";

import { AppearanceProvider } from "#components/AppearanceProvider";

import { queryClient } from "./lib/queryClient";
import { router } from "./app/router";

export default function App() {
  return (
    <AppearanceProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppearanceProvider>
  );
}
