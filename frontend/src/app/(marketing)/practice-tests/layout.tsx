import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Available Tests - AUTOTEST',
    description: 'Browse our collection of practice tests to prepare for your exam.',
};

export default function TestsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
