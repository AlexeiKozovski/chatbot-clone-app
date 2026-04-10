'use client';

import type { FC } from 'react';
import { cn } from '@/lib/utils';
import type { Message } from './chat-shell.types';

interface MessageBubbleProps {
    role: Message['role'];
    content: string;
}

export const MessageBubble: FC<MessageBubbleProps> = ({ role, content }) => {
    const isUser = role === 'user';
    return (
        <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                )}
            >
                {content}
            </div>
        </div>
    );
};
