'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin/driving-schools/schools', label: 'Avtomaktablar' },
  { href: '/admin/driving-schools/applications', label: 'Arizalar' },
  { href: '/admin/driving-schools/leads', label: 'Leadlar' },
  { href: '/admin/driving-schools/reviews', label: 'Reviewlar' },
  { href: '/admin/driving-schools/promo-stats', label: 'Promo statistika' },
];

export function DrivingSchoolAdminSubmenu() {
  const pathname = usePathname();

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

