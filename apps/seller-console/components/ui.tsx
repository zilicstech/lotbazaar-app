"use client";

import type { Manifest } from "@/lib/types";
import { inr, num } from "@/lib/api";

export function Button({ variant = "primary", className = "", ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400",
    ghost: "text-slate-700 hover:bg-slate-100",
  }[variant];
  return <button {...props} className={`rounded-md px-3 py-2 text-sm font-medium ${styles} ${className}`} />;
}

const BADGE: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LISTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  SORTING: "bg-sky-50 text-sky-700 ring-sky-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  RESERVED: "bg-amber-50 text-amber-700 ring-amber-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  PAID: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  SOLD: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  DISPATCHED: "bg-slate-100 text-slate-700 ring-slate-200",
  CLOSED: "bg-slate-100 text-slate-700 ring-slate-200",
  BLOCKED: "bg-rose-50 text-rose-700 ring-rose-200",
  ARRIVED: "bg-violet-50 text-violet-700 ring-violet-200",
  SORTED: "bg-slate-100 text-slate-700 ring-slate-200",
  PAYMENT_PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  PICKING: "bg-sky-50 text-sky-700 ring-sky-200",
  PACKED: "bg-sky-50 text-sky-700 ring-sky-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  OPEN: "bg-amber-50 text-amber-700 ring-amber-200",
  COUNTERED: "bg-sky-50 text-sky-700 ring-sky-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  EXPIRED: "bg-slate-100 text-slate-500 ring-slate-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const LABEL: Record<string, string> = { PAYMENT_PENDING: "AWAITING PAYMENT" };

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[value] ?? "bg-slate-100 ring-slate-200"}`}>
      {LABEL[value] ?? value.replace("_", " ")}
    </span>
  );
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>;
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div>;
}

export function Stat({ label, value, hint, compact }: { label: string; value: React.ReactNode; hint?: string; compact?: boolean }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 whitespace-nowrap font-semibold tabular-nums ${compact ? "text-lg" : "text-2xl"}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function Mix({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div>
      <div className="label">{title}</div>
      <div className="space-y-1">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-sm">
            <div className="w-24 truncate">{k}</div>
            <div className="h-2 flex-1 rounded bg-slate-100"><div className="h-2 rounded bg-slate-700" style={{ width: `${v}%` }} /></div>
            <div className="w-10 text-right tabular-nums">{v}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const GENDER: Record<string, string> = { M: "Men", W: "Women", K: "Kids", U: "Unisex" };
const APPAREL_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

// jsonb does not keep key order, so sizes are ordered here: apparel sizes first, then numeric (waist, shoe).
function sizeRank(size: string) {
  const i = APPAREL_ORDER.indexOf(size);
  return i >= 0 ? i : 100 + (Number(size) || 0);
}

export function ManifestView({ m }: { m: Manifest }) {
  const sizeTotal = Object.values(m.sizeCurve).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat compact label="Pieces" value={num(m.pieces)} />
        <Stat compact label="Cartons" value={m.cartons} />
        <Stat compact label="Total MRP" value={inr(m.totalMrp)} />
        <Stat compact label="Avg MRP / pc" value={inr(m.avgMrp)} />
        <Stat compact label="Weight" value={`${m.weightKg} kg`} hint={`Grade ${m.grades.join(", ")}`} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Mix title="Brand mix (by pieces)" data={m.brandMix} />
        <Mix title="Category mix" data={m.categoryMix} />
        <Mix title="Gender mix" data={Object.fromEntries(Object.entries(m.genderMix).map(([k, v]) => [GENDER[k] ?? k, v]))} />
      </div>
      <div>
        <div className="label">Size curve</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(m.sizeCurve).sort(([a], [b]) => sizeRank(a) - sizeRank(b)).map(([s, n]) => (
            <div key={s} className="rounded-md border border-slate-200 px-3 py-1.5 text-center">
              <div className="text-xs text-slate-500">{s}</div>
              <div className="text-sm font-semibold tabular-nums">{n}</div>
              <div className="text-[10px] text-slate-400">{Math.round((100 * n) / sizeTotal)}%</div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-slate-500">SKUs: {m.skus.join(" · ")} — Containers: {m.containers.join(", ")}</div>
    </div>
  );
}
