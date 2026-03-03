import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Panel - AUTOTEST',
    description: 'Manage users, tests, and view analytics.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function AdminLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
