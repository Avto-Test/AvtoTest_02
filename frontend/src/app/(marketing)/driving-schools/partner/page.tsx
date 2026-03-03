'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { BarChart3, CheckCircle2, Rocket, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { submitPartnerApplication } from '@/lib/drivingSchools';
import { partnerApplicationSchema } from '@/schemas/drivingSchool.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/store/useAuth';

type PartnerFormState = {
    school_name: string;
    city: string;
    responsible_person: string;
    phone: string;
    email: string;
    note: string;
};

export default function DrivingSchoolPartnerPage() {
    const router = useRouter();
    const { token } = useAuth();
    const [form, setForm] = useState<PartnerFormState>({
        school_name: '',
        city: '',
        responsible_person: '',
        phone: '',
        email: '',
        note: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!token) {
            router.push('/login?redirect=/driving-schools/partner');
            return;
        }
        const parsed = partnerApplicationSchema.safeParse({
            ...form,
            note: form.note || undefined,
        });
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message || "Ariza ma'lumotlarini tekshiring.");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitPartnerApplication(parsed.data);
            toast.success('Arizangiz qabul qilindi. Tez orada aloqaga chiqamiz.');
            setForm({
                school_name: '',
                city: '',
                responsible_person: '',
                phone: '',
                email: '',
                note: '',
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
                if (error.response?.status === 409 && detail) {
                    toast.error(detail);
                    return;
                }
                if (detail) {
                    toast.error(detail);
                    return;
                }
            }
            toast.error("Ariza yuborishda xatolik bo'ldi.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="bg-background py-12 md:py-16">
            <div className="container-app grid gap-8 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            Hamkorlik dasturi
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">AUTOTEST bilan hamkor bo&apos;ling</h1>
                        <p className="text-muted-foreground">
                            Platforma avtomaktablar uchun lead oqimini, promo/referral natijasini va o&apos;quvchi konversiyasini
                            bitta panelda ko&apos;rsatadi. Boshlang&apos;ich bosqichda joylashtirish bepul.
                        </p>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
                        <h2 className="text-lg font-semibold">Nima olasiz?</h2>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>Profilingiz orqali kelgan o&apos;quvchilar sonini real vaqtda ko&apos;rasiz.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>Biz orqali kelgan har bir o&apos;quvchini statistikada alohida kuzatasiz.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>Maxsus referral link va promo kod orqali organik o&apos;sishni tezlashtirasiz.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>Ishonchli listing: kurs, narx, media va fikrlar bir sahifada jamlanadi.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>Start bosqichida bepul joylashasiz, keyin bosqichma-bosqich monetizatsiya rejimi yoqiladi.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
                    <h2 className="text-xl font-semibold">Hamkorlik arizasi</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Formani to&apos;ldiring. Admin jamoa arizani ko&apos;rib chiqadi va siz bilan bog&apos;lanadi.
                    </p>

                    <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
                        <Input
                            placeholder="Avtomaktab nomi"
                            value={form.school_name}
                            onChange={(event) => setForm((prev) => ({ ...prev, school_name: event.target.value }))}
                        />
                        <Input
                            placeholder="Shahar"
                            value={form.city}
                            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                        />
                        <Input
                            placeholder="Mas&apos;ul shaxs"
                            value={form.responsible_person}
                            onChange={(event) => setForm((prev) => ({ ...prev, responsible_person: event.target.value }))}
                        />
                        <Input
                            placeholder="Telefon"
                            value={form.phone}
                            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                        />
                        <Input
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        />
                        <textarea
                            className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Qo&apos;shimcha izoh (ixtiyoriy)"
                            value={form.note}
                            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? 'Yuborilmoqda...' : 'Ariza yuborish'}
                        </Button>
                    </form>
                </div>
            </div>
        </section>
    );
}
