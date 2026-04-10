'use client';

export type ChatListItem = {
    id: string;
    title: string;
    updatedAt: string;
};

export type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
};
