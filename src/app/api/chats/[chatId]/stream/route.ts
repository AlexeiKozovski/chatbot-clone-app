import { NextResponse } from 'next/server';
import { assertChatAccess } from '@/server/auth/chatAccess';
import { getSupabaseAdmin } from '@/server/db/supabaseAdmin';
import { streamChatCompletion } from '@/server/llm/openaiCompatible';

export async function POST(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
    const { chatId } = await params;
    const access = await assertChatAccess(chatId);
    if (!access.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const sb = getSupabaseAdmin();
    const { data: rows, error } = await sb
        .from('messages')
        .select('role,content,created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const messages = (rows ?? []).map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content as string,
    }));

    const { data: docs } = await sb
        .from('documents')
        .select('filename,extracted_text,created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(3);

    const docContext = (docs ?? [])
        .map((d) => {
            const text = (d.extracted_text as string) || '';
            const excerpt = text.slice(0, 4000);
            return `# ${d.filename}\n\n${excerpt}`;
        })
        .filter(Boolean)
        .join('\n\n---\n\n');

    const finalMessages =
        docContext.trim().length > 0
            ? [
                  {
                      role: 'system' as const,
                      content:
                          'You can use the following uploaded documents as additional context. If not relevant, ignore.\n\n' +
                          docContext,
                  },
                  ...messages,
              ]
            : messages;

    const encoder = new TextEncoder();
    let full = '';

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            controller.enqueue(encoder.encode('event: ready\ndata: ok\n\n'));

            try {
                for await (const chunk of streamChatCompletion({ messages: finalMessages })) {
                    full += chunk;
                    controller.enqueue(encoder.encode(`data: ${chunk.replace(/\n/g, '\\n')}\n\n`));
                }
                if (full.trim()) {
                    await sb.from('messages').insert({
                        chat_id: chatId,
                        role: 'assistant',
                        content: full,
                    });
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Stream error';
                controller.enqueue(encoder.encode(`event: error\ndata: ${msg}\n\n`));
                controller.close();
            }
        },
        async cancel() {
            // client disconnected
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
