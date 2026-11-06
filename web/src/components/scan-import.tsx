"use client";

import { ClipboardPaste, ImageUp, Loader2, ScanLine, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ExpenseModal, IncomeModal } from "./transaction-forms";
import { Button, ErrorNote, Modal } from "./ui";
import { useParseText } from "@/lib/queries";
import type { ExpenseInput, IncomeInput, ParseResult } from "@/lib/types";

type Draft = { kind: "EXPENSE"; draft: Partial<ExpenseInput> } | { kind: "INCOME"; draft: Partial<IncomeInput> };

/** A half-size copy: Tesseract misreads (or skips) the huge hero amount on payment screens at full size. */
async function halfSize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width / 2));
  canvas.height = Math.max(1, Math.round(bmp.height / 2));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize failed"))), "image/png"));
}

/**
 * Reads the text in an image in the browser (Tesseract, English) — the image itself never leaves the device.
 * Two passes in sparse-text mode (finds isolated big text like "₹450"): full size and half size. Both readings go
 * to the parser, which reconciles them (e.g. "₹" read as a leading "3").
 */
async function ocr(file: File, onProgress: (p: number) => void): Promise<string> {
  const { createWorker, PSM } = await import("tesseract.js");
  let pass = 0;
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => m.status === "recognizing text" && onProgress((pass + m.progress) / 2),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const full = (await worker.recognize(file)).data.text;
    pass = 1;
    const half = (await worker.recognize(await halfSize(file))).data.text;
    return `${full}\n\n${half}`;
  } finally {
    await worker.terminate();
  }
}

function toDraft(r: ParseResult): Draft {
  const note = r.reference ? `Ref ${r.reference}` : undefined;
  if (r.kind === "INCOME")
    return { kind: "INCOME", draft: { amount: r.amount, source: r.merchant, type: r.incomeType, date: r.date, note } };
  return { kind: "EXPENSE", draft: { amount: r.amount, merchant: r.merchant, category: r.category ?? undefined, paymentSource: r.paymentSource, date: r.date, note } };
}

/**
 * "Scan a screenshot" (blueprint §10): pick, drop or paste an image of a payment confirmation, bank SMS or receipt
 * — or paste the SMS text — and ArthOS reads it in the browser, drafts the transaction, and opens the normal form
 * pre-filled so the user confirms (and can correct) every field before anything is saved.
 */
export function ScanImport({ variant = "secondary", label = "Scan screenshot" }: { variant?: "secondary" | "primary"; label?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <ScanLine size={16} /> {label}
      </Button>
      <ScanModal
        open={open}
        onClose={() => setOpen(false)}
        onDraft={(d) => {
          setOpen(false);
          setDraft(d);
        }}
      />
      <ExpenseModal open={draft?.kind === "EXPENSE"} onClose={() => setDraft(null)} draft={draft?.kind === "EXPENSE" ? draft.draft : undefined} />
      <IncomeModal open={draft?.kind === "INCOME"} onClose={() => setDraft(null)} draft={draft?.kind === "INCOME" ? draft.draft : undefined} />
    </>
  );
}

function ScanModal({ open, onClose, onDraft }: { open: boolean; onClose: () => void; onDraft: (d: Draft) => void }) {
  const parse = useParseText();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"image" | "text">("image");
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  // paste an image straight from the clipboard while the dialog is open
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        void readImage(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function finish(raw: string) {
    const r = await parse.mutateAsync(raw);
    if (!r.usable) {
      setError("Couldn't find an amount in that. Try a clearer, uncropped screenshot — or paste the SMS text instead.");
      return;
    }
    reset();
    onDraft(toDraft(r));
  }

  async function readImage(file: File) {
    if (!file.type.startsWith("image/")) return setError("That isn't an image. Use a PNG or JPG screenshot.");
    if (file.size > 12 * 1024 * 1024) return setError("That image is over 12 MB — try a screenshot instead of a photo.");
    setError(null);
    setPreview(URL.createObjectURL(file));
    setProgress(0);
    try {
      const raw = await ocr(file, setProgress);
      await finish(raw);
    } catch {
      setError("Couldn't read that image. Try again, or paste the text instead.");
    } finally {
      setProgress(null);
    }
  }

  function reset() {
    setPreview(null);
    setText("");
    setError(null);
    setProgress(null);
  }

  const busy = progress !== null || parse.isPending;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (busy) return;
        reset();
        onClose();
      }}
      title="Scan a screenshot"
      subtitle="Payment confirmation, bank SMS or receipt"
    >
      <div className="mb-4 flex rounded-xl border border-line bg-fg/[0.02] p-0.5 text-sm">
        {(["image", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${mode === m ? "bg-surface text-fg shadow-sm ring-1 ring-line-strong" : "text-muted hover:text-fg"}`}
          >
            {m === "image" ? <ImageUp size={14} /> : <ClipboardPaste size={14} />} {m === "image" ? "Image" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "image" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !busy) void readImage(f);
          }}
          className={`relative grid min-h-56 place-items-center overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? "border-brand bg-brand/[0.06]" : "border-line-strong"}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={preview} alt="Your screenshot" className={`max-h-72 rounded-xl object-contain ${busy ? "opacity-60" : ""}`} />
          ) : (
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                <ImageUp size={22} />
              </span>
              <p className="mt-3 font-medium">Drop a screenshot here</p>
              <p className="mt-1 text-xs text-subtle">or paste it (Ctrl/⌘ + V), or</p>
              <Button type="button" variant="secondary" className="mt-3" onClick={() => input.current?.click()}>
                Choose image
              </Button>
            </div>
          )}
          {busy && (
            <div className="absolute inset-x-6 bottom-5 rounded-xl bg-surface/90 px-4 py-3 text-left shadow backdrop-blur">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Loader2 size={14} className="animate-spin text-brand" /> {parse.isPending ? "Working out the details…" : "Reading text…"}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/[0.08]">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round((parse.isPending ? 1 : progress ?? 0) * 100)}%` }} />
              </div>
            </div>
          )}
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void readImage(f);
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={20000}
            placeholder="Paste a bank SMS or payment message, e.g. “Rs.649.00 debited from A/c XX4821 to VPA netflix@hdfcbank…”"
            className="w-full resize-none rounded-xl border border-line-strong bg-field px-3.5 py-3 text-sm outline-none transition focus:border-brand"
          />
          <div className="flex justify-end">
            <Button type="button" loading={parse.isPending} disabled={!text.trim()} onClick={() => void finish(text)}>
              <ScanLine size={15} /> Read details
            </Button>
          </div>
        </div>
      )}

      <ErrorNote message={error ?? (parse.error ? parse.error.message : null)} />
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-subtle">
        <ShieldCheck size={14} className="mt-px shrink-0 text-income" />
        The image is read on this device and never uploaded — only the extracted text is sent to work out the details. You check everything before it&apos;s saved.
      </p>
    </Modal>
  );
}
