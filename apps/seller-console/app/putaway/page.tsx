"use client";

import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { Button, ErrorBox, Notice } from "@/components/ui";
import { api } from "@/lib/api";
import type { Carton } from "@/lib/types";

type Bin = { code: string; warehouse: string; cartons: number };

export default function PutawayPage() {
  const [waiting, setWaiting] = useState<Carton[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [lpn, setLpn] = useState("");
  const [bin, setBin] = useState("");
  const [done, setDone] = useState<Carton[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const lpnInput = useRef<HTMLInputElement>(null);
  const binInput = useRef<HTMLInputElement>(null);

  const load = () => {
    api<Carton[]>("/seller/cartons?status=SORTED").then(setWaiting).catch((e) => setError(e.message));
    api<Bin[]>("/seller/wh/bins").then(setBins).catch(() => {});
  };
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const c = await api<Carton>("/seller/wh/putaway", { method: "POST", body: { lpn, bin } });
      setDone((d) => [c, ...d].slice(0, 10));
      setNotice(`${c.lpn} shelved in ${c.bin}. It can now be put into a lot.`);
      setLpn("");
      setBin("");
      load();
      lpnInput.current?.focus();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const warehouseBins = (w: string) => bins.filter((b) => b.warehouse === w);
  return (
    <Shell title="Putaway" help={<>Step 5. Scan the carton label, then the shelf (bin) label, and press Enter. A carton can be sold only after it is on a shelf, so pickers always know where it is. A handheld barcode scanner works here: it types the code and presses Enter.</>}>
      <ErrorBox message={error} />
      <Notice message={notice} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <form onSubmit={submit} className="card space-y-3 self-start">
          <div><label className="label" htmlFor="lpn">1. Carton label (LPN)</label>
            <input id="lpn" ref={lpnInput} autoFocus required className="input font-mono uppercase" placeholder="LPN-…" value={lpn}
              onChange={(e) => setLpn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && lpn && !bin) { e.preventDefault(); binInput.current?.focus(); } }} /></div>
          <div><label className="label" htmlFor="bin">2. Bin label</label>
            <input id="bin" ref={binInput} required className="input font-mono uppercase" placeholder="A-01-01" value={bin} onChange={(e) => setBin(e.target.value)} /></div>
          <Button type="submit">Shelve carton</Button>
          {done.length > 0 && (
            <div className="border-t border-slate-200 pt-3">
              <div className="label">Just shelved</div>
              <ul className="space-y-1 text-sm">{done.map((c) => <li key={c.id} className="font-mono text-xs">{c.lpn} → {c.bin}</li>)}</ul>
            </div>
          )}
        </form>
        <div className="space-y-4">
          <div className="card overflow-x-auto p-0">
            <div className="px-4 pt-3 font-semibold">Waiting for putaway ({waiting.length})</div>
            <table className="data-table mt-2">
              <thead>
                <tr><th className="px-4 py-2">LPN</th><th>Stock type</th><th>Container</th><th>Warehouse</th><th className="px-4" /></tr>
              </thead>
              <tbody>
                {waiting.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono text-xs">{c.lpn}</td><td className="font-mono text-xs">{c.skuCode}</td>
                    <td>{c.containerRef}</td><td className="text-xs">{c.warehouse}</td>
                    <td className="px-4 text-right"><button className="text-xs text-emerald-700 hover:underline" onClick={() => { setLpn(c.lpn); binInput.current?.focus(); }}>Use</button></td>
                  </tr>
                ))}
                {waiting.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Nothing waiting. Every sorted carton is on a shelf.</td></tr>}
              </tbody>
            </table>
          </div>
          <details className="card">
            <summary className="cursor-pointer text-sm font-medium">Bin map (cartons per shelf)</summary>
            {[...new Set(bins.map((b) => b.warehouse))].map((w) => (
              <div key={w} className="mt-3">
                <div className="mb-1 text-xs text-slate-500">{w}</div>
                <div className="flex flex-wrap gap-1">
                  {warehouseBins(w).map((b) => (
                    <button key={b.code} type="button" onClick={() => setBin(b.code)}
                      className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${b.cartons ? "bg-slate-700 text-white" : "bg-slate-100"}`}>
                      {b.code}{b.cartons ? ` (${b.cartons})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </div>
      </div>
    </Shell>
  );
}
