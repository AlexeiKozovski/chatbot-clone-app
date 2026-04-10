import { z } from 'zod';

const serverEnvSchema = z.object({
    SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SESSION_JWT_SECRET: z.string().min(32),

    LLM_BASE_URL: z.string().optional(),
    LLM_API_KEY: z.string().min(1).optional(),
    LLM_MODEL: z.string().min(1).optional(),

    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

export function getServerEnv() {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
        throw new Error(`Invalid env:\n${msg}`);
    }
    return parsed.data;
}
