import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard - AUTOTEST',
    description: 'Track your progress and access your tests.',
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
