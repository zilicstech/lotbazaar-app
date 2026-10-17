"use client";

import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Badge, Button, ErrorBox, ManifestView, Notice } from "@/components/ui";
import { api, getSession, inr, photoUrl, upload } from "@/lib/api";
import type { Carton, Lot } from "@/lib/types";

function LotPageContent() {
  const { id } = useParams<{ id: string }>();
  const [lot, setLot] = useState<Lot | null>(null);
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listing, setListing] = useState({ pricePct: "20", acceptOffers: false, offerFloorPct: "15" });
  const tenantCode = getSession()?.user.tenantCode ?? "";

  const load = useCallback(() => {
    api<Lot>(`/seller/lots/${id}`).then(setLot).catch((e) => setError(e.message));
    api<Carton[]>(`/seller/lots/${id}/cartons`).then(setCartons);
  }, [id]);
  useEffect(load, [load]);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setError(null);
    setBusy(true);
    try {
      for (const f of Array.from(files)) await upload(`/seller/lots/${id}/photos`, f);
      setNotice(`${files.length} photo(s) added.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function list(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/seller/lots/${id}/list`, { method: "POST", body: {
        pricePct: Number(listing.pricePct), acceptOffers: listing.acceptOffers,
        offerFloorPct: listing.acceptOffers ? Number(listing.offerFloorPct) : null } });
      setNotice("Listed. Approved buyers can now see and buy this lot.");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const price = lot ? Math.round((lot.totalMrp * Number(listing.pricePct)) / 100) : 0;
  const floor = lot ? Math.round((lot.totalMrp * Number(listing.offerFloorPct)) / 100) : 0;
  return (
    <Shell title={lot ? `${lot.code} — ${lot.title}` : "Lot"}
      help={lot?.status === "DRAFT"
        ? <>Step 7. Add a few photos (open cartons, tags, a sample piece), then set the price as a % of total MRP and list it. Buyers compare lots by &quot;% of MRP&quot;.</>
        : <>The manifest below is exactly what the buyer sees. It is calculated from the cartons, so it cannot be mistyped.</>}>
      <ErrorBox message={error} />
      <Notice message={notice} />
      {lot && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge value={lot.status} />
            {lot.priceAmount != null && <span>Buy Now <b>{inr(lot.priceAmount)}</b> ({lot.pricePct}% of MRP)</span>}
            {lot.acceptOffers && <span>· Offers from <b>{inr(lot.offerFloorAmount)}</b> ({lot.offerFloorPct}%)</span>}
          </div>
          {lot.description && <p className="text-sm text-slate-700">{lot.description}</p>}

          <section className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Photos ({lot.photos.length}/8)</h2>
              {lot.photos.length < 8 && lot.status !== "SOLD" && (
                <label className={`cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium ${busy ? "opacity-50" : "hover:bg-slate-50"}`}>
                  {busy ? "Uploading…" : "Add photos"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy}
                    onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {lot.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={photoUrl(tenantCode, p)} alt={`${lot.title} photo`} className="h-32 w-32 rounded-md border border-slate-200 object-cover" />
              ))}
              {lot.photos.length === 0 && <p className="text-sm text-slate-500">No photos yet. Lots with photos sell faster.</p>}
            </div>
          </section>

          {lot.status === "DRAFT" && (
            <form onSubmit={list} className="card space-y-3">
              <h2 className="font-semibold">Put on sale</h2>
              <div className="flex flex-wrap items-end gap-4">
                <div><label className="label" htmlFor="pct">Buy Now price (% of MRP)</label>
                  <input id="pct" type="number" min="1" max="95" step="0.5" className="input w-28" value={listing.pricePct} onChange={(e) => setListing({ ...listing, pricePct: e.target.value })} /></div>
                <div className="pb-2 text-sm">= <b>{inr(price)}</b> + GST <span className="text-slate-500">(total MRP {inr(lot.totalMrp)})</span></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={listing.acceptOffers} onChange={(e) => setListing({ ...listing, acceptOffers: e.target.checked })} />
                Also accept offers (buyers can propose a lower price; you accept, counter or reject)
              </label>
              {listing.acceptOffers && (
                <div className="flex flex-wrap items-end gap-4">
                  <div><label className="label" htmlFor="floor">Lowest offer allowed (% of MRP)</label>
                    <input id="floor" type="number" min="1" max="94" step="0.5" className="input w-28" value={listing.offerFloorPct} onChange={(e) => setListing({ ...listing, offerFloorPct: e.target.value })} /></div>
                  <div className="pb-2 text-sm">= {inr(floor)}. Lower offers are refused automatically.</div>
                </div>
              )}
              <Button type="submit">List for sale</Button>
            </form>
          )}

          <div className="card"><ManifestView m={lot.manifest} /></div>
          <div className="card overflow-x-auto p-0">
            <table className="data-table">
              <thead>
                <tr><th className="px-4 py-3">LPN</th><th>Stock type</th><th>Container</th><th>Bin</th><th className="text-right">Pieces</th><th className="text-right">MRP</th><th className="px-4">Status</th></tr>
              </thead>
              <tbody>
                {cartons.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono text-xs">{c.lpn}</td><td className="font-mono text-xs">{c.skuCode}</td><td>{c.containerRef}</td>
                    <td className="font-mono text-xs">{c.bin}</td>
                    <td className="text-right tabular-nums">{c.pieceCount}</td><td className="text-right tabular-nums">{inr(c.totalMrp)}</td>
                    <td className="px-4"><Badge value={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}

// useParams needs a Suspense boundary under cacheComponents.
export default function LotPage() {
  return (
    <Suspense>
      <LotPageContent />
    </Suspense>
  );
}
