'use client';

import { useAuthStore } from '@/store/auth';
import { Bell, Search, User, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
    const user = useAuthStore(state => state.user);

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-md"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="relative w-full max-w-md md:flex hidden">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search tests, history..."
                        className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <LanguageSwitcher />
                <ThemeToggle />
                <button className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-destructive"></span>
                </button>

                <div className="h-6 w-px bg-border mx-1 md:mx-2"></div>

                <div className="flex items-center gap-2 md:gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium leading-none">{user?.full_name || user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                            {user?.is_admin ? 'Administrator' : (user?.is_premium ? 'Premium Member' : 'Free Plan')}
                        </p>
                    </div>
                    <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                        <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                </div>
            </div>
        </header>
    );
}
