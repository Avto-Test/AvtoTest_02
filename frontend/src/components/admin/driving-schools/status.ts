import { AdminDrivingSchool } from '@/schemas/drivingSchool.schema';

type StatusView = {
  label: string;
  className: string;
};

export function drivingSchoolStatusView(item: AdminDrivingSchool): StatusView {
  if (item.is_active) {
    return {
      label: 'Faol',
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    };
  }
  return {
    label: 'Nofaol',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  };
}

export function schoolLeadStatusView(status: string): StatusView {
  const normalized = status.toLowerCase();
  if (normalized === 'new') {
    return { label: 'Yangi', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' };
  }
  if (normalized === 'contacted') {
    return { label: 'Aloqa qilindi', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  }
  if (normalized === 'qualified') {
    return { label: 'Tasniflandi', className: 'border-violet-500/30 bg-violet-500/10 text-violet-300' };
  }
  if (normalized === 'closed') {
    return { label: 'Yopilgan', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  }
  return { label: normalized, className: 'border-border bg-muted text-foreground' };
}

export function schoolApplicationStatusView(status: string): StatusView {
  const normalized = status.toLowerCase();
  if (normalized === 'new') {
    return { label: 'Yangi', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' };
  }
  if (normalized === 'reviewing') {
    return { label: 'Ko`rib chiqilmoqda', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  }
  if (normalized === 'approved') {
    return { label: 'Tasdiqlangan', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  }
  if (normalized === 'rejected') {
    return { label: 'Rad etilgan', className: 'border-red-500/30 bg-red-500/10 text-red-300' };
  }
  return { label: normalized, className: 'border-border bg-muted text-foreground' };
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

