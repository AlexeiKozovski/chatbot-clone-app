'use client';

import { apiFetch } from '@/client/api';
import { getRealtimeClient } from '@/client/supabaseRealtime';
import { ChatMain } from '@/components/app/chat-main';
import { Sidebar } from '@/components/app/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ChatListItem } from './chat-shell.types';

type Me = { user: null | { id: string; email: string } };

const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('chat-sync') : null;

export const ChatShell = () => {
    const queryClient = useQueryClient();
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    const meQuery = useQuery({
        queryKey: ['me'],
        queryFn: () => apiFetch<Me>('/api/me'),
        staleTime: 30_000,
    });

    const chatsQuery = useQuery({
        queryKey: ['chats'],
        queryFn: () => apiFetch<{ chats: ChatListItem[] }>('/api/chats'),
    });

    const firstChatId = chatsQuery.data?.chats?.[0]?.id ?? null;
    const selectedChatId = activeChatId ?? firstChatId;

    const activeChat = useMemo(() => {
        const chats = chatsQuery.data?.chats ?? [];
        return chats.find((c) => c.id === selectedChatId) ?? null;
    }, [selectedChatId, chatsQuery.data]);

    useEffect(() => {
        if (!broadcastChannel) return;
        const onMsg = (e: MessageEvent) => {
            if (e.data?.type === 'chats-updated') queryClient.invalidateQueries({ queryKey: ['chats'] });
            if (e.data?.type === 'messages-updated' && e.data?.chatId) {
                queryClient.invalidateQueries({ queryKey: ['messages', e.data.chatId] });
            }
        };
        broadcastChannel.addEventListener('message', onMsg);
        return () => broadcastChannel.removeEventListener('message', onMsg);
    }, [queryClient]);

    useEffect(() => {
        const uid = meQuery.data?.user?.id;
        if (!uid) return;
        const sb = getRealtimeClient();
        if (!sb) return;

        const chatsChannel = sb
            .channel(`realtime-chats-${uid}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chats',
                    filter: `owner_user_id=eq.${uid}`,
                },
                () => queryClient.invalidateQueries({ queryKey: ['chats'] })
            )
            .subscribe();

        return () => {
            sb.removeChannel(chatsChannel);
        };
    }, [meQuery.data?.user?.id, queryClient]);

    useEffect(() => {
        if (!activeChatId) return;
        const uid = meQuery.data?.user?.id;
        if (!uid) return;
        const sb = getRealtimeClient();
        if (!sb) return;

        const messagesChannel = sb
            .channel(`realtime-messages-${activeChatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${activeChatId}`,
                },
                () => queryClient.invalidateQueries({ queryKey: ['messages', activeChatId] })
            )
            .subscribe();

        return () => {
            sb.removeChannel(messagesChannel);
        };
    }, [activeChatId, meQuery.data?.user?.id, queryClient]);

    const createChatMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch<{ chat: ChatListItem }>('/api/chats', {
                method: 'POST',
                body: JSON.stringify({ title: 'New chat' }),
            });
            return res.chat;
        },
        onSuccess: (chat) => {
            toast.success('Chat created');
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            setActiveChatId(chat.id);
            broadcastChannel?.postMessage({ type: 'chats-updated' });
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        },
        onSuccess: () => {
            toast.success('Signed out');
            window.location.href = '/login';
        },
    });

    return (
        <div className="min-h-dvh flex bg-background">
            <aside className="hidden w-72 shrink-0 border-r md:flex md:flex-col">
                <Sidebar
                    chats={chatsQuery.data?.chats ?? []}
                    activeChatId={selectedChatId}
                    onSelectChat={setActiveChatId}
                    onCreateChat={() => createChatMutation.mutate()}
                    onLogout={() => logoutMutation.mutate()}
                    isLoading={chatsQuery.isLoading}
                />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
                    <Sheet>
                        <SheetTrigger
                            render={
                                <Button variant="ghost" size="icon" aria-label="Open chats">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            }
                        />
                        <SheetContent side="left" className="p-0">
                            <SheetHeader className="px-4 py-3">
                                <SheetTitle>Chats</SheetTitle>
                            </SheetHeader>
                            <Sidebar
                                chats={chatsQuery.data?.chats ?? []}
                                activeChatId={selectedChatId}
                                onSelectChat={setActiveChatId}
                                onCreateChat={() => createChatMutation.mutate()}
                                onLogout={() => logoutMutation.mutate()}
                                isLoading={chatsQuery.isLoading}
                            />
                        </SheetContent>
                    </Sheet>

                    <div className="min-w-0 flex-1 truncate text-sm font-medium">{activeChat?.title ?? 'Chat'}</div>
                </header>

                <main className="min-h-0 flex-1">
                    <ChatMain chatId={selectedChatId} broadcastChannel={broadcastChannel} />
                </main>
            </div>
        </div>
    );
};
