import {
  BarChart3,
  BookCopy,
  Building2,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  ShieldAlert,
  Users,
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type AdminNavigationSection = {
  title: string;
  items: AdminNavigationItem[];
};

export const adminNavigation: AdminNavigationSection[] = [
  {
    title: "Asosiy",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Asosiy ko'rsatkichlar va tezkor kirishlar",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Platforma",
    items: [
      {
        href: "/admin/users",
        label: "Foydalanuvchilar",
        description: "Role, verifikatsiya va subscription",
        icon: Users,
      },
      {
        href: "/admin/content",
        label: "Kontent banki",
        description: "Testlar, savollar, kategoriyalar, lessonlar",
        icon: BookCopy,
      },
      {
        href: "/admin/billing",
        label: "Tariflar va promo",
        description: "Subscription plan va promo code boshqaruvi",
        icon: CreditCard,
      },
      {
        href: "/admin/analytics",
        label: "Analitika",
        description: "Platforma statistikasi va top testlar",
        icon: BarChart3,
      },
      {
        href: "/admin/violations",
        label: "Violation log",
        description: "Platformadagi buzilishlar tarixi",
        icon: ShieldAlert,
      },
    ],
  },
  {
    title: "Marketplace",
    items: [
      {
        href: "/admin/driving-schools",
        label: "Avtomaktablar",
        description: "Maktablar, arizalar, leadlar, reviewlar",
        icon: Building2,
      },
      {
        href: "/admin/driving-instructors",
        label: "Instruktorlar",
        description: "Instruktorlar, apply oqimi va shikoyatlar",
        icon: GraduationCap,
      },
    ],
  },
];

export const flatAdminNavigation = adminNavigation.flatMap((section) => section.items);

export function isAdminPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findAdminNavigationItem(pathname: string) {
  return flatAdminNavigation.find((item) => isAdminPathActive(pathname, item.href)) ?? flatAdminNavigation[0];
}
