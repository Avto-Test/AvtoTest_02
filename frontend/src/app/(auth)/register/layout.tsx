import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ro\'yxatdan o\'tish - AUTOTEST',
    description: 'Haydovchilik imtihoniga tayyorgarlikni boshlash uchun bepul hisob yarating.',
};

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
