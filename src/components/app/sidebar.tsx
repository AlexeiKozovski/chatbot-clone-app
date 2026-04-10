'use client';

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { LogOut, Plus } from 'lucide-react';
import type { ChatListItem } from './chat-shell.types';

interface SidebarProps {
    chats: ChatListItem[];
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onCreateChat: () => void;
    onLogout: () => void;
    isLoading: boolean;
}

export const Sidebar: FC<SidebarProps> = (props) => {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 px-3 py-3">
                <Button className="w-full justify-start gap-2" onClick={props.onCreateChat}>
                    <Plus className="h-4 w-4" />
                    New chat
                </Button>
            </div>
            <Separator />

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {props.isLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading chats…</div>
                ) : props.chats.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No chats yet. Create one to start.</div>
                ) : (
                    <div className="grid gap-1">
                        {props.chats.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => props.onSelectChat(c.id)}
                                className={cn(
                                    'w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                                    props.activeChatId === c.id && 'bg-accent text-accent-foreground'
                                )}
                            >
                                <div className="truncate font-medium">{c.title}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {new Date(c.updatedAt).toLocaleString()}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Separator />
            <div className="p-2">
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={props.onLogout}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                </Button>
            </div>
        </div>
    );
};
