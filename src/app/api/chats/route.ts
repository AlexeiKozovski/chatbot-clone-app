import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/server/auth/requireSession';
import { readSessionCookie } from '@/server/auth/session';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';

const createSchema = z.object({
    title: z.string().min(1).max(120).default('New chat'),
});

export async function GET() {
    const token = await readSessionCookie();
    const session = await requireSession();
    const sb = getSupabaseAdmin();

    const q = sb.from('chats').select('id,title,updated_at').order('updated_at', { ascending: false }).limit(100);

    const { data, error } = token?.uid
        ? await q.eq('owner_user_id', token.uid)
        : await q.eq('owner_session_id', session.sid);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        chats: (data ?? []).map((c) => ({
            id: c.id as string,
            title: c.title as string,
            updatedAt: c.updated_at as string,
        })),
    });
}

export async function POST(req: Request) {
    const token = await readSessionCookie();
    const session = await requireSession();
    const sb = getSupabaseAdmin();

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body ?? {});
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data, error } = await sb
        .from('chats')
        .insert({
            title: parsed.data.title,
            owner_user_id: token?.uid ?? null,
            owner_session_id: token?.uid ? null : session.sid,
        })
        .select('id,title,updated_at')
        .single();

    if (error || !data) {
        return NextResponse.json({ error: error?.message ?? 'Failed to create chat' }, { status: 500 });
    }

    return NextResponse.json(
        {
            chat: {
                id: data.id as string,
                title: data.title as string,
                updatedAt: data.updated_at as string,
            },
        },
        { status: 201 }
    );
}
