import { useSearchParams } from "react-router";

import { SettingsApp } from "../../../settings/src/SettingsApp";

/** Rota `/settings`: a seção vem do endereço (`?section=`); mudar a seção remonta a tela nela. */
export function SettingsPage() {
  const [params] = useSearchParams();
  const section = params.get("section");

  return <SettingsApp key={section ?? ""} initialSection={section} />;
}
