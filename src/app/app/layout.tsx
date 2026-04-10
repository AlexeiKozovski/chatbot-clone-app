import type { ReactNode } from 'react';

const AppLayout = ({ children }: { children: ReactNode }) => {
    return <div className="min-h-dvh">{children}</div>;
};

export { AppLayout as default };
