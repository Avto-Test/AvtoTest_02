import { Award, BarChart3, BookOpen, Building2, Gauge, GraduationCap, Settings, Trophy, User, Users } from "lucide-react";

/** Primary flow: Dashboard → Practice → Simulation */
export const primaryNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/practice", label: "Amaliyot", icon: BookOpen },
  { href: "/simulation", label: "Simulyatsiya", icon: GraduationCap },
];

/** Secondary: Analytics, Learning, Achievements, Leaderboard */
export const secondaryNavigation = [
  { href: "/analytics", label: "Analitika", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/learning-path", label: "Learning Path", icon: Award },
];

/** Utility: Schools, Instructors, Profile, Settings */
export const utilityNavigation = [
  { href: "/schools", label: "Avtomaktablar", icon: Building2 },
  { href: "/instructors", label: "Instruktorlar", icon: Users },
  { href: "/profile", label: "Profil", icon: User },
  { href: "/settings", label: "Sozlamalar", icon: Settings },
];
