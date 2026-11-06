"use client";

import { ArrowLeft, Check, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { CLASS_META, HORIZON_META } from "./meta";
import { Button, ErrorNote, Field, Input, Modal, Select } from "../ui";
import { ApiError } from "@/lib/api";
import { money, todayISO } from "@/lib/format";
import { useMarketSearch, useQuote, useSaveHolding } from "@/lib/queries";
import { ASSET_CLASSES, HORIZONS, type AssetClass, type BondType, type GoldForm, type GoldPurity, type Horizon, type SymbolMatch } from "@/lib/types";
import { FundingPicker, useFunding } from "./funding-picker";

export function AddHoldingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cls, setCls] = useState<AssetClass | null>(null);
  const close = () => {
    setCls(null);
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title={cls ? CLASS_META[cls].addTitle : "Add an investment"} subtitle={cls ? CLASS_META[cls].blurb : "What would you like to track?"}>
      {!cls ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {ASSET_CLASSES.map((c) => {
            const M = CLASS_META[c];
            return (
              <button key={c} onClick={() => setCls(c)} className="panel group flex flex-col items-start gap-3 p-4 text-left transition hover:border-line-strong">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${M.color} 14%, transparent)`, color: M.color }}>
                  <M.icon size={18} />
                </span>
                <span>
                  <span className="block font-medium">{M.plural}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{M.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <HoldingForm key={cls} cls={cls} onBack={() => setCls(null)} onDone={close} />
      )}
    </Modal>
  );
}

function HoldingForm({ cls, onBack, onDone }: { cls: AssetClass; onBack: () => void; onDone: () => void }) {
  const save = useSaveHolding();
  const [picked, setPicked] = useState<SymbolMatch | null>(null);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState(""); // MF: amount invested → units
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [horizon, setHorizon] = useState<Horizon | "">("");
  const [goal, setGoal] = useState("");
  const [goldForm, setGoldForm] = useState<GoldForm>("DIGITAL");
  const [purity, setPurity] = useState<GoldPurity>("K24");
  const [faceValue, setFaceValue] = useState("1000");
  const [coupon, setCoupon] = useState("");
  const [maturity, setMaturity] = useState("");
  const [bondType, setBondType] = useState<BondType>("GOVERNMENT");
  const [manualPrice, setManualPrice] = useState("");

  const quote = useQuote(cls, picked?.symbol);
  const live = quote.data?.price;
  const factor = cls === "GOLD" && purity === "K22" ? 0.916 : 1;
  const livePrice = live != null ? Math.round(live * factor * 100) / 100 : null;

  // Today's live price pre-fills a purchase dated today until the user types their own.
  const effectivePrice = price !== "" ? price : date === todayISO() && livePrice != null ? String(livePrice) : "";
  const units = cls === "MUTUAL_FUND" && amount && effectivePrice ? Number(amount) / Number(effectivePrice) : null;
  const quantity = units != null && !qty ? Math.floor(units * 1000) / 1000 : Number(qty);
  const total = quantity > 0 && Number(effectivePrice) > 0 ? quantity * Number(effectivePrice) : 0;
  const funding = useFunding(total, date);
  const err = save.error instanceof ApiError ? save.error : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        input: {
          assetClass: cls,
          name: cls === "GOLD" && !name ? (goldForm === "SGB" ? "Sovereign Gold Bond" : goldForm === "PHYSICAL" ? "Physical gold" : "Digital gold") : picked?.name ?? name,
          symbol: picked?.symbol,
          exchange: picked?.exchange,
          horizon: horizon || undefined,
          goal: goal || undefined,
          goldForm: cls === "GOLD" ? goldForm : undefined,
          purity: cls === "GOLD" ? (goldForm === "SGB" ? "K24" : purity) : undefined,
          faceValue: cls === "BOND" ? Number(faceValue) : undefined,
          couponRate: cls === "BOND" ? Number(coupon) : undefined,
          maturityDate: cls === "BOND" ? maturity : undefined,
          bondType: cls === "BOND" ? bondType : undefined,
          manualPrice: manualPrice ? Number(manualPrice) : undefined,
          firstLot: { type: "BUY", date, quantity, price: Number(effectivePrice), ...funding.payload },
        },
      });
      onDone();
    } catch {
      /* shown below */
    }
  }

  const needsPick = (cls === "STOCK" || cls === "MUTUAL_FUND") && !picked;
  return (
    <form onSubmit={submit} className="space-y-5">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted hover:text-fg">
        <ArrowLeft size={13} /> Change type
      </button>

      {(cls === "STOCK" || cls === "MUTUAL_FUND") && (
        picked ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/[0.05] p-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{picked.name}</p>
              <p className="text-xs text-muted">
                {picked.symbol} · {picked.exchange}
                {live != null && <> · {cls === "MUTUAL_FUND" ? "NAV" : "Last"} {money(live)}</>}
                {quote.isLoading && " · fetching price…"}
              </p>
            </div>
            <button type="button" onClick={() => { setPicked(null); setPrice(""); }} className="text-xs text-brand hover:underline">
              Change
            </button>
          </div>
        ) : (
          <SymbolPicker cls={cls} onPick={setPicked} />
        )
      )}

      {cls === "GOLD" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {(["DIGITAL", "PHYSICAL", "SGB"] as GoldForm[]).map((f) => (
              <Chip key={f} active={goldForm === f} onClick={() => setGoldForm(f)}>{f === "SGB" ? "Gold bond (SGB)" : f === "DIGITAL" ? "Digital" : "Physical"}</Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (optional)">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={goldForm === "SGB" ? "SGB 2024-25 Series II" : "e.g. Coins"} maxLength={140} />
            </Field>
            {goldForm !== "SGB" ? (
              <Field label="Purity">
                <Select value={purity} onChange={(e) => setPurity(e.target.value as GoldPurity)}>
                  <option value="K24">24K (99.9%)</option>
                  <option value="K22">22K (91.6%)</option>
                </Select>
              </Field>
            ) : (
              <Field label="Purity" hint="1 unit = 1 g of 24K"><Input value="24K" disabled /></Field>
            )}
          </div>
          {livePrice != null && <p className="-mt-2 text-xs text-subtle">Today&apos;s spot: {money(livePrice)}/g{purity === "K22" && goldForm !== "SGB" ? " for 22K" : ""} (excludes duty &amp; GST)</p>}
        </>
      )}

      {cls === "BOND" && (
        <>
          <Field label="Bond name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="GOI 7.18% 2033 · or · XYZ NCD 8.4% 2028" maxLength={140} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Chip active={bondType === "GOVERNMENT"} onClick={() => setBondType("GOVERNMENT")}>Government</Chip>
            <Chip active={bondType === "CORPORATE"} onClick={() => setBondType("CORPORATE")}>Corporate</Chip>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Face value"><Input type="number" min="0.01" step="0.01" required value={faceValue} onChange={(e) => setFaceValue(e.target.value)} /></Field>
            <Field label="Coupon %"><Input type="number" min="0" max="50" step="0.01" required value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="7.18" /></Field>
            <Field label="Maturity"><Input type="date" required value={maturity} onChange={(e) => setMaturity(e.target.value)} /></Field>
          </div>
        </>
      )}

      {!needsPick && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {cls === "MUTUAL_FUND" ? (
              <Field label="Amount invested" hint={units != null && !qty ? `≈ ${units.toFixed(3)} units` : undefined}>
                <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
              </Field>
            ) : (
              <Field label={cls === "GOLD" ? "Grams" : cls === "BOND" ? "No. of bonds" : "Shares"}>
                <Input type="number" min="0.001" step="any" required value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
            )}
            <Field label={cls === "GOLD" ? "Price / gram" : cls === "MUTUAL_FUND" ? "NAV paid" : "Price paid"}>
              <Input type="number" min="0" step="any" required value={effectivePrice} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Date">
              <Input type="date" required max={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); if (e.target.value !== todayISO()) setPrice(""); }} />
            </Field>
          </div>
          {cls === "MUTUAL_FUND" && (
            <Field label="…or units (optional)">
              <Input type="number" min="0.001" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Overrides the amount" />
            </Field>
          )}
          {cls === "BOND" && (
            <Field label="Current price per bond (optional)" hint="Bonds have no live feed; without this we value at face value">
              <Input type="number" min="0" step="any" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time horizon">
              <Select value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon | "")}>
                <option value="">Not set</option>
                {HORIZONS.map((h) => (
                  <option key={h} value={h}>{HORIZON_META[h].label} ({HORIZON_META[h].hint})</option>
                ))}
              </Select>
            </Field>
            <Field label="Goal (optional)">
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Retirement, house…" maxLength={60} />
            </Field>
          </div>
          {total > 0 && (
            <p className="flex items-center justify-between rounded-xl bg-fg/[0.03] px-4 py-3 text-sm">
              <span className="text-muted">Total invested</span>
              <span className="tabular font-semibold">{money(total)}</span>
            </p>
          )}
          <FundingPicker f={funding} />
        </>
      )}

      <ErrorNote message={err ? (err.fieldErrors ? Object.entries(err.fieldErrors).map(([k, v]) => `${k} ${v}`).join(", ") : err.message) : save.error?.message} />
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending} disabled={needsPick || !(quantity > 0) || effectivePrice === ""}>
          <Check size={15} /> Add to portfolio
        </Button>
      </div>
    </form>
  );
}

function SymbolPicker({ cls, onPick }: { cls: AssetClass; onPick: (m: SymbolMatch) => void }) {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const { data, isFetching } = useMarketSearch(cls, dq);
  return (
    <div>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="field pl-10" placeholder={cls === "STOCK" ? "Search NSE / BSE — e.g. Reliance, NIFTYBEES" : "Search funds — e.g. Parag Parikh Flexi Cap"} />
      </div>
      <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line">
        {q.trim().length < 2 ? (
          <p className="p-4 text-center text-xs text-subtle">Type at least 2 letters</p>
        ) : isFetching && !data ? (
          <p className="p-4 text-center text-xs text-subtle">Searching…</p>
        ) : !data?.length ? (
          <p className="p-4 text-center text-xs text-subtle">No matches</p>
        ) : (
          data.map((m) => (
            <button type="button" key={`${m.symbol}-${m.exchange}`} onClick={() => onPick(m)} className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 hover:bg-fg/[0.03]">
              <span className="min-w-0">
                <span className="block truncate text-sm">{m.name}</span>
                <span className="text-xs text-subtle">{m.symbol}</span>
              </span>
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">{m.exchange}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-2 text-xs transition ${active ? "border-brand bg-brand/10 text-brand" : "border-line-strong text-muted hover:text-fg"}`}>
      {children}
    </button>
  );
}
