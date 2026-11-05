"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Sparkline } from "../charts";
import { CLASS_META, HORIZON_META, SOURCE_LABEL, fmtQty, holdingSubtitle, signedPct, tone } from "./meta";
import { Badge, Button, ErrorNote, Field, Input, Modal, Select } from "../ui";
import { dateLabel, money, todayISO } from "@/lib/format";
import { useAddLot, useDeleteHolding, useDeleteLot, useSaveHolding } from "@/lib/queries";
import { HORIZONS, type HoldingView, type Horizon, type LotType, type FundingSource } from "@/lib/types";
import { FundingPicker } from "./funding-picker";

export type DetailTab = "overview" | "trade" | "settings" | "withdraw";

export function HoldingModal({ holding, onClose, initialTab = "overview" }: { holding: HoldingView | null; onClose: () => void; initialTab?: DetailTab }) {
  return (
    <Modal open={!!holding} onClose={onClose} title={holding?.name ?? ""} subtitle={holding ? holdingSubtitle(holding) : undefined}>
      {holding && <Detail key={`${holding.id}-${initialTab}`} h={holding} onClose={onClose} initialTab={initialTab} />}
    </Modal>
  );
}

function Detail({ h, onClose, initialTab }: { h: HoldingView; onClose: () => void; initialTab: DetailTab }) {
  const [tab, setTab] = useState<Exclude<DetailTab, "withdraw">>(initialTab === "withdraw" ? "trade" : initialTab);
  const M = CLASS_META[h.assetClass];
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl bg-fg/[0.04] p-1 text-sm">
        {(["overview", "trade", "settings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-3 py-1.5 capitalize transition ${tab === t ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
            {t === "trade" ? "Buy / sell" : t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-subtle">Current value</p>
              <p className="tabular text-3xl font-semibold tracking-tight">{money(h.currentValue)}</p>
              <p className={`tabular text-sm ${tone(h.gain)}`}>
                {h.gain >= 0 ? "+" : "−"}{money(Math.abs(h.gain))} ({signedPct(h.gainPct)}) all time
              </p>
            </div>
            {h.spark.length > 1 && <Sparkline values={h.spark} color={h.spark[h.spark.length - 1] >= h.spark[0] ? "var(--income)" : "var(--expense)"} className="h-12 w-32" />}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat k={h.assetClass === "GOLD" ? "Price / gram" : h.assetClass === "MUTUAL_FUND" ? "NAV" : "Price"} v={money(h.price)} sub={SOURCE_LABEL[h.priceSource]} />
            <Stat k="Today" v={h.priceSource === "LIVE" ? `${h.dayChange >= 0 ? "+" : "−"}${money(Math.abs(h.dayChange))}` : "—"} sub={h.priceSource === "LIVE" ? signedPct(h.dayChangePct) : "no live price"} tone={tone(h.dayChange)} />
            <Stat k="Invested" v={money(h.invested)} sub={`avg ${money(h.avgCost)} / ${M.unit === "g" ? "g" : "unit"}`} />
            <Stat k="XIRR" v={h.xirr != null ? signedPct(h.xirr) : "—"} sub={h.xirr != null ? "annualised" : "needs 30+ days of history"} tone={tone(h.xirr)} />
            {h.realizedGain !== 0 && <Stat k="Realised" v={`${h.realizedGain >= 0 ? "+" : "−"}${money(Math.abs(h.realizedGain))}`} sub="from sales" tone={tone(h.realizedGain)} />}
            <Stat k="Holding" v={`${fmtQty(h.quantity)} ${M.unit}`} sub={h.firstBought ? `since ${dateLabel(h.firstBought)}` : ""} />
            {h.bond && (
              <>
                <Stat k="Coupon" v={`${h.bond.couponRate}% · ${money(h.bond.annualCoupon)}/yr`} sub={h.bond.nextCouponDate ? `next ~${dateLabel(h.bond.nextCouponDate)}` : "matured"} />
                <Stat k="Maturity" v={dateLabel(h.bond.maturityDate)} sub={h.bond.yearsToMaturity != null ? `${h.bond.yearsToMaturity} yrs · yield ${h.bond.currentYield ?? "—"}%` : ""} />
              </>
            )}
            {h.gold && <Stat k="24K spot" v={`${money(h.gold.pricePerGram24k)}/g`} sub={h.gold.purity === "K22" ? "valued at 91.6% for 22K" : "international spot"} />}
          </dl>
          {(h.horizon || h.goal) && (
            <div className="flex flex-wrap gap-2">
              {h.horizon && <Badge tone="info">{HORIZON_META[h.horizon].label}</Badge>}
              {h.goal && <Badge tone="gold">Goal: {h.goal}</Badge>}
            </div>
          )}
          <Lots h={h} />
        </>
      )}

      {tab === "trade" && <Trade h={h} onDone={() => setTab("overview")} initialType={initialTab === "withdraw" ? "SELL" : "BUY"} />}
      {tab === "settings" && <Settings h={h} onDeleted={onClose} onSaved={() => setTab("overview")} />}
    </div>
  );
}

function Stat({ k, v, sub, tone = "" }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-fg/[0.015] p-3">
      <dt className="text-[11px] text-subtle">{k}</dt>
      <dd className={`tabular mt-0.5 font-semibold ${tone}`}>{v}</dd>
      {sub && <dd className="text-[11px] text-subtle">{sub}</dd>}
    </div>
  );
}

