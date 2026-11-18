import { useState } from "react";

import { ChevronDown, Link2, Pencil, X } from "lucide-react";

import { Button } from "#ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#ui/collapsible";

import { VideoUrlStrings } from "../video-url-text";
import { describeLink, MAX_BATCH_LINKS, VISIBLE_LINKS } from "../video-urls";

interface LinkListProps {
  links: string[];
  disabled?: boolean;
  onEdit: (link: string) => void;
  onRemove: (link: string) => void;
  onClear: () => void;
}

interface LinkRowProps {
  link: string;
  position: number;
  disabled?: boolean;
  onEdit: (link: string) => void;
  onRemove: (link: string) => void;
}

function LinkRow({ link, position, disabled, onEdit, onRemove }: LinkRowProps) {
  const { host, path } = describeLink(link);

  return (
    <li className="animate-enter flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 py-1 pr-1 pl-2">
      <span aria-hidden="true" className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
        {position}
      </span>

      <Link2 aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />

      <span className="min-w-0 flex-1 truncate text-sm" title={link}>
        <span className="font-medium">{host}</span>
        <span className="text-muted-foreground">{path}</span>
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={VideoUrlStrings.edit(position)}
        disabled={disabled}
        onClick={() => onEdit(link)}
      >
        <Pencil />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={VideoUrlStrings.remove(position)}
        disabled={disabled}
        onClick={() => onRemove(link)}
      >
        <X />
      </Button>
    </li>
  );
}

/**
 * Links já adicionados ao pedido. Mostra os primeiros {@link VISIBLE_LINKS}; passando disso, um
 * contador ("+7 links") abre o restante numa lista com rolagem. Cada link pode ser editado
 * (volta ao campo) ou removido.
 */
export function LinkList({ links, disabled, onEdit, onRemove, onClear }: LinkListProps) {
  const [expanded, setExpanded] = useState(false);

  if (links.length === 0) {
    return null;
  }

  const visible = links.slice(0, VISIBLE_LINKS);
  const extra = links.slice(VISIBLE_LINKS);

  return (
    <div className="space-y-2">
      <ul aria-label={VideoUrlStrings.listLabel} className="space-y-1.5">
        {visible.map((link, index) => (
          <LinkRow
            key={link}
            link={link}
            position={index + 1}
            disabled={disabled}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      </ul>

      {extra.length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent>
            <ul aria-label={VideoUrlStrings.listLabel} className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {extra.map((link, index) => (
                <LinkRow
                  key={link}
                  link={link}
                  position={VISIBLE_LINKS + index + 1}
                  disabled={disabled}
                  onEdit={onEdit}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </CollapsibleContent>

          <CollapsibleTrigger
            className="group mt-1.5 flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {VideoUrlStrings.more(extra.length)}
            </span>

            <span>{expanded ? VideoUrlStrings.showLess : VideoUrlStrings.showAll}</span>

            <ChevronDown className="ml-auto size-4 transition-transform group-aria-expanded:rotate-180" />
          </CollapsibleTrigger>
        </Collapsible>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{VideoUrlStrings.counter(links.length, MAX_BATCH_LINKS)}</span>

        {links.length > 1 && (
          <Button type="button" variant="link" size="xs" disabled={disabled} onClick={onClear}>
            {VideoUrlStrings.clear}
          </Button>
        )}
      </div>
    </div>
  );
}
