import type { ComponentProps } from "react";

import { Card, CardContent } from "#ui/card";
import { ErrorState } from "#components/ErrorState";
import { LoadingState } from "#components/LoadingState";

/** Página inteira carregando: o indicador centralizado na área útil. */
export function PageLoading({ message = "Carregando" }: { message?: string }) {
  return (
    <div className="flex min-h-[80dvh] items-center justify-center">
      <LoadingState message={message} />
    </div>
  );
}

/** Página inteira com falha ao carregar: a mensagem (e a ação opcional) num cartão. Mesmas props do `ErrorState`. */
export function PageError(props: ComponentProps<typeof ErrorState>) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <ErrorState {...props} />
      </CardContent>
    </Card>
  );
}
