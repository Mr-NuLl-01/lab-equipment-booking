import { cn } from "@/lib/utils/cn";

const styles: Record<string, string> = {
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  used: "bg-emerald-50 text-emerald-700 border-emerald-200",
  open: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  retired: "bg-slate-100 text-slate-700 border-slate-200",
  disabled: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  admin_cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  resolved: "bg-sky-50 text-sky-700 border-sky-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-sky-50 text-sky-700 border-sky-200",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[value] || "border-slate-200 bg-slate-100 text-slate-700",
      )}
    >
      {value}
    </span>
  );
}
