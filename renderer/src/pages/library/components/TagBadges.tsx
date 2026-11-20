import { Badge } from "#ui/badge";
import { Tip } from "#components/Tip";

interface TagBadgesProps {
  tags: string[];
  /** Quantas tags aparecem; as outras viram "+N" (com a lista completa no tooltip). */
  max?: number;
}

export function TagBadges({ tags, max = 3 }: TagBadgesProps) {
  const shown = tags.slice(0, max);
  const rest = tags.slice(max);

  return (
    <>
      {shown.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}

      {rest.length > 0 && (
        <Tip content={rest.join(", ")}>
          <Badge variant="secondary">+{rest.length}</Badge>
        </Tip>
      )}
    </>
  );
}
