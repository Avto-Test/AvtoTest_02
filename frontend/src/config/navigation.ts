export type SurfaceNavConfigItem = {
  href: string;
  labelKey: string;
  fallback: string;
};

export const studentNav: SurfaceNavConfigItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", fallback: "Boshqaruv" },
  { href: "/practice", labelKey: "nav.practice", fallback: "Mashq" },
  { href: "/simulation", labelKey: "nav.simulation", fallback: "Simulyatsiya" },
  { href: "/analytics", labelKey: "nav.analytics", fallback: "Analitika" },
  { href: "/leaderboard", labelKey: "nav.leaderboard", fallback: "Reyting" },
  { href: "/profile", labelKey: "nav.profile", fallback: "Profil" },
];

export const instructorNav: SurfaceNavConfigItem[] = [
  { href: "/instructor/dashboard", labelKey: "nav.dashboard", fallback: "Boshqaruv" },
  { href: "/instructor/groups", labelKey: "nav.instructor.groups", fallback: "Guruhlar" },
  { href: "/instructor/students", labelKey: "nav.instructor.students", fallback: "Talabalar" },
  { href: "/instructor/analytics", labelKey: "nav.instructor.analytics", fallback: "Analitika" },
];

export const schoolNav: SurfaceNavConfigItem[] = [
  { href: "/school/dashboard", labelKey: "nav.dashboard", fallback: "Boshqaruv" },
  { href: "/school/instructors", labelKey: "nav.school.instructors", fallback: "Instruktorlar" },
  { href: "/school/groups", labelKey: "nav.school.groups", fallback: "Guruhlar" },
  { href: "/school/analytics", labelKey: "nav.school.analytics", fallback: "Statistika" },
];

export const adminNav: SurfaceNavConfigItem[] = [
  { href: "/admin/users", labelKey: "admin.nav.users", fallback: "Foydalanuvchilar" },
  { href: "/admin/schools", labelKey: "admin.nav.driving_schools", fallback: "Maktablar" },
  { href: "/admin/promos", labelKey: "admin.nav.promos", fallback: "Promokodlar" },
  { href: "/admin/analytics", labelKey: "admin.nav.analytics", fallback: "Analitika" },
  { href: "/admin/ml", labelKey: "admin.nav.ml", fallback: "ML kuzatuv" },
];
