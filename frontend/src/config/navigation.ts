export type SurfaceNavConfigItem = {
  href: string;
  labelKey: string;
  fallback: string;
};

export const studentNav: SurfaceNavConfigItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", fallback: "Boshqaruv" },
  { href: "/practice", labelKey: "nav.practice", fallback: "Mashq markazi" },
  { href: "/simulation", labelKey: "nav.simulation", fallback: "Imtihon simulyatsiyasi" },
  { href: "/analytics", labelKey: "nav.analytics", fallback: "Analitika" },
  { href: "/leaderboard", labelKey: "nav.leaderboard", fallback: "Reyting jadvali" },
  { href: "/achievements", labelKey: "nav.achievements", fallback: "Yutuqlar" },
  { href: "/profile", labelKey: "nav.profile", fallback: "Profil" },
  { href: "/billing", labelKey: "nav.billing", fallback: "To'lovlar" },
];

export const instructorNav: SurfaceNavConfigItem[] = [
  { href: "/instructor/dashboard", labelKey: "nav.dashboard", fallback: "Boshqaruv" },
  { href: "/instructor/groups", labelKey: "nav.instructor.groups", fallback: "Guruhlar" },
  { href: "/instructor/students", labelKey: "nav.instructor.students", fallback: "O'quvchilar" },
  { href: "/instructor/analytics", labelKey: "nav.instructor.analytics", fallback: "Instruktor analitikasi" },
];

export const schoolNav: SurfaceNavConfigItem[] = [
  { href: "/school/dashboard", labelKey: "nav.dashboard", fallback: "Boshqaruv" },
  { href: "/school/groups", labelKey: "nav.school.groups", fallback: "Guruhlar" },
  { href: "/school/instructors", labelKey: "nav.school.instructors", fallback: "Instruktorlar" },
  { href: "/school/analytics", labelKey: "nav.school.analytics", fallback: "Maktab analitikasi" },
];

export const adminNav: SurfaceNavConfigItem[] = [
  { href: "/admin", labelKey: "admin.nav.dashboard", fallback: "Boshqaruv" },
  { href: "/admin/users", labelKey: "admin.nav.users", fallback: "Foydalanuvchilar" },
  { href: "/admin/schools", labelKey: "admin.nav.driving_schools", fallback: "Maktablar" },
  { href: "/admin/promos", labelKey: "admin.nav.promos", fallback: "Promokodlar" },
  { href: "/admin/ml", labelKey: "admin.nav.ml", fallback: "ML kuzatuv" },
];
