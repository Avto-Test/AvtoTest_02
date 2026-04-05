"use client";

import { useEffect, useState } from "react";

import { createInstructorLead } from "@/api/instructors";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

export function InstructorLeadForm({
  slug,
}: {
  slug: string;
}) {
  const { user } = useUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedTransmission, setRequestedTransmission] = useState("");
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
      await createInstructorLead(slug, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        requested_transmission: requestedTransmission || undefined,
        comment: comment.trim() || undefined,
      });
      setSuccess("So'rovingiz yuborildi. Instruktor tez orada bog'lanadi.");
      setPhone("");
      setRequestedTransmission("");
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
      <Select value={requestedTransmission} onChange={(event) => setRequestedTransmission(event.target.value)}>
        <option value="">Uzatma turi</option>
        <option value="automatic">Avtomat</option>
        <option value="manual">Mexanika</option>
      </Select>
      <Textarea
        placeholder="Qaysi vaqtda dars boshlamoqchisiz yoki izoh qoldiring"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        className="min-h-[110px]"
      />
      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Yuborilmoqda..." : "Dars uchun ariza qoldirish"}
      </Button>
    </form>
  );
}
