import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Boshqaruv paneli - AUTOTEST",
    description: "Natijalaringizni kuzating va testlar boshqaruviga o'ting.",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
