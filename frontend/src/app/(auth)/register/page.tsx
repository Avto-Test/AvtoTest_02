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
import { Loader2, CheckCircle2, ChevronLeft, Eye, EyeOff } from "lucide-react";

const registerSchema = z.object({
    email: z.string().email("Yaroqli email manzil kiriting"),
    password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Parollar mos emas",
    path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { user, token, setToken, fetchUser, hydrated } = useAuth();
    const next = searchParams.get("next") || "/dashboard";

    useEffect(() => {
        if (hydrated && user && token) {
            router.replace(next);
        }
    }, [hydrated, user, token, router, next]);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true);
        setRegisteredEmail(data.email);
        try {
            const response = await api.post("/auth/register", {
                email: data.email,
                password: data.password,
            });

            if (response.data.access_token) {
                setToken(response.data.access_token);
                await fetchUser();
                toast.success("Akkount muvaffaqiyatli yaratildi!");
                router.push(next);
                return;
            }

            setIsSuccess(true);
            toast.success(response.data.message || "Akkount yaratildi. Emailingizni tekshiring.");
        } catch (error: unknown) {
            console.error("Registration failed:", error);
            let message = "Royxatdan otishda xatolik yuz berdi.";
            if (typeof error === "object" && error !== null && "response" in error) {
                const response = (error as { response?: { data?: { detail?: string } } }).response;
                if (typeof response?.data?.detail === "string" && response.data.detail.length > 0) {
                    message = response.data.detail;
                }
            }
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!hydrated) return null;
    if (user && token) return null;

    if (isSuccess) {
        return (
            <div className="animate-in zoom-in rounded-2xl border border-border bg-card p-8 text-center text-foreground shadow-sm duration-300">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00B37E]/10">
                        <CheckCircle2 className="h-8 w-8 text-[#00B37E]" />
                    </div>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Emailingizni tekshiring</h2>
                <p className="mb-8 text-muted-foreground">
                    Tasdiqlash havolasi <span className="font-semibold text-foreground">{registeredEmail}</span> manziliga yuborildi.
                    Kirish qutingizni (spam bolimini ham) tekshiring.
                </p>
                <Button
                    asChild
                    variant="outline"
                    className="h-11 w-full rounded-xl border-border font-semibold text-foreground hover:bg-muted"
                >
                    <Link href="/login" className="flex items-center justify-center gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Kirish sahifasiga qaytish
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="animate-in slide-in-from-bottom-4 rounded-2xl border border-border bg-card p-8 text-foreground shadow-sm duration-500">
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
                    <Label htmlFor="password">Parol</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Yangi parol kiriting"
                            autoComplete="new-password"
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

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Parolni tasdiqlang</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Parolni qayta kiriting"
                            autoComplete="new-password"
                            className="h-11 rounded-xl pr-11 focus-visible:ring-[#00B37E]"
                            {...form.register("confirmPassword")}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            aria-label={showConfirmPassword ? "Parolni yashirish" : "Parolni korsatish"}
                            aria-pressed={showConfirmPassword}
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            disabled={isLoading}
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 transition-all duration-200 ease-out rotate-0 scale-100" />
                            ) : (
                                <Eye className="h-4 w-4 transition-all duration-200 ease-out -rotate-6 scale-90" />
                            )}
                        </button>
                    </div>
                    {form.formState.errors.confirmPassword && (
                        <p className="text-sm font-medium text-red-500">
                            {form.formState.errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="mt-2 h-11 w-full rounded-xl bg-[#00B37E] font-semibold text-white transition-all hover:bg-[#009468]"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Yaratilmoqda...</span>
                        </div>
                    ) : (
                        "Akkount yaratish"
                    )}
                </Button>

                <p className="px-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                    Royxatdan otish orqali siz bizning{" "}
                    <Link href="/terms" className="underline hover:text-foreground">Foydalanish shartlari</Link> va{" "}
                    <Link href="/privacy" className="underline hover:text-foreground">Maxfiylik siyosati</Link>ga rozilik bildirasiz.
                </p>
            </form>

            <div className="mt-8 border-t pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                    Akkountingiz bormi?{" "}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Kirish
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={null}>
            <RegisterPageContent />
        </Suspense>
    );
}
