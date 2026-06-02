export interface Dims {
  l: number;
  w: number;
  h: number;
}

export const DEFAULT_DIMS: Dims = { l: 40, w: 30, h: 25 };

export function tryParseMeas(meas: string | undefined | null): Dims | null {
  if (!meas) return null;
  const m = meas.match(
    /(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)/,
  );
  if (!m) return null;
  return { l: +m[1], w: +m[2], h: +m[3] };
}

export function parseMeas(meas: string | undefined | null): Dims {
  return tryParseMeas(meas) ?? DEFAULT_DIMS;
}

export function formatMeas(d: Dims): string {
  return `${d.l}*${d.w}*${d.h} CM`;
}

export function normalizeDims(d: Dims): Dims {
  return {
    l: Number.isFinite(d.l) && d.l > 0 ? d.l : DEFAULT_DIMS.l,
    w: Number.isFinite(d.w) && d.w > 0 ? d.w : DEFAULT_DIMS.w,
    h: Number.isFinite(d.h) && d.h > 0 ? d.h : DEFAULT_DIMS.h,
  };
}

export function resolveDims(meas: string | undefined | null, dimensions?: Dims): Dims {
  return normalizeDims(tryParseMeas(meas) ?? dimensions ?? DEFAULT_DIMS);
}
