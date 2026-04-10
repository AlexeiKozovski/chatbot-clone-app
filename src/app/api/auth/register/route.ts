import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/server/auth/password';
import { setSessionCookie } from '@/server/auth/session';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';
import { randomUUID } from 'crypto';

const schema = z.object({
    email: z.email(),
    password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const sb = getSupabaseAdmin();

    const existing = await sb.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();

    if (existing.data?.id) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const { data: user, error: insertErr } = await sb
        .from('users')
        .insert({ email: email.toLowerCase(), password_hash: passwordHash })
        .select('id,email')
        .single();

    if (insertErr || !user) {
        return NextResponse.json({ error: insertErr?.message ?? 'Failed to create user' }, { status: 500 });
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
    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
}
