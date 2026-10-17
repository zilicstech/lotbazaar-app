"use client";

import type { Invoice } from "@/lib/types";

const STATES: Record<string, string> = {
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "24": "Gujarat", "27": "Maharashtra", "29": "Karnataka",
  "32": "Kerala", "33": "Tamil Nadu", "36": "Telangana", "19": "West Bengal",
};
const money = (v: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function twoDigits(n: number) { return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim(); }
function threeDigits(n: number) {
  const h = Math.floor(n / 100);
  return [h ? `${ONES[h]} Hundred` : "", twoDigits(n % 100)].filter(Boolean).join(" ");
}
/** Indian numbering: crore, lakh, thousand. */
export function rupeesInWords(amount: number) {
  let n = Math.round(amount);
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  for (const [size, name] of [[10_000_000, "Crore"], [100_000, "Lakh"], [1000, "Thousand"]] as const) {
    const q = Math.floor(n / size);
    if (q) parts.push(`${twoDigits(q) || threeDigits(q)} ${name}`);
    n %= size;
  }
  if (n) parts.push(threeDigits(n));
  return `${parts.join(" ")} Rupees Only`;
}

export default function InvoiceView({ inv }: { inv: Invoice }) {
  const sellerState = STATES[inv.sellerState] ?? inv.sellerState;
  const buyerStateCode = inv.buyerGstin.slice(0, 2);
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-black shadow print:shadow-none">
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <div className="text-lg font-bold">{inv.sellerName}</div>
          <div>{inv.sellerWarehouse}, {sellerState}</div>
          <div>GSTIN: <span className="font-mono">{inv.sellerGstin}</span></div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">TAX INVOICE</div>
          <div>No. <span className="font-mono">{inv.invoiceNo}</span></div>
          <div>Date: {new Date(inv.issuedAt).toLocaleDateString("en-IN")}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-b border-slate-300 py-3">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Bill to / Ship to</div>
          <div className="font-semibold">{inv.buyerBusiness}</div>
          <div>{inv.buyerName}, {inv.buyerCity}</div>
          <div>GSTIN: <span className="font-mono">{inv.buyerGstin}</span></div>
          <div>Place of supply: {STATES[buyerStateCode] ?? buyerStateCode} ({buyerStateCode})</div>
        </div>
        <div className="text-right">
          <div>Order: <span className="font-mono">{inv.orderNo}</span></div>
          <div>Transporter: {inv.transporter} · {inv.vehicleNo}</div>
          <div>E-way bill: <span className="font-mono">{inv.ewayBillNo ?? "not required (≤ ₹50,000)"}</span></div>
        </div>
      </div>
      <table className="my-3 w-full border-collapse">
        <thead><tr className="border-b border-black text-left text-xs uppercase">
          <th className="py-1">Description</th><th>HSN</th><th className="text-right">Qty</th><th className="text-right">Taxable value (₹)</th></tr></thead>
        <tbody>
          <tr className="border-b border-slate-200 align-top">
            <td className="py-2"><div className="font-medium">{inv.lotTitle}</div><div className="text-xs">Stock lot {inv.lotCode}, assorted readymade garments</div></td>
            <td className="font-mono">{inv.hsn}</td><td className="text-right">{inv.pieceCount} pcs</td><td className="text-right">{money(inv.taxable)}</td>
          </tr>
        </tbody>
      </table>
      <div className="ml-auto w-72 space-y-1">
        <div className="flex justify-between"><span>Taxable value</span><span>{money(inv.taxable)}</span></div>
        {inv.igst > 0
          ? <div className="flex justify-between"><span>IGST @ {inv.gstRate}%</span><span>{money(inv.igst)}</span></div>
          : <>
              <div className="flex justify-between"><span>CGST @ {inv.gstRate / 2}%</span><span>{money(inv.cgst)}</span></div>
              <div className="flex justify-between"><span>SGST @ {inv.gstRate / 2}%</span><span>{money(inv.sgst)}</span></div>
            </>}
        <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold"><span>Total</span><span>₹ {money(inv.total)}</span></div>
      </div>
      <div className="mt-2 text-xs">Amount in words: <b>{rupeesInWords(inv.total)}</b></div>
      <div className="mt-6 break-all border-t border-slate-300 pt-2 text-[10px] text-slate-600">
        IRN: <span className="font-mono">{inv.irn}</span><br />
        Demo invoice: IRN and e-way bill numbers are simulated, not registered with the GST portal.
      </div>
    </div>
  );
}
