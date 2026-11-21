import { useNavigate, useParams } from "react-router";

import { InboxStrings } from "#lib/inbox-text";


import { EditDocumentForm } from "./components/EditDocumentForm";
import { useDocument } from "./hooks/useLibrary";
import type { DocumentDetail } from "./types/library.types";
import { PageLoading, PageError } from "#components/PageState";

export function EditDocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useDocument(id);

  if (isLoading) {
    return (
      <PageLoading />
    );
  }

  if (isError || !data) {
    return (
      <PageError
        primaryMessage="Oops! não foi possível abrir a página."
        secondaryMessage="Ela pode ter sido removida ou o servidor está indisponível."
        actionLabel="Voltar à biblioteca"
        action={() => navigate("/library")}
      />
    );
  }

  if (data.meta.status !== "published") {
    return (
      <PageError
        primaryMessage="Só é possível editar páginas que estão na biblioteca."
        secondaryMessage={`Readicione a página ${InboxStrings.via} para editá-la.`}
        actionLabel="Voltar à página"
        action={() => navigate(`/library/${data.meta.id}`)}
      />
    );
  }

  return <EditForm key={data.meta.id} document={data} />;
}

function EditForm({ document }: { document: DocumentDetail }) {
  const navigate = useNavigate();

  return (
    <div className="animate-enter-fade space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar página</h1>

        <p className="text-sm text-muted-foreground">
          Mudar título ou categoria também renomeia ou move o arquivo. Use
          Imagem e Tabela para inserir esses elementos no texto.
        </p>
      </div>

      <EditDocumentForm
        document={document}
        onClose={() => navigate(`/library/${document.meta.id}`)}
      />
    </div>
  );
}
