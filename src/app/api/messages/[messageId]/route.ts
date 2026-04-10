import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/server/auth/requireSession';
import { readSessionCookie } from '@/server/auth/session';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';

const patchSchema = z.object({
    content: z.string().min(1).max(50_000),
});

async function assertMessageAccess(messageId: string) {
    const token = await readSessionCookie();
    const session = await requireSession();
    const sb = getSupabaseAdmin();

    const { data: msg, error } = await sb
        .from('messages')
        .select('id,chat_id,chats!inner(owner_user_id,owner_session_id)')
        .eq('id', messageId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!msg) return { ok: false as const, status: 404 as const };

    // @ts-expect-error supabase join typing
    const chat = msg.chats as { owner_user_id: string | null; owner_session_id: string | null };

    if (token?.uid) {
        if (chat.owner_user_id !== token.uid) return { ok: false as const, status: 403 as const };
        return { ok: true as const };
    }

    if (chat.owner_session_id !== session.sid) return { ok: false as const, status: 403 as const };
    return { ok: true as const };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
    const { messageId } = await params;
    const access = await assertMessageAccess(messageId);
    if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { error } = await sb.from('messages').update({ content: parsed.data.content }).eq('id', messageId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
