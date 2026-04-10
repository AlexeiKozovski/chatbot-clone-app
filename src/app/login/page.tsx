'use client';

import { apiFetch } from '@/client/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const LoginPage = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const loginMutation = useMutation({
        mutationFn: async () => {
            await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
        },
        onSuccess: () => {
            toast.success('Signed in');
            router.push('/app');
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Login failed');
        },
    });

    const registerMutation = useMutation({
        mutationFn: async () => {
            await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
        },
        onSuccess: () => {
            toast.success('Account created');
            router.push('/app');
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Register failed');
        },
    });

    return (
        <div className="min-h-dvh flex items-center justify-center p-6">
            <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold">Welcome</h1>
                    <p className="text-sm text-muted-foreground">
                        Sign in to sync chats across devices. Anonymous mode allows 3 free questions.
                    </p>
                </div>

                <div className="mt-6 grid gap-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor="email">
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor="password">
                            Password
                        </label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="mt-2 grid gap-2">
                        <Button
                            onClick={() => loginMutation.mutate()}
                            disabled={loginMutation.isPending || registerMutation.isPending}
                        >
                            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => registerMutation.mutate()}
                            disabled={loginMutation.isPending || registerMutation.isPending}
                        >
                            {registerMutation.isPending ? 'Creating...' : 'Create account'}
                        </Button>
                    </div>

                    <div className="pt-2 text-xs text-muted-foreground">
                        By continuing, you agree to store your chats in the demo database.
                    </div>
                </div>
            </div>
        </div>
    );
};

export { LoginPage as default };
