import { getServerEnv } from '../env';

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function* streamChatCompletion(args: { messages: LlmMessage[] }): AsyncGenerator<string> {
    const env = getServerEnv();
    const baseUrl = env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1';
    const apiKey = env.LLM_API_KEY;
    const model = env.LLM_MODEL ?? 'openrouter/free';

    if (!apiKey) {
        const demo = 'LLM is not configured. Set LLM_API_KEY to enable real responses.';
        for (const ch of demo.split('')) {
            yield ch;
            await new Promise((r) => setTimeout(r, 8));
        }
        return;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            stream: true,
            messages: args.messages,
            temperature: 0.7,
        }),
    });

    if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `LLM error (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const events = buf.split('\n\n');
        buf = events.pop() ?? '';

        for (const e of events) {
            const line = e.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;

            try {
                const json = JSON.parse(data) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                };
                const chunk = json.choices?.[0]?.delta?.content;
                if (chunk) yield chunk;
            } catch {
                return null
            }
        }
    }
}
