export interface MarkVariant {
  id: string;
  title: string;
  /** @deprecated kept for backward compatibility; replaced by mainImageDataUrl */
  imageDataUrl?: string;
  mainImageDataUrl?: string;
  sideImageDataUrl?: string;
  customer: string;
  orderNo: string;
  madeIn: string;
  cartonCount: string;
  model: string;
  colour: string;
  quantity: string;
  gw: string;
  nw: string;
  meas: string;
  barcode?: string;
  sideBarcode?: string;
  dimensions?: { l: number; w: number; h: number };
}

export interface ShippingMarkProject {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  description: string;
  variants: MarkVariant[];
}

export const createEmptyVariant = (): MarkVariant => ({
  id: crypto.randomUUID(),
  title: "SAMPLE STYLE A",
  customer: "ACME TRADING CO., LTD",
  orderNo: "PO-2026-0001",
  madeIn: "MADE IN CHINA",
  cartonCount: "100",
  model: "MX-100",
  colour: "BLACK",
  quantity: "12 PCS",
  gw: "10.00 KGS",
  nw: "9.00 KGS",
  meas: "40*30*25 CM",
  barcode: "PO20260001",
  sideBarcode: "MX100-BLK",
});

export const createEmptyProject = (): ShippingMarkProject => ({
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  title: "SAMPLE-001",
  description: "Sample shipping mark — replace with your own information.",
  variants: [createEmptyVariant()],
});
