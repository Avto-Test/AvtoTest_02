import { DrivingInstructorAdmin } from '@/schemas/drivingInstructor.schema';

type StatusView = {
  label: string;
  className: string;
};

export function instructorStatusView(item: DrivingInstructorAdmin): StatusView {
  if (item.is_blocked) {
    return {
      label: 'Bloklangan',
      className: 'border-red-500/30 bg-red-500/10 text-red-300',
    };
  }
  if (item.is_active && item.is_verified) {
    return {
      label: 'Faol',
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
  }
  return {
    label: 'Noaktiv',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  };
}

export function leadStatusView(status: string): StatusView {
  const normalized = status.toLowerCase();
  if (normalized === 'new') {
    return { label: 'Yangi', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' };
  }
  if (normalized === 'contacted') {
    return { label: 'Aloqa qilindi', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  }
  if (normalized === 'closed') {
    return { label: 'Yopilgan', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  }
  return { label: normalized, className: 'border-border bg-muted text-foreground' };
}

export function applicationStatusView(status: string): StatusView {
  const normalized = status.toLowerCase();
  if (normalized === 'pending') {
    return { label: 'Kutilmoqda', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  }
  if (normalized === 'approved') {
    return { label: 'Tasdiqlangan', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  }
  if (normalized === 'rejected') {
    return { label: 'Rad etilgan', className: 'border-red-500/30 bg-red-500/10 text-red-300' };
  }
  return { label: normalized, className: 'border-border bg-muted text-foreground' };
}

export function complaintStatusView(status: string): StatusView {
  const normalized = status.toLowerCase();
  if (normalized === 'new') {
    return { label: 'Yangi', className: 'border-red-500/30 bg-red-500/10 text-red-300' };
  }
  if (normalized === 'reviewing') {
    return { label: 'Tekshiruvda', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  }
  if (normalized === 'resolved') {
    return { label: 'Hal qilingan', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  }
  if (normalized === 'rejected') {
    return { label: 'Rad etilgan', className: 'border-slate-500/30 bg-slate-500/10 text-slate-300' };
  }
  return { label: normalized, className: 'border-border bg-muted text-foreground' };
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

