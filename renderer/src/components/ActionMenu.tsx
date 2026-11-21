import { Fragment } from "react";
import { ChevronDown, MoreHorizontal, type LucideIcon } from "lucide-react";

import { Tip } from "#components/Tip";
import { Button } from "#ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#ui/dropdown-menu";

export interface ActionMenuItem {
  id: string;
  /** Texto curto e direto (ex.: "PNG", "Excluir"). */
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Ação perigosa (excluir, descartar): vermelha. Ponha no último grupo. */
  destructive?: boolean;
}

interface ActionMenuProps {
  /** Nome do botão que abre o menu (ex.: "Baixar"); sem texto visível (`iconOnly`) vira o tooltip. */
  label: string;
  /** Ícone do botão. */
  icon?: LucideIcon;
  /** Só o ícone, com tooltip: para barras compactas. Sem ícone usa o "⋯" (mais ações). */
  iconOnly?: boolean;
  /**
   * Opções em grupos, cada grupo separado por uma linha, da **mais para a menos importante**:
   * primeiro as frequentes, por último as raras ou perigosas (`destructive`).
   */
  groups: ActionMenuItem[][];
  /** Em andamento (ex.: gerando o arquivo): o botão mostra o spinner e trava. */
  loading?: boolean;
  disabled?: boolean;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default";
  align?: "start" | "center" | "end";
}

/**
 * **O** botão que abre um menu de ações do app (baixar, mais ações...). Use no lugar de uma fileira
 * de botões: as opções ganham texto (curto) e as perigosas ficam separadas, em vermelho, no fim.
 * Ordem de prioridade dos botões numa área de ações: **primária** (a ação principal, em destaque),
 * **secundária** (as frequentes, em contorno) e **terciária** (as raras ou perigosas, dentro deste
 * menu). Nunca ponha Editar e Excluir lado a lado com o mesmo destaque.
 */
export function ActionMenu({
  label,
  icon: Icon,
  iconOnly = false,
  groups,
  loading = false,
  disabled = false,
  variant = "outline",
  size = "sm",
  align = "end",
}: ActionMenuProps) {
  const filled = groups.filter((group) => group.length > 0);

  if (filled.length === 0) {
    return null;
  }

  const TriggerIcon = Icon ?? (iconOnly ? MoreHorizontal : undefined);
  const trigger = iconOnly ? (
    <Button
      type="button"
      variant={variant}
      size={size === "sm" ? "icon-sm" : "icon"}
      aria-label={label}
      loading={loading}
      disabled={disabled}
    >
      {!loading && TriggerIcon && <TriggerIcon />}
    </Button>
  ) : (
    <Button type="button" variant={variant} size={size} loading={loading} disabled={disabled}>
      {!loading && TriggerIcon && <TriggerIcon />}
      {label}
      <ChevronDown className="opacity-60" />
    </Button>
  );

  const menuTrigger = <DropdownMenuTrigger render={trigger} />;

  return (
    <DropdownMenu>
      {iconOnly ? <Tip content={label}>{menuTrigger}</Tip> : menuTrigger}

      <DropdownMenuContent align={align}>
        {filled.map((group, index) => (
          <Fragment key={group.map((item) => item.id).join("|")}>
            {index > 0 && <DropdownMenuSeparator />}

            {group.map((item) => (
              <DropdownMenuItem
                key={item.id}
                variant={item.destructive ? "destructive" : "default"}
                disabled={item.disabled}
                onClick={item.onSelect}
              >
                {item.icon && <item.icon />}
                {item.label}
              </DropdownMenuItem>
            ))}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
