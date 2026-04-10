import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getServerEnv } from '../env';

const COOKIE_NAME = 'chatbot_session';

type SessionToken = {
    sid: string; // session id
    uid?: string; // user id
};

function getKey() {
    const env = getServerEnv();
    return new TextEncoder().encode(env.SESSION_JWT_SECRET);
}

export async function setSessionCookie(token: SessionToken) {
    const jwt = await new SignJWT(token)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(getKey());

    (await cookies()).set(COOKIE_NAME, jwt, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
    });
}

export async function clearSessionCookie() {
    (await cookies()).set(COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
}

export async function readSessionCookie(): Promise<SessionToken | null> {
    const raw = (await cookies()).get(COOKIE_NAME)?.value;
    if (!raw) return null;

    try {
        const { payload } = await jwtVerify(raw, getKey());
        if (typeof payload.sid !== 'string') return null;
        const uid = typeof payload.uid === 'string' ? payload.uid : undefined;
        return { sid: payload.sid, uid };
    } catch {
        return null;
    }
}
