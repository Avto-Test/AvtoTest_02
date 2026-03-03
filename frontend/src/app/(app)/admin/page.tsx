'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getQuestionCategories, getQuestions } from '@/lib/admin';
import { AdminQuestion, AdminQuestionCategory } from '@/schemas/admin.schema';

export default function AdminDashboardPage() {
    const [questions, setQuestions] = useState<AdminQuestion[]>([]);
    const [categories, setCategories] = useState<AdminQuestionCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [questionsData, categoriesData] = await Promise.all([
                    getQuestions(),
                    getQuestionCategories(),
                ]);
                setQuestions(questionsData);
                setCategories(categoriesData);
            } catch (error) {
                console.error('Failed to load admin data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        void loadData();
    }, []);

    const activeCategories = categories.filter((category) => category.is_active).length;

    return (
        <AdminLayout
            title="Dashboard"
            description="Overview of question-bank based adaptive testing system"
        >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : questions.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Adaptive pool size</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Question Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : categories.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">{activeCategories} active</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Uncategorized Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? '...' : questions.filter((question) => !question.category_id).length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Need category mapping</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href="/admin/question-categories">Manage Categories</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/admin/questions">Manage Question Bank</Link>
                    </Button>
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
