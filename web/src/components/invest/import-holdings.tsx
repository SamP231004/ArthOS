"use client";

import { ArrowLeft, Check, FileUp, Loader2, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { Button, ErrorNote, Input, Modal } from "@/components/ui";
import { money } from "@/lib/format";
import { heldSummary, parseImport, SOURCES, withSince, type ImportItem, type Parsed, type SourceId } from "@/lib/import";
import { PdfPasswordError, pdfTextWeb } from "@/lib/import/pdf-web";
import { useImportHoldings, useIsinIndex, type ImportResult } from "@/lib/queries";

/**
 * Import investments from Zerodha, Groww, other brokers or a CAS. The file is read and matched in the browser; the
 * server only ever receives the holdings the user ticks and confirms.
 */
const yearAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

export function PrivacyNote() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-income/25 bg-income/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-fg-2">
      <ShieldCheck size={15} className="mt-px shrink-0 text-income" />
      <span>
        <strong className="font-medium text-fg">Read on your device.</strong> Your file is never uploaded — it&apos;s opened and matched right here. Only the holdings you
        confirm are saved to your account.
      </span>
    </p>
  );
}

export function ImportHoldingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [source, setSource] = useState<SourceId | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const close = () => {
    setSource(null);
    setParsed(null);
    setResult(null);
    onClose();
  };
  const src = SOURCES.find((s) => s.id === source);
  const title = result ? "Imported" : parsed ? "Check and import" : src ? src.name : "Import investments";
  const subtitle = result ? undefined : parsed ? "Untick anything you don't want." : src ? src.what : "Bring in what you already own — no typing.";

  return (
    <Modal open={open} onClose={close} title={title} subtitle={subtitle}>
      {result ? (
        <Done r={result} onClose={close} />
      ) : parsed && source ? (
        <Preview parsed={parsed} source={source} onBack={() => setParsed(null)} onDone={setResult} />
      ) : src ? (
        <Upload src={src} onBack={() => setSource(null)} onParsed={setParsed} />
      ) : (
        <div className="space-y-4">
          <PrivacyNote />
          <div className="grid gap-2 sm:grid-cols-2">
            {SOURCES.map((s) => (
              <button key={s.id} type="button" onClick={() => setSource(s.id)} className="rounded-xl border border-line p-3.5 text-left transition hover:border-line-strong hover:bg-fg/[0.02]">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted">{s.what}</p>
                {s.exact && <p className="mt-1.5 inline-block rounded-full bg-income/10 px-2 py-px text-[10.5px] font-medium text-income">Exact dates</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Upload({ src, onBack, onParsed }: { src: (typeof SOURCES)[number]; onBack: () => void; onParsed: (p: Parsed) => void }) {
  const index = useIsinIndex(true);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [password, setPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(f = file, pw = password) {
    if (!f) return;
    if (!index.data) {
      setError(index.isLoading ? "Still loading the list of stocks and funds — try again in a moment." : "Couldn't load the list of stocks and funds. Check your connection.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const p = await parseImport(f.bytes, f.name, index.data, { since: yearAgo(), password: pw, pdfText: pdfTextWeb });
      if (!p.items.length) throw new Error(p.unmatched.length ? "None of the rows matched an NSE stock or a mutual fund." : "No holdings found in this file.");
      onParsed(p);
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        setNeedPassword(true);
        setError(e.wrong ? e.message : null);
      } else setError(e instanceof Error ? e.message : "Couldn't read this file.");
    } finally {
      setBusy(false);
    }
  }

  async function pick(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    const next = { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) };
    setFile(next);
    setNeedPassword(false);
    setPassword("");
    run(next, "");
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ArrowLeft size={13} /> All sources
      </button>
      <div className="rounded-xl bg-fg/[0.03] p-3.5 text-sm">
        <p className="text-xs font-medium text-muted">How to get the file</p>
        <p className="mt-1 leading-relaxed text-fg-2">{src.how}</p>
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files);
        }}
        className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-4 py-8 text-center transition hover:border-brand/50"
      >
        {busy ? <Loader2 size={22} className="animate-spin text-muted" /> : <FileUp size={22} className="text-muted" />}
        <span className="text-sm font-medium">{file ? file.name : "Choose or drop your file"}</span>
        <span className="text-xs text-subtle">{src.accepts.replaceAll(",", " · ")}</span>
      </button>
      <input ref={input} type="file" accept={src.accepts} className="hidden" onChange={(e) => pick(e.target.files)} />
      {needPassword && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="relative flex-1">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-8" aria-label="PDF password" autoFocus />
          </div>
          <Button type="submit" loading={busy}>Open</Button>
        </form>
      )}
      {needPassword && <p className="text-xs text-subtle">The PDF password you set when requesting the statement. It&apos;s used only here to open the file.</p>}
      <ErrorNote message={error} />
      <PrivacyNote />
    </div>
  );
}

function Preview({ parsed, source, onBack, onDone }: { parsed: Parsed; source: SourceId; onBack: () => void; onDone: (r: ImportResult) => void }) {
  const importer = useImportHoldings();
  const [since, setSince] = useState(yearAgo());
  const [off, setOff] = useState<Set<string>>(new Set());
  const items: ImportItem[] = parsed.dated ? parsed.items : withSince(parsed.items, since);
  const chosen = items.filter((i) => !off.has(i.symbol));
  const total = chosen.reduce((s, i) => s + heldSummary(i).invested, 0);
  const toggle = (sym: string) => setOff((o) => {
    const n = new Set(o);
    if (n.has(sym)) n.delete(sym);
    else n.add(sym);
    return n;
  });

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ArrowLeft size={13} /> Choose another file
      </button>
      {!parsed.dated && (
        <div className="rounded-xl border border-line p-3.5">
          <label className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              <span className="font-medium">Held since</span>
              <span className="block text-xs text-subtle">Holdings files have no purchase dates, so returns per year (XIRR) are approximate.</span>
            </span>
            <Input type="date" value={since} max={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && setSince(e.target.value)} className="w-auto" />
          </label>
        </div>
      )}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {items.map((i) => {
          const h = heldSummary(i);
          const on = !off.has(i.symbol);
          return (
            <li key={i.symbol}>
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5">
                <input type="checkbox" checked={on} onChange={() => toggle(i.symbol)} className="h-4 w-4 accent-[var(--brand)]" />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${on ? "" : "text-subtle line-through"}`}>{i.name}</span>
                  <span className="block text-xs text-subtle">
                    {i.assetClass === "STOCK" ? "Stock / ETF" : "Mutual fund"} · {h.quantity} {i.assetClass === "STOCK" ? "shares" : "units"} · avg {money(h.avg)}
                    {parsed.dated && ` · ${i.lots.length} transaction${i.lots.length === 1 ? "" : "s"}`}
                  </span>
                </span>
                <span className="tabular shrink-0 text-sm">{money(Math.round(h.invested))}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {parsed.unmatched.length > 0 && (
        <details className="rounded-xl border border-warn/30 bg-warn/[0.06] px-3.5 py-2.5 text-xs">
          <summary className="flex cursor-pointer items-center gap-1.5 font-medium">
            <TriangleAlert size={13} className="text-warn" /> {parsed.unmatched.length} row{parsed.unmatched.length === 1 ? "" : "s"} couldn&apos;t be matched (skipped)
          </summary>
          <ul className="mt-2 space-y-1 text-muted">
            {parsed.unmatched.map((u) => (
              <li key={u.label}>{u.label} — {u.reason}</li>
            ))}
          </ul>
        </details>
      )}
      {parsed.notes.map((n) => (
        <p key={n} className="text-xs text-muted">{n}</p>
      ))}
      <p className="text-xs text-subtle">These count as investments you already had — they won&apos;t be taken from your savings account or this month&apos;s spending. Importing a newer file from the same source later updates them.</p>
      <ErrorNote message={importer.error?.message} />
      <Button
        className="w-full"
        size="lg"
        loading={importer.isPending}
        disabled={!chosen.length}
        onClick={() => importer.mutate({ source, items: chosen }, { onSuccess: onDone })}
      >
        Import {chosen.length} holding{chosen.length === 1 ? "" : "s"} · {money(Math.round(total))}
      </Button>
    </div>
  );
}

function Done({ r, onClose }: { r: ImportResult; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-income/[0.07] p-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-income/15 text-income"><Check size={18} /></span>
        <div className="text-sm">
          <p className="font-medium">{r.created} new holding{r.created === 1 ? "" : "s"}, {r.updated} updated</p>
          <p className="text-xs text-muted">{r.transactions} transaction{r.transactions === 1 ? "" : "s"} imported · prices update live from now on</p>
        </div>
      </div>
      {r.skipped.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-warn/30 bg-warn/[0.06] p-3.5 text-xs text-muted">
          {r.skipped.map((s) => (
            <li key={s.name}><span className="font-medium text-fg">{s.name}</span> — {s.reason}</li>
          ))}
        </ul>
      )}
      <Button className="w-full" onClick={onClose}>Done</Button>
    </div>
  );
}
