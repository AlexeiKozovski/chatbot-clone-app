import { NextResponse } from 'next/server';
import { readSessionCookie } from '@/server/auth/session';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';

export async function GET() {
    const token = await readSessionCookie();
    if (!token?.uid) return NextResponse.json({ user: null });

    const sb = getSupabaseAdmin();
    const { data: user, error } = await sb
        .from('users')
        .select('id,email,created_at')
        .eq('id', token.uid)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
        user: user ? { id: user.id, email: user.email, createdAt: user.created_at } : null,
    });
}
