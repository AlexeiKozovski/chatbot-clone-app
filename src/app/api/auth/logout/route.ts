import { NextResponse } from 'next/server';
import { clearSessionCookie, readSessionCookie } from '@/server/auth/session';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';

export async function POST() {
    const token = await readSessionCookie();
    if (token?.sid) {
        const sb = getSupabaseAdmin();
        await sb.from('sessions').delete().eq('id', token.sid);
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
}
