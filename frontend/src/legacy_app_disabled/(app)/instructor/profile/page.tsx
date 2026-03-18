'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstructorProfileLegacyRoute() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/instructor/profile-builder');
  }, [router]);

  return (
    <section className="container-app py-10">
      <div className="h-56 animate-pulse rounded-2xl border border-white/10 bg-slate-900/60" />
    </section>
  );
}
