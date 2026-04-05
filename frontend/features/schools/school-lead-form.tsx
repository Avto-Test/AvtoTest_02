"use client";

import { useEffect, useState } from "react";

import { createSchoolLead } from "@/api/schools";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

export function SchoolLeadForm({
  slug,
  categories,
}: {
  slug: string;
  categories: string[];
}) {
  const { user } = useUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedCategory, setRequestedCategory] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.full_name) {
      setFullName((value) => value || user.full_name || "");
    }
  }, [user?.full_name]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createSchoolLead(slug, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        requested_category: requestedCategory || undefined,
        comment: comment.trim() || undefined,
      });
      setSuccess("So'rovingiz yuborildi. Avtomaktab siz bilan bog'lanadi.");
      setPhone("");
      setRequestedCategory("");
      setComment("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "So'rov yuborilmadi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Input
        placeholder="Ism va familiya"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        required
      />
      <Input
        placeholder="Telefon raqam"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        required
      />
      <Select value={requestedCategory} onChange={(event) => setRequestedCategory(event.target.value)}>
        <option value="">Kategoriya tanlang</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>
      <Textarea
        placeholder="Savol, qulay vaqt yoki izoh qoldiring"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        className="min-h-[110px]"
      />
      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Yuborilmoqda..." : "Ariza qoldirish"}
      </Button>
    </form>
  );
}
