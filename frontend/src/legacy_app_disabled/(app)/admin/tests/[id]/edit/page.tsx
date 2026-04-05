'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedAdminTestsEditPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/questions');
    }, [router]);

    return null;
}
