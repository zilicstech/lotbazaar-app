"use client";

import type { Manifest } from "@/lib/types";
import { inr, num } from "@/lib/api";

export function Button({ variant = "primary", size = "md", className = "", ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const styles = {
    primary: "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 disabled:bg-emerald-300",
    secondary: "border border-slate-300 bg-white text-slate-800 shadow-xs hover:bg-slate-50 disabled:text-slate-400",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300",
    danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:text-rose-300",
  }[variant];
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" }[size];
  return <button {...props} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed ${sizes} ${styles} ${className}`} />;
}

const TONE = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  gray: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const BADGE: Record<string, keyof typeof TONE> = {
  AVAILABLE: "green", LISTED: "green", APPROVED: "green", DELIVERED: "green", ACCEPTED: "green", RESOLVED: "green",
  SORTING: "sky", PICKING: "sky", COUNTERED: "sky", PACKED: "violet", ARRIVED: "violet",
  RESERVED: "amber", PENDING: "amber", PAYMENT_PENDING: "amber", OPEN: "amber",
  PAID: "blue", SOLD: "blue", DISPATCHED: "blue",
  BLOCKED: "red", CANCELLED: "red", REJECTED: "red",
  DRAFT: "gray", CLOSED: "gray", SORTED: "gray", EXPIRED: "gray",
};

const LABEL: Record<string, string> = { PAYMENT_PENDING: "Awaiting payment" };

/** Human label for a status code, e.g. PAYMENT_PENDING -> "Awaiting payment". */
export const statusLabel = (v: string) => LABEL[v] ?? v.charAt(0) + v.slice(1).toLowerCase().replaceAll("_", " ");

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[BADGE[value] ?? "gray"]}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {statusLabel(value)}
    </span>
  );
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{message}</div>;
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{message}</div>;
}

export function Stat({ label, value, hint, compact, tone }: { label: string; value: React.ReactNode; hint?: string; compact?: boolean; tone?: "warn" | "good" }) {
  return (
    <div className="card !p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 whitespace-nowrap font-semibold tabular-nums tracking-tight ${compact ? "text-lg" : "text-2xl"} ${tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-slate-900"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** Two-way toggle used for view switches, e.g. "By stock type | By carton". */
export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: [V, string][]; onChange: (v: V) => void }) {
  return (
    <div role="radiogroup" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm shadow-xs">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1.5 font-medium transition ${value === v ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>
      ))}
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
            <div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${v}%` }} /></div>
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
