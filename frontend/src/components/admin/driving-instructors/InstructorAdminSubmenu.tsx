'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin/driving-instructors/instructors', label: 'Instruktorlar' },
  { href: '/admin/driving-instructors/applications', label: 'Arizalar' },
  { href: '/admin/driving-instructors/leads', label: 'Leadlar' },
  { href: '/admin/driving-instructors/reviews', label: 'Reviewlar' },
  { href: '/admin/driving-instructors/complaints', label: 'Shikoyatlar' },
  { href: '/admin/driving-instructors/campaigns', label: 'Kampaniya sozlamalari' },
];

export function InstructorAdminSubmenu() {
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

