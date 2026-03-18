'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedAdminTestQuestionsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/questions');
    }, [router]);

    return null;
}
