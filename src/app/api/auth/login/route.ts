import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword } from '@/server/auth/password';
import { setSessionCookie } from '@/server/auth/session';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';
import { randomUUID } from 'crypto';

const schema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const sb = getSupabaseAdmin();

    const { data: user, error } = await sb
        .from('users')
        .select('id,email,password_hash')
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sid = randomUUID();
    const { error: sessErr } = await sb.from('sessions').insert({
        id: sid,
        user_id: user.id,
        questions_used: 0,
    });
    if (sessErr) {
        return NextResponse.json({ error: sessErr.message }, { status: 500 });
    }

    await setSessionCookie({ sid, uid: user.id });
    return NextResponse.json({ user: { id: user.id, email: user.email } });
}
