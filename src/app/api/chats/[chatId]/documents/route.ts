import { NextResponse } from 'next/server';
import { assertChatAccess } from '@/server/auth/chatAccess';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';
import { extractTextFromUpload } from '@/server/documents/extractText';

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const { chatId } = await params;
    const access = await assertChatAccess(chatId);
    if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Expected multipart field 'file'" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const extracted = await extractTextFromUpload({
        filename: file.name,
        mime: file.type || 'application/octet-stream',
        bytes,
    });

    const sb = getSupabaseAdmin();
    const bucket = 'chatbot';
    const path = `docs/${chatId}/${Date.now()}-${file.name}`;

    const upload = await sb.storage.from(bucket).upload(path, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
    });

    if (upload.error) {
        return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const { data: doc, error: docErr } = await sb
        .from('documents')
        .insert({
            chat_id: chatId,
            filename: file.name,
            storage_path: `${bucket}/${path}`,
            extracted_text: extracted.slice(0, 200_000),
        })
        .select('id,filename,created_at')
        .single();

    if (docErr || !doc) {
        return NextResponse.json({ error: docErr?.message ?? 'Failed to save document' }, { status: 500 });
    }

    return NextResponse.json(
        {
            document: {
                id: doc.id as string,
                filename: doc.filename as string,
                createdAt: doc.created_at as string,
                extractedChars: extracted.length,
            },
        },
        { status: 201 }
    );
}
