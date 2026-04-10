import { NextResponse } from 'next/server';
import { requireSession } from '@/server/auth/requireSession';
import { readSessionCookie } from '@/server/auth/session';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';

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
        return { ok: true as const, chatId: msg.chat_id as string };
    }

    if (chat.owner_session_id !== session.sid) return { ok: false as const, status: 403 as const };
    return { ok: true as const, chatId: msg.chat_id as string };
}

export async function POST(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
    const { messageId } = await params;
    const access = await assertMessageAccess(messageId);
    if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Expected multipart field 'file'" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const mime = file.type || 'application/octet-stream';
    const kind = mime.startsWith('image/') ? 'image' : 'document';

    const sb = getSupabaseAdmin();
    const bucket = 'chatbot';
    const path = `${kind}s/${access.chatId}/${messageId}/${Date.now()}-${file.name}`;

    const upload = await sb.storage.from(bucket).upload(path, bytes, {
        contentType: mime,
        upsert: false,
    });

    if (upload.error) {
        return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const { data: attachment, error: attErr } = await sb
        .from('attachments')
        .insert({
            message_id: messageId,
            kind,
            storage_path: `${bucket}/${path}`,
            mime,
            size_bytes: bytes.byteLength,
        })
        .select('id,kind,storage_path,created_at')
        .single();

    if (attErr || !attachment) {
        return NextResponse.json({ error: attErr?.message ?? 'Failed to save attachment' }, { status: 500 });
    }

    // Signed URL so the client can render it without public buckets
    const signed = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60);

    if (signed.error || !signed.data?.signedUrl) {
        return NextResponse.json({ error: signed.error?.message ?? 'No signed URL' }, { status: 500 });
    }

    return NextResponse.json(
        {
            attachment: {
                id: attachment.id as string,
                kind: attachment.kind as string,
                storagePath: attachment.storage_path as string,
                createdAt: attachment.created_at as string,
            },
            signedUrl: signed.data.signedUrl,
        },
        { status: 201 }
    );
}
