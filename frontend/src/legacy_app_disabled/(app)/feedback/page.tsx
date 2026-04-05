'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/common/LoadingButton';
import { useI18n } from '@/components/i18n-provider';
import { getErrorMessage } from '@/lib/api';
import { getMyFeedback, submitFeedback } from '@/lib/feedback';
import {
    FeedbackCreateFormData,
    FeedbackItem,
    feedbackCreateSchema,
} from '@/schemas/feedback.schema';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const normalized = status.toLowerCase();
    if (normalized === 'resolved') return 'default';
    if (normalized === 'rejected') return 'destructive';
    if (normalized === 'reviewed' || normalized === 'planned') return 'secondary';
    return 'outline';
}

export default function FeedbackPage() {
    const { t } = useI18n();
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FeedbackCreateFormData>({
        resolver: zodResolver(feedbackCreateSchema),
        defaultValues: {
            rating: 5,
            comment: '',
        },
    });

    const currentRating = form.watch('rating');
    const lockedRating = useMemo(() => {
        if (items.length === 0) return null;
        const oldest = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
        return typeof oldest?.rating === 'number' ? oldest.rating : null;
    }, [items]);
    const hasRated = lockedRating !== null;

    const loadMyFeedback = async () => {
        setIsLoading(true);
        try {
            const data = await getMyFeedback();
            setItems(data);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMyFeedback();
    }, []);

    useEffect(() => {
        if (hasRated && lockedRating !== null) {
            form.setValue('rating', lockedRating, { shouldValidate: true });
        }
    }, [form, hasRated, lockedRating]);

    const onSubmit = async (values: FeedbackCreateFormData) => {
        setIsSubmitting(true);
        try {
            const created = await submitFeedback({
                ...values,
                rating: hasRated && lockedRating !== null ? lockedRating : values.rating,
            });
            setItems((prev) => [created, ...prev]);
            const nextRating = hasRated && lockedRating !== null ? lockedRating : created.rating;
            form.reset({
                rating: nextRating,
                comment: '',
            });
            toast.success(t("feedback.sent_ok"));
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("feedback.title")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t("feedback.subtitle")}
                </p>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle>{t("feedback.form_title")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {!hasRated ? (
                            <div className="space-y-2">
                                <Label>{t("feedback.rating_label")}</Label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className="p-1"
                                            onClick={() => form.setValue("rating", value, { shouldValidate: true })}
                                        >
                                            <Star
                                                className={`h-7 w-7 ${value <= currentRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                                            />
                                        </button>
                                    ))}
                                    <span className="ml-2 text-sm text-muted-foreground">{currentRating}/5</span>
                                </div>
                                {form.formState.errors.rating ? (
                                    <p className="text-xs text-destructive">{form.formState.errors.rating.message}</p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="comment">{t("feedback.comment_label")}</Label>
                            <textarea
                                id="comment"
                                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder={t("feedback.comment_placeholder")}
                                {...form.register('comment')}
                            />
                            {form.formState.errors.comment ? (
                                <p className="text-xs text-destructive">{form.formState.errors.comment.message}</p>
                            ) : null}
                        </div>

                        <LoadingButton type="submit" isLoading={isSubmitting}>
                            {t("feedback.submit")}
                        </LoadingButton>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("feedback.history_title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">{t("feedback.loading", "Loading...")}</p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("feedback.no_items")}</p>
                    ) : (
                        items.map((item) => (
                            <article key={item.id} className="rounded-lg border bg-card p-4">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">{item.rating}/5</Badge>
                                    <Badge variant={statusBadgeVariant(item.status)}>
                                        {item.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-foreground">{item.comment}</p>
                                {item.admin_note ? (
                                    <p className="mt-2 text-xs text-primary">
                                        {t("feedback.admin_note")}: {item.admin_note}
                                    </p>
                                ) : null}
                            </article>
                        ))
                    )}
                </CardContent>
            </Card>

            <div className="flex gap-2">
                <Button variant="outline" onClick={loadMyFeedback}>
                    {t("feedback.refresh", "Refresh")}
                </Button>
            </div>
        </div>
    );
}
