import { getSupabaseAdmin } from '../db/supabaseAdmin';
import { requireSession } from './requireSession';
import { readSessionCookie } from './session';

type ChatAccessDenied = {
    ok: false;
    status: 403 | 404;
};

type ChatAccessGranted = {
    ok: true;
    token: Awaited<ReturnType<typeof readSessionCookie>>;
    session: Awaited<ReturnType<typeof requireSession>>;
};

export type ChatAccessResult = ChatAccessDenied | ChatAccessGranted;

export async function assertChatAccess(chatId: string): Promise<ChatAccessResult> {
    const token = await readSessionCookie();
    const session = await requireSession();
    const sb = getSupabaseAdmin();

    const { data: chat, error } = await sb
        .from('chats')
        .select('id,owner_user_id,owner_session_id')
        .eq('id', chatId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!chat) return { ok: false, status: 404 };

    if (token?.uid) {
        if (chat.owner_user_id !== token.uid) return { ok: false, status: 403 };
        return { ok: true, token, session };
    }

    if (chat.owner_session_id !== session.sid) return { ok: false, status: 403 };
    return { ok: true, token, session };
}
