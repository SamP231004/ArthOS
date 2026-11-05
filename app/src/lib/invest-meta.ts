// App counterpart of web/src/components/invest/meta.ts (same labels and colour slots, no web icons).
import type { AssetClass, HoldingView, Horizon, PriceSource } from './types';
import type { Palette } from '@/theme';

export const CLASS_META: Record<AssetClass, { label: string; plural: string; addTitle: string; unit: string; color: (c: Palette) => string; glyph: string; blurb: string }> = {
  STOCK: { label: 'Stock / ETF', plural: 'Stocks & ETFs', addTitle: 'Add a stock or ETF', unit: 'shares', color: (c) => c.c1, glyph: '↗', blurb: 'NSE & BSE equities and ETFs, priced live' },
  MUTUAL_FUND: { label: 'Mutual fund', plural: 'Mutual funds', addTitle: 'Add a mutual fund', unit: 'units', color: (c) => c.c3, glyph: '◔', blurb: 'Any AMFI scheme — SIPs or lump sums, with XIRR' },
  GOLD: { label: 'Gold', plural: 'Gold', addTitle: 'Add gold', unit: 'g', color: (c) => c.c2, glyph: '◈', blurb: 'Digital, physical or Sovereign Gold Bonds by weight' },
  BOND: { label: 'Bond', plural: 'Bonds', addTitle: 'Add a bond', unit: 'bonds', color: (c) => c.c4, glyph: '▤', blurb: 'G-Secs and corporate bonds with coupon & maturity' },
};

export const HORIZON_META: Record<Horizon | 'NONE', { label: string; hint: string }> = {
  SHORT: { label: 'Short term', hint: 'under 1 year' },
  MEDIUM: { label: 'Medium term', hint: '1–5 years' },
  LONG: { label: 'Long term', hint: '5+ years' },
  NONE: { label: 'No horizon set', hint: '' },
};

export const SOURCE_LABEL: Record<PriceSource, string> = { LIVE: 'Live', MANUAL: 'Manual price', FACE_VALUE: 'Face value', COST: 'Last trade price' };

export function fmtQty(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

export function holdingSubtitle(h: HoldingView): string {
  switch (h.assetClass) {
    case 'STOCK':
      return `${fmtQty(h.quantity)} shares · ${h.symbol?.replace(/\.(NS|BO)$/, '')}`;
    case 'MUTUAL_FUND':
      return `${fmtQty(h.quantity)} units · NAV ${h.price.toFixed(2)}`;
    case 'GOLD':
      return `${fmtQty(h.gold?.grams ?? h.quantity)} g · ${h.gold?.form === 'SGB' ? 'SGB' : h.gold?.form === 'PHYSICAL' ? 'Physical' : 'Digital'} · ${h.gold?.purity === 'K22' ? '22K' : '24K'}`;
    case 'BOND':
      return h.bond ? `${fmtQty(h.quantity)} × ${h.bond.faceValue} · ${h.bond.couponRate}% · ${h.bond.maturityDate.slice(0, 4)}` : `${fmtQty(h.quantity)} bonds`;
  }
}

export function signedPct(n?: number | null): string {
  if (n == null) return '—';
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}%`;
}

export function toneColor(c: Palette, n?: number | null): string {
  if (n == null || n === 0) return c.muted;
  return n > 0 ? c.income : c.expense;
}