function Lots({ h }: { h: HoldingView }) {
  const del = useDeleteLot(h.id);
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Transactions</p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {[...h.lots].reverse().map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
            <Badge tone={l.type === "BUY" ? "income" : "expense"}>{l.type === "BUY" ? "Buy" : "Sell"}</Badge>
            <span className="text-muted">{dateLabel(l.date)}</span>
            <span className="tabular ml-auto text-right">
              {fmtQty(l.quantity)} × {money(l.price)}
              <span className="block text-[11px] text-subtle">
                {money(l.amount)}
                {l.type === "BUY" ? (l.fundedFrom === "SPENDING" ? " · from spending" : " · from savings") : " · to savings"}
                {l.note && l.note !== "Paid from spending money" ? ` · ${l.note}` : ""}
              </span>
            </span>
            {h.lots.length > 1 && (
              <button onClick={() => confirm("Delete this transaction?") && del.mutate(l.id)} className="rounded-lg p-1 text-subtle hover:bg-expense/10 hover:text-expense" aria-label="Delete transaction">
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <ErrorNote message={del.error?.message} />
    </div>
  );
}

function Trade({ h, onDone, initialType = "BUY" }: { h: HoldingView; onDone: () => void; initialType?: LotType }) {
  const add = useAddLot(h.id);
  const [type, setType] = useState<LotType>(initialType);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState(String(h.price));
  const [date, setDate] = useState(todayISO());
  const [fundedFrom, setFundedFrom] = useState<FundingSource>("SAVINGS");
  const unit = CLASS_META[h.assetClass].unit;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await add.mutateAsync({
        type,
        date,
        quantity: Number(qty),
        price: Number(price),
        note: h.assetClass === "MUTUAL_FUND" && type === "BUY" ? "SIP" : undefined,
        fundedFrom: type === "BUY" ? fundedFrom : undefined,
      });
      onDone();
    } catch {
      /* shown below */
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["BUY", "SELL"] as LotType[]).map((t) => (
          <button type="button" key={t} onClick={() => setType(t)} className={`rounded-xl border px-3 py-2 text-sm transition ${type === t ? (t === "BUY" ? "border-income bg-income/10 text-income" : "border-expense bg-expense/10 text-expense") : "border-line-strong text-muted"}`}>
            {t === "BUY" ? "Buy more" : "Sell"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={unit === "g" ? "Grams" : unit === "units" ? "Units" : unit === "bonds" ? "Bonds" : "Shares"} hint={type === "SELL" ? `You hold ${fmtQty(h.quantity)}` : undefined}>
          <Input type="number" min="0.001" step="any" required autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Price / unit"><Input type="number" min="0" step="any" required value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <Field label="Date"><Input type="date" required max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      {Number(qty) > 0 && Number(price) > 0 && (
        <p className="flex justify-between rounded-xl bg-fg/[0.03] px-4 py-3 text-sm">
          <span className="text-muted">{type === "BUY" ? "Total cost" : "Proceeds · back to your savings account"}</span>
          <span className="tabular font-semibold">{money(Number(qty) * Number(price))}</span>
        </p>
      )}
      {type === "BUY" && <FundingPicker value={fundedFrom} onChange={setFundedFrom} amount={Number(qty) * Number(price) || 0} date={date} />}
      <ErrorNote message={add.error?.message} />
      <div className="flex justify-end">
        <Button type="submit" loading={add.isPending}>{type === "BUY" ? "Add purchase" : "Record sale"}</Button>
      </div>
    </form>
  );
}

function Settings({ h, onDeleted, onSaved }: { h: HoldingView; onDeleted: () => void; onSaved: () => void }) {
  const save = useSaveHolding();
  const del = useDeleteHolding();
  const [name, setName] = useState(h.name);
  const [horizon, setHorizon] = useState<Horizon | "">(h.horizon ?? "");
  const [goal, setGoal] = useState(h.goal ?? "");
  const [manual, setManual] = useState(h.manualPrice != null ? String(h.manualPrice) : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        id: h.id,
        input: {
          assetClass: h.assetClass,
          name,
          symbol: h.symbol,
          exchange: h.exchange,
          horizon: horizon || undefined,
          goal: goal || undefined,
          goldForm: h.gold?.form,
          purity: h.gold?.purity,
          faceValue: h.bond?.faceValue,
          couponRate: h.bond?.couponRate,
          maturityDate: h.bond?.maturityDate,
          bondType: h.bond?.bondType,
          manualPrice: manual ? Number(manual) : undefined,
          notes: h.notes,
        },
      });
      onSaved();
    } catch {
      /* shown below */
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name"><Input required maxLength={140} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Time horizon">
          <Select value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon | "")}>
            <option value="">Not set</option>
            {HORIZONS.map((x) => <option key={x} value={x}>{HORIZON_META[x].label}</option>)}
          </Select>
        </Field>
        <Field label="Goal"><Input maxLength={60} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Optional" /></Field>
      </div>
      <Field label="Manual price per unit" hint={h.assetClass === "BOND" ? "Bonds have no live feed — set the latest traded price" : "Overrides the live price; leave empty to use live data"}>
        <Input type="number" min="0" step="any" value={manual} onChange={(e) => setManual(e.target.value)} />
      </Field>
      <ErrorNote message={(save.error ?? del.error)?.message} />
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="danger"
          loading={del.isPending}
          onClick={async () => {
            if (!confirm(`Remove ${h.name} and all its transactions?`)) return;
            try {
              await del.mutateAsync(h.id);
              onDeleted();
            } catch {
              /* shown above */
            }
          }}
        >
          <Trash2 size={15} /> Remove holding
        </Button>
        <Button type="submit" loading={save.isPending}>Save</Button>
      </div>
    </form>
  );
}
