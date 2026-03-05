"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/store/useAuth";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email("Yaroqli email manzil kiriting"),
    password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { user, token, setToken, fetchUser, hydrated } = useAuth();
    const next = searchParams.get("next") || searchParams.get("from") || "/dashboard";

    useEffect(() => {
        if (hydrated && user && token) {
            router.replace(next);
        }
    }, [hydrated, user, token, router, next]);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        try {
            const response = await api.post("/auth/login", data);
            const { access_token } = response.data;

            setToken(access_token);
            await fetchUser();

            toast.success("Xush kelibsiz!");
            router.push(next);
        } catch (error: unknown) {
            console.error("Login failed:", error);
            let message = "Email yoki parol noto'g'ri";
            if (typeof error === "object" && error !== null && "response" in error) {
                const response = (error as { response?: { data?: { detail?: string } } }).response;
                if (typeof response?.data?.detail === "string" && response.data.detail.length > 0) {
                    message = response.data.detail;
                }
            }
            if (message.toLowerCase().includes("not verified")) {
                if (typeof window !== "undefined") {
                    sessionStorage.setItem("verify_email", data.email);
                }
                toast.error("Email tasdiqlanmagan. Kodni kiriting.");
                router.push("/verify");
                return;
            }
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!hydrated) return null;
    if (user && token) return null;

    return (
        <div className="rounded-2xl border border-border bg-card p-8 text-foreground shadow-sm">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="siz@example.com"
                        autoComplete="email"
                        className="h-11 rounded-xl focus-visible:ring-[#00B37E]"
                        {...form.register("email")}
                        disabled={isLoading}
                    />
                    {form.formState.errors.email && (
                        <p className="text-sm font-medium text-red-500">
                            {form.formState.errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Parol</Label>
                        <Link
                            href="/forgot-password"
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            Parolni unutdingizmi?
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Parolingizni kiriting"
                            autoComplete="current-password"
                            className="h-11 rounded-xl pr-11 focus-visible:ring-[#00B37E]"
                            {...form.register("password")}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            aria-label={showPassword ? "Parolni yashirish" : "Parolni korsatish"}
                            aria-pressed={showPassword}
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            disabled={isLoading}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4 transition-all duration-200 ease-out rotate-0 scale-100" />
                            ) : (
                                <Eye className="h-4 w-4 transition-all duration-200 ease-out -rotate-6 scale-90" />
                            )}
                        </button>
                    </div>
                    {form.formState.errors.password && (
                        <p className="text-sm font-medium text-red-500">
                            {form.formState.errors.password.message}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-[#00B37E] font-semibold text-white transition-all hover:bg-[#009468]"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Kirilmoqda...</span>
                        </div>
                    ) : (
                        "Kirish"
                    )}
                </Button>
            </form>

            <div className="mt-8 border-t pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                    Akkountingiz yoqmi?{" "}
                    <Link href="/register" className="font-semibold text-primary hover:underline">
                        Royxatdan otish
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginPageContent />
        </Suspense>
    );
}
