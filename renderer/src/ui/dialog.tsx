import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "#lib/utils"
import { Button } from "#ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  bodyClassName,
  bare = false,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  /** Classes do miolo que rola. */
  bodyClassName?: string
  /**
   * Quem usa monta as três faixas (`DialogSections`/`DialogForm`): para conteúdo que vive dentro
   * de outro componente (formulário, tela cheia) ou que não tem cabeçalho nem rodapé (paleta).
   */
  bare?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {/* Três faixas: cabeçalho e rodapé fixos; só o miolo (`DialogBody`) rola. */}
        {bare ? (
          children
        ) : (
          <DialogSections bodyClassName={bodyClassName}>{children}</DialogSections>
        )}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

/** Miolo do diálogo: a única parte que rola (cabeçalho e rodapé ficam fora dela). */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        // A coluna única encolhe (`minmax(0,1fr)`): sem isso um texto sem quebra (link comprido)
        // alarga a grade e cria rolagem horizontal; cada filho corta com reticências.
        "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-4 overflow-x-hidden overflow-y-auto px-5 py-4",
        className
      )}
      {...props}
    />
  )
}

/**
 * Distribui os filhos nas três faixas: `DialogHeader` no topo e `DialogFooter` na base, ambos
 * fixos, e todo o resto num `DialogBody` que rola. Dentro de um `DialogContent` (ou de um
 * `DialogForm`) isso é automático; use direto só em conteúdo `bare`.
 */
function DialogSections({
  children,
  bodyClassName,
}: {
  children?: React.ReactNode
  bodyClassName?: string
}) {
  const headers: React.ReactNode[] = []
  const footers: React.ReactNode[] = []
  const body: React.ReactNode[] = []

  React.Children.toArray(children).forEach((child) => {
    if (React.isValidElement(child) && child.type === DialogHeader) {
      headers.push(child)
    } else if (React.isValidElement(child) && child.type === DialogFooter) {
      footers.push(child)
    } else {
      body.push(child)
    }
  })

  return (
    <>
      {headers}
      {body.length > 0 && <DialogBody className={bodyClassName}>{body}</DialogBody>}
      {footers}
    </>
  )
}

/**
 * Formulário que ocupa o diálogo inteiro: cabeçalho e rodapé (`DialogFooter` com os botões) fixos
 * e só o miolo rolando, sem que o `<form>` quebre o layout em faixas.
 */
function DialogForm({
  className,
  children,
  bodyClassName,
  ...props
}: React.ComponentProps<"form"> & { bodyClassName?: string }) {
  return (
    <form
      data-slot="dialog-form"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...props}
    >
      <DialogSections bodyClassName={bodyClassName}>{children}</DialogSections>
    </form>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        // Fora da rolagem: só o miolo rola. Sem miolo entre ele e o rodapé, o rodapé já traz a borda.
        // A altura mínima (3,5rem) é a do "x" de fechar (16px de topo + 32px de botão + folga): com
        // só o título, sem ela o "x" passaria da linha que separa o cabeçalho do miolo.
        "flex min-h-[3.5rem] shrink-0 flex-col justify-center gap-1 border-b bg-popover px-5 pt-4 pr-12 pb-3 has-[+[data-slot=dialog-footer]]:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t bg-popover px-5 py-3 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogSections,
  DialogTitle,
  DialogTrigger,
}
