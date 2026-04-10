'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/client/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileUp, Send } from 'lucide-react';
import { toast } from 'sonner';
import { MessageBubble } from './message-bubble';
import type { Message } from './chat-shell.types';

interface ChatMainProps {
    chatId: string | null;
    broadcastChannel: BroadcastChannel | null;
}

export const ChatMain: FC<ChatMainProps> = ({ chatId, broadcastChannel }) => {
    const queryClient = useQueryClient();
    const [text, setText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const docInputRef = useRef<HTMLInputElement | null>(null);

    const messagesQuery = useQuery({
        queryKey: ['messages', chatId],
        queryFn: () => apiFetch<{ messages: Message[] }>(`/api/chats/${chatId}/messages`),
        enabled: !!chatId,
    });

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [messagesQuery.data]);

    const sendMutation = useMutation({
        mutationFn: async () => {
            if (!chatId) throw new Error('Select a chat first');
            const content = text.trim();
            if (!content && !imageFile) return;
            setText('');
            setIsStreaming(true);

            const created = await apiFetch<{ message: { id: string } }>(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ content: content || ' ' }),
            });

            if (imageFile) {
                const form = new FormData();
                form.set('file', imageFile);

                const up = await fetch(`/api/messages/${created.message.id}/attachments`, {
                    method: 'POST',
                    body: form,
                    credentials: 'include',
                });
                if (!up.ok) {
                    const t = await up.text().catch(() => '');
                    throw new ApiError(t || 'Image upload failed', up.status);
                }
                const upJson = (await up.json()) as { signedUrl: string };

                const nextContent = (content || '').trim() + `\n\n[Image uploaded](${upJson.signedUrl})`;

                await apiFetch(`/api/messages/${created.message.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ content: nextContent.trim() || ' ' }),
                });

                setImageFile(null);
            }

            broadcastChannel?.postMessage({ type: 'messages-updated', chatId });
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

            const res = await fetch(`/api/chats/${chatId}/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                credentials: 'include',
            });

            if (!res.ok || !res.body) {
                const text = await res.text().catch(() => '');
                throw new ApiError(text || 'Stream failed', res.status);
            }

            const reader = res.body.getReader();
            while (true) {
                const { done } = await reader.read();
                if (done) break;
            }

            setIsStreaming(false);
            broadcastChannel?.postMessage({ type: 'messages-updated', chatId });
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        },
        onError: (err) => {
            setIsStreaming(false);
            toast.error(err instanceof Error ? err.message : 'Failed to send');
        },
    });

    if (!chatId) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="text-lg font-semibold">Create a chat to start</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        This demo streams assistant responses and stores chats in Postgres.
                    </div>
                </div>
            </div>
        );
    }

    const messages = messagesQuery.data?.messages ?? [];

    return (
        <div className="h-full flex flex-col">
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
                <div className="mx-auto w-full max-w-3xl space-y-6">
                    {messagesQuery.isLoading ? (
                        <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : messages.length === 0 ? (
                        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                            Send your first message. Anonymous users get 3 free questions.
                        </div>
                    ) : (
                        messages.map((m) => <MessageBubble key={m.id} role={m.role} content={m.content} />)
                    )}
                </div>
            </div>

            <div className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto w-full max-w-3xl p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setImageFile(file);
                            }}
                        />
                        <input
                            ref={docInputRef}
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            className="hidden"
                            onChange={async (e) => {
                                if (!chatId) return;
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                    const form = new FormData();
                                    form.set('file', file);
                                    const res = await fetch(`/api/chats/${chatId}/documents`, {
                                        method: 'POST',
                                        body: form,
                                        credentials: 'include',
                                    });
                                    if (!res.ok) {
                                        const t = await res.text().catch(() => '');
                                        toast.error(t || 'Upload failed');
                                        return;
                                    }
                                    toast.success('Document uploaded (used as context)');
                                } catch (err) {
                                    toast.error(err instanceof Error ? err.message : 'Upload failed');
                                } finally {
                                    e.currentTarget.value = '';
                                }
                            }}
                        />

                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            onClick={() => imageInputRef.current?.click()}
                        >
                            <FileUp className="h-4 w-4" />
                            Attach image
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            onClick={() => docInputRef.current?.click()}
                        >
                            <FileUp className="h-4 w-4" />
                            Upload document
                        </Button>

                        {imageFile && (
                            <div className="text-xs text-muted-foreground">
                                Image selected: <span className="font-medium">{imageFile.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Message… (paste images here too)"
                            onPaste={(e) => {
                                const items = Array.from(e.clipboardData.items);
                                const img = items.find((it) => it.type.startsWith('image/'));
                                if (!img) return;
                                const file = img.getAsFile();
                                if (file) {
                                    setImageFile(file);
                                    toast.message('Image pasted (will be attached on send)');
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMutation.mutate();
                                }
                            }}
                            disabled={sendMutation.isPending || isStreaming}
                        />
                        <Button
                            onClick={() => sendMutation.mutate()}
                            disabled={sendMutation.isPending || isStreaming || (!text.trim() && !imageFile)}
                            className="gap-2"
                        >
                            <Send className="h-4 w-4" />
                            Send
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
