import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteChat, getChat, listChats } from "../api/chat";

/** Chaves da consulta: a lista e cada chat; invalidar `["chats"]` atualiza as duas. */
export const chatKeys = {
  all: ["chats"] as const,
  list: ["chats", "list"] as const,
  detail: (id: string) => ["chats", "detail", id] as const,
};

export function useChats() {
  return useQuery({ queryKey: chatKeys.list, queryFn: listChats });
}

/** Chat inteiro com as mensagens; sem `id` (chat novo, ainda não salvo) não consulta nada. */
export function useChat(id?: string) {
  return useQuery({
    queryKey: chatKeys.detail(id ?? ""),
    queryFn: () => getChat(id!),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChat,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: chatKeys.detail(id) });

      return queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}
