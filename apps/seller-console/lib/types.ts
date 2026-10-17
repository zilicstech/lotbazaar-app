export type Option = { id: string; code: string; name: string };
export type Masters = { brands: Option[]; categories: Option[]; warehouses: Option[]; grades: string[]; genders: string[] };
export type Container = {
  id: string; ref: string; supplier: string; warehouse: string; landedCost: number | null; status: string;
  receivedAt: string; cartons: number; pieces: number; totalMrp: number | null; expectedPieces: number | null;
  expectedKg: number | null; actualBales: number | null; actualKg: number | null; checkedAt: string | null;
  sortedAt: string | null; unshelvedCartons: number; sortedKg: number;
};
export type Carton = {
  id: string; lpn: string; containerRef: string; skuCode: string; brand: string; category: string; gender: string;
  grade: string; mrpBand: string; pieceCount: number; weightG: number; totalMrp: number; sizeTally: string;
  status: string; lotId: string | null; warehouse: string; bin: string | null; createdAt: string;
};
export type Manifest = {
  cartons: number; pieces: number; totalMrp: number; avgMrp: number; weightKg: number; grades: string[];
  brandMix: Record<string, number>; categoryMix: Record<string, number>; genderMix: Record<string, number>;
  sizeCurve: Record<string, number>; skus: string[]; containers: string[]; lpns: string[];
};
export type Lot = {
  id: string; code: string; title: string; status: string; manifest: Manifest; pieceCount: number; totalMrp: number;
  pricePct: number | null; priceAmount: number | null; createdAt: string; listedAt: string | null;
  description: string | null; acceptOffers: boolean; offerFloorPct: number | null; offerFloorAmount: number | null;
  photos: string[];
};
export type Order = {
  id: string; orderNo: string; lotId: string; lotCode: string; lotTitle: string; pieceCount: number; amount: number;
  status: string; createdAt: string; dispatchedAt: string | null; buyerName: string; buyerBusiness: string;
  buyerCity: string; buyerGstin: string; source: string; holdExpiresAt: string | null; gstRate: number; cgst: number;
  sgst: number; igst: number; total: number; paidAt: string | null; packedAt: string | null; dispatchKg: number | null;
  transporter: string | null; vehicleNo: string | null; deliveredAt: string | null; closedAt: string | null;
  invoiceNo: string | null; claimStatus: string | null;
};
export type Buyer = {
  id: string; name: string; email: string; businessName: string; gstin: string; city: string; status: string; createdAt: string;
};
export type Offer = {
  id: string; lotId: string; lotCode: string; lotTitle: string; lotTotalMrp: number; lotPriceAmount: number;
  amount: number; counterAmount: number | null; status: string; note: string | null; orderId: string | null;
  buyerName: string; buyerBusiness: string; buyerCity: string; createdAt: string; updatedAt: string;
  orderStatus: string | null;
};
export type WorkOrder = {
  id: string; orderNo: string; lotCode: string; lotTitle: string; pieceCount: number; cartons: number; picked: number;
  status: string; buyerBusiness: string; buyerCity: string; warehouse: string; paidAt: string | null;
  packedAt: string | null; dispatchedAt: string | null; expectedKg: number; dispatchKg: number | null;
  transporter: string | null; vehicleNo: string | null; invoiceNo: string | null;
};
export type PickLine = { lpn: string; skuCode: string; pieceCount: number; weightKg: number; bin: string | null; picked: boolean };
export type Claim = {
  id: string; orderId: string; orderNo: string; lotCode: string; lotTitle: string; orderTotal: number; type: string;
  pieces: number; note: string; status: string; creditAmount: number | null; resolutionNote: string | null;
  buyerBusiness: string; buyerCity: string; createdAt: string; resolvedAt: string | null;
};
export type Invoice = {
  invoiceNo: string; issuedAt: string; irn: string; ewayBillNo: string | null; sellerName: string; sellerGstin: string;
  sellerWarehouse: string; sellerState: string; buyerName: string; buyerBusiness: string; buyerGstin: string;
  buyerCity: string; orderNo: string; lotCode: string; lotTitle: string; pieceCount: number; hsn: string;
  taxable: number; gstRate: number; cgst: number; sgst: number; igst: number; total: number;
  transporter: string; vehicleNo: string;
};
