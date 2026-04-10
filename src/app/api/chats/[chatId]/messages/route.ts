import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertChatAccess } from '@/server/auth/chatAccess';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';

const postSchema = z.object({
    content: z.string().min(1).max(20_000),
});

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const { chatId } = await params;
    const access = await assertChatAccess(chatId);
    if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
        .from('messages')
        .select('id,role,content,created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        messages: (data ?? []).map((m) => ({
            id: m.id as string,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content as string,
            createdAt: m.created_at as string,
        })),
    });
}

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const { chatId } = await params;
    const access = await assertChatAccess(chatId);
    if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });

    const body = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Anonymous limit
    if (!access.token?.uid) {
        const { data: sess, error: sessErr } = await sb
            .from('sessions')
            .select('questions_used')
            .eq('id', access.session.sid)
            .maybeSingle();
        if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 });

        const used = (sess?.questions_used ?? 0) as number;
        if (used >= 3) {
            return NextResponse.json(
                { error: 'Anonymous limit reached. Please sign in to continue.' },
                { status: 403 }
            );
        }

        const { error: incErr } = await sb
            .from('sessions')
            .update({ questions_used: used + 1, last_seen_at: new Date().toISOString() })
            .eq('id', access.session.sid);
        if (incErr) return NextResponse.json({ error: incErr.message }, { status: 500 });
    }

    const { data, error } = await sb
        .from('messages')
        .insert({
            chat_id: chatId,
            role: 'user',
            content: parsed.data.content,
        })
        .select('id,role,content,created_at')
        .single();

    if (error || !data) {
        return NextResponse.json({ error: error?.message ?? 'Failed to create message' }, { status: 500 });
    }

    return NextResponse.json(
        {
            message: {
                id: data.id as string,
                role: data.role as 'user' | 'assistant' | 'system',
                content: data.content as string,
                createdAt: data.created_at as string,
            },
        },
        { status: 201 }
    );
}
