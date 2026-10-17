"use client";

import JsBarcode from "jsbarcode";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Carton } from "@/lib/types";

const GENDER: Record<string, string> = { M: "MEN", W: "WOMEN", K: "KIDS", U: "UNISEX" };

function Label({ c }: { c: Carton }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svg.current) JsBarcode(svg.current, c.lpn, { format: "CODE128", height: 48, width: 2, fontSize: 14, margin: 0 });
  }, [c.lpn]);
  const sizes = Object.entries(JSON.parse(c.sizeTally) as Record<string, number>).map(([s, n]) => `${s}:${n}`).join(" ");
  return (
    <div className="label-100x50 flex flex-col justify-between rounded border border-slate-400 bg-white p-2 text-black">
      <div className="flex items-start justify-between text-[11px] font-semibold">
        <span>{c.brand} · {GENDER[c.gender] ?? c.gender} · {c.category}</span>
        <span className="rounded border border-black px-1">GRADE {c.grade}</span>
      </div>
      <svg ref={svg} role="img" aria-label={`Barcode ${c.lpn}`} />
      <div className="flex justify-between text-[10px]">
        <span className="font-mono">{c.skuCode}</span>
        <span>{c.pieceCount} pcs · {(c.weightG / 1000).toFixed(1)} kg</span>
      </div>
      <div className="truncate text-[9px] text-slate-600">{sizes} · {c.containerRef}</div>
    </div>
  );
}

function LabelsContent() {
  const { containerId } = useParams<{ containerId: string }>();
  const only = useSearchParams().get("lpn");
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Carton[]>(`/seller/containers/${containerId}/cartons`)
      .then((all) => setCartons(only ? all.filter((c) => c.lpn === only) : all))
      .catch((e) => setError(e.message));
  }, [containerId, only]);

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <h1 className="text-lg font-semibold">Carton labels (100 × 50 mm)</h1>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => window.print()}>Print</button>
        <span className="text-sm text-slate-500">{cartons.length} label(s). Stick one on each carton; the barcode is the carton&apos;s ID everywhere.</span>
      </div>
      {error && <p className="text-rose-700">{error}</p>}
      <div className="flex flex-wrap gap-3 print:gap-0">
        {cartons.map((c) => <Label key={c.id} c={c} />)}
      </div>
    </div>
  );
}

export default function LabelsPage() {
  return <Suspense><LabelsContent /></Suspense>;
}
