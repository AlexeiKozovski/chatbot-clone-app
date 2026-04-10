import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../db/supabaseAdmin';
import { readSessionCookie, setSessionCookie } from './session';

export type CurrentSession = {
    sid: string;
    uid?: string;
};

export async function requireSession(): Promise<CurrentSession> {
    const existing = await readSessionCookie();
    if (existing) return existing;

    const sid = randomUUID();
    const sb = getSupabaseAdmin();
    const { error } = await sb.from('sessions').insert({
        id: sid,
        user_id: null,
        questions_used: 0,
    });
    if (error) throw new Error(error.message);

    await setSessionCookie({ sid });
    return { sid };
}
