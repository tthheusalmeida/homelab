import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "#ui/dialog";
import { Input } from "#ui/input";
import { Label } from "#ui/label";
import { Textarea } from "#ui/textarea";
import { accentOptions } from "#lib/appearance";
import { cn } from "#lib/utils";

import { HexColorPicker } from "#components/HexColorPicker";
import { OptionSelect } from "#components/OptionSelect";

import { DEFAULT_COVER_COLOR, isValidCoverImageUrl } from "../cover";
import { useCreateBook, useUpdateBook } from "../hooks";
import {
  bookKindOptions,
  type BookCoverColor,
  type BookDetail,
  type BookKind,
  type BookSummary,
} from "../types";
import { BookCover } from "./BookCover";
import { useSnackbar } from "#components/Snackbar";
import { FormButtons } from "#components/FormButtons";
import { useErrorAlert } from "#hooks/use-error-alert";

interface BookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem livro = criar; com livro = editar dados e capa. */
  book?: Pick<
    BookSummary,
    | "id"
    | "title"
    | "kind"
    | "description"
    | "subtitle"
    | "coverColor"
    | "coverImageUrl"
  >;
  onSaved?: (book: BookDetail) => void;
}

export function BookFormDialog({
  open,
  onOpenChange,
  book,
  onSaved,
}: BookFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent bare className="sm:max-w-2xl">
        {open && (
          <BookForm
            key={book?.id ?? "new"}
            book={book}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookForm({
  book,
  onClose,
  onSaved,
}: {
  book: BookFormDialogProps["book"];
  onClose: () => void;
  onSaved?: (book: BookDetail) => void;
}) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [subtitle, setSubtitle] = useState(book?.subtitle ?? "");
  const [kind, setKind] = useState<BookKind>(book?.kind ?? "study");
  const [description, setDescription] = useState(book?.description ?? "");
  const [color, setColor] = useState<BookCoverColor>(
    book?.coverColor ?? DEFAULT_COVER_COLOR,
  );
  const [imageUrl, setImageUrl] = useState(book?.coverImageUrl ?? "");

  const create = useCreateBook();
  const update = useUpdateBook();
  const snackbar = useSnackbar();

  const mutation = book ? update : create;
  useErrorAlert(mutation.isError && "Não foi possível salvar o livro. Tente novamente.");
  const imageValid = isValidCoverImageUrl(imageUrl);
  const canSave = title.trim() !== "" && imageValid && !mutation.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      title: title.trim(),
      kind,
      description: description.trim(),
      subtitle: subtitle.trim(),
      coverColor: color,
      coverImageUrl: imageUrl.trim(),
    };
    const options = {
      onSuccess: (saved: BookDetail) => {
        if (book) {
          snackbar.success("Livro atualizado");
        } else {
          snackbar.created(`Livro criado: ${saved.title}`);
        }

        onSaved?.(saved);
        onClose();
      },
    };

    if (book) {
      update.mutate({ id: book.id, input }, options);
    } else {
      create.mutate(input, options);
    }
  }

  return (
    <DialogForm onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{book ? "Editar livro" : "Novo livro"}</DialogTitle>

        <DialogDescription>
          O livro reúne páginas que você já tem da biblioteca, em ordem. O texto
          continua nas páginas.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="book-title">Título</Label>

            <Input
              id="book-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Pós em DevOps"
              disabled={mutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-subtitle">Subtítulo da capa (opcional)</Label>

            <Input
              id="book-subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="Ex.: Resumos das aulas"
              disabled={mutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>

            <OptionSelect
              value={kind}
              options={bookKindOptions}
              placeholder="Tipo"
              label="Tipo"
              triggerWidth="w-48"
              contentWidth="w-52"
              disabled={mutation.isPending}
              onValueChange={(value) => setKind((value as BookKind) ?? "study")}
            />
          </div>

          <div className="space-y-2">
            <Label id="book-color-label">Cor da capa</Label>

            <HexColorPicker
              label="Cor da capa"
              options={accentOptions}
              value={color}
              disabled={mutation.isPending}
              onChange={setColor}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-image">Imagem da capa (opcional)</Label>

            <Input
              id="book-image"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://exemplo.com/capa.jpg"
              aria-invalid={!imageValid}
              disabled={mutation.isPending}
            />

            <p
              className={cn(
                "text-xs",
                imageValid ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {imageValid
                ? "Cole o endereço de uma imagem (http ou https). Não há upload de arquivo."
                : "Informe uma URL http(s) válida."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-description">Descrição (opcional)</Label>

            <Textarea
              id="book-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: Resumos das aulas da pós"
              disabled={mutation.isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Prévia</p>

          <BookCover
            title={title.trim() || "Título do livro"}
            kind={kind}
            subtitle={subtitle.trim()}
            color={color}
            imageUrl={imageValid ? imageUrl.trim() : ""}
          />
        </div>
      </div>

      <DialogFooter>
        <FormButtons
          onCancel={onClose}
          pending={mutation.isPending}
          canSubmit={canSave}
        >
          {book ? "Salvar" : "Criar livro"}
        </FormButtons>
      </DialogFooter>
    </DialogForm>
  );
}
