'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    createQuestionCategory,
    deleteQuestionCategory,
    getErrorMessage,
    getQuestionCategories,
    updateQuestionCategory,
} from '@/lib/admin';
import {
    AdminQuestionCategory,
    questionCategoryFormSchema,
    QuestionCategoryFormData,
} from '@/schemas/admin.schema';

export default function AdminQuestionCategoriesPage() {
    const [categories, setCategories] = useState<AdminQuestionCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingCategory, setEditingCategory] = useState<AdminQuestionCategory | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<AdminQuestionCategory | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm<QuestionCategoryFormData>({
        resolver: zodResolver(questionCategoryFormSchema),
        defaultValues: {
            name: '',
            description: '',
            is_active: true,
        },
    });

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            const data = await getQuestionCategories();
            setCategories(data);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadCategories();
    }, []);

    const openCreateForm = () => {
        setEditingCategory(null);
        form.reset({ name: '', description: '', is_active: true });
        setShowForm(true);
    };

    const openEditForm = (category: AdminQuestionCategory) => {
        setEditingCategory(category);
        form.reset({
            name: category.name,
            description: category.description || '',
            is_active: category.is_active,
        });
        setShowForm(true);
    };

    const onSubmit = async (data: QuestionCategoryFormData) => {
        setIsSubmitting(true);
        try {
            if (editingCategory) {
                await updateQuestionCategory(editingCategory.id, data);
            } else {
                await createQuestionCategory(data);
            }
            setShowForm(false);
            setEditingCategory(null);
            await loadCategories();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;
        setIsDeleting(true);
        try {
            await deleteQuestionCategory(categoryToDelete.id);
            setDeleteDialogOpen(false);
            setCategoryToDelete(null);
            await loadCategories();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsDeleting(false);
        }
    };

    const columns: Column<AdminQuestionCategory>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (category) => (
                <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-1">{category.description}</p>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            className: 'w-28',
            render: (category) => (
                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            className: 'w-40 text-right',
            render: (category) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(category)}>
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                            setCategoryToDelete(category);
                            setDeleteDialogOpen(true);
                        }}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Question Categories"
            description="Create and manage categories used by adaptive question distribution."
            actions={
                <Button onClick={openCreateForm}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Category
                </Button>
            }
        >
            {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                </div>
            )}

            {showForm ? (
                <div className="mb-6 rounded-lg border border-border bg-card p-4">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Category Name</Label>
                            <Input id="name" placeholder="Road signs" {...form.register('name')} />
                            {form.formState.errors.name ? (
                                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Optional note for admins"
                                {...form.register('description')}
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" {...form.register('is_active')} />
                            Active
                        </label>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : editingCategory ? 'Save' : 'Create'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingCategory(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            ) : null}

            <DataTable
                columns={columns}
                data={categories}
                isLoading={isLoading}
                rowKey={(category) => category.id}
                emptyState={
                    <div className="text-center py-8">
                        <h3 className="text-lg font-medium mb-2">No categories yet</h3>
                        <p className="text-muted-foreground mb-4">Create categories to distribute adaptive tests equally.</p>
                        <Button onClick={openCreateForm}>Add Category</Button>
                    </div>
                }
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete category"
                description={`Delete "${categoryToDelete?.name || ''}"? Questions will remain but category link will be removed.`}
                confirmText="Delete"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDeleteConfirm}
            />
        </AdminLayout>
    );
}

