"use client";

import { Check, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ErrorNote, Input, Modal, Select } from "@/components/ui";
import {
  categoryUsage,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type CategoryKind,
  type CategoryView,
} from "@/lib/categories";

/**
 * Settings → Categories: the built-ins can be renamed and hidden, the user's own can be added, renamed and deleted
 * (their entries move to a category the user picks). Keys never change, so history stays intact.
 */
export function CategoryManager() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const cats = useCategories(kind);
  const create = useCreateCategory();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [deleting, setDeleting] = useState<CategoryView | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ kind, label: name.trim(), emoji: emoji.trim() || undefined });
      setName("");
      setEmoji("");
    } catch {
      /* shown below */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl bg-fg/[0.05] p-1 text-sm">
        {(["expense", "income"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-lg px-3 py-1.5 transition ${kind === k ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
            {k === "expense" ? "Expense categories" : "Income types"}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line">
        {cats.all.map((c) => (
          <Row key={c.key} kind={kind} c={c} onDelete={() => setDeleting(c)} />
        ))}
      </ul>

      <form onSubmit={add} className="flex gap-2">
        <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} placeholder="🙂" aria-label="Emoji" className="!w-14 text-center" />
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder={kind === "expense" ? "New category, e.g. Pets" : "New income type, e.g. Rental"} aria-label="Name" />
        <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
          <Plus size={15} /> Add
        </Button>
      </form>
      <ErrorNote message={create.error?.message} />
      <p className="text-xs text-subtle">Hidden ones disappear from pickers but stay on past entries. Renaming keeps every entry where it is.</p>

      {deleting && <DeleteDialog kind={kind} c={deleting} options={cats.all.filter((x) => x.key !== deleting.key)} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function Row({ kind, c, onDelete }: { kind: CategoryKind; c: CategoryView; onDelete: () => void }) {
  const update = useUpdateCategory();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(c.label);
  const [emoji, setEmoji] = useState(c.emoji ?? "");

  async function save() {
    try {
      await update.mutateAsync({ kind, key: c.key, label: label.trim(), emoji: emoji.trim() });
      setEditing(false);
    } catch {
      /* shown below */
    }
  }

  return (
    <li className={`px-3 py-2 ${c.hidden ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} aria-label="Emoji" className="!w-12 !py-1.5 text-center" />
            <Input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} aria-label="Name" className="!py-1.5" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), save())} />
            <IconButton label="Save" onClick={save} disabled={update.isPending || !label.trim()}><Check size={15} /></IconButton>
            <IconButton label="Cancel" onClick={() => { setEditing(false); setLabel(c.label); setEmoji(c.emoji ?? ""); }}><X size={15} /></IconButton>
          </>
        ) : (
          <>
            <span className="w-6 text-center text-base">{c.emoji ?? "•"}</span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {c.label}
              {!c.builtIn && <span className="ml-2 rounded bg-brand/10 px-1.5 py-px text-[10px] font-medium text-brand">yours</span>}
              {c.hidden && <span className="ml-2 text-[11px] text-subtle">hidden</span>}
            </span>
            <IconButton label={`Rename ${c.label}`} onClick={() => setEditing(true)}><Pencil size={14} /></IconButton>
            {c.key !== "OTHER" && (
              <IconButton label={c.hidden ? `Show ${c.label}` : `Hide ${c.label}`} onClick={() => update.mutate({ kind, key: c.key, hidden: !c.hidden })} disabled={update.isPending}>
                {c.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </IconButton>
            )}
            {!c.builtIn && (
              <IconButton label={`Delete ${c.label}`} onClick={onDelete} danger><Trash2 size={14} /></IconButton>
            )}
          </>
        )}
      </div>
      {update.error && <p className="mt-1 text-xs text-expense">{update.error.message}</p>}
    </li>
  );
}

function DeleteDialog({ kind, c, options, onClose }: { kind: CategoryKind; c: CategoryView; options: CategoryView[]; onClose: () => void }) {
  const del = useDeleteCategory();
  const [moveTo, setMoveTo] = useState("OTHER");
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    categoryUsage(kind, c.key).then((r) => live && setCount(r.count)).catch(() => live && setCount(null));
    return () => {
      live = false;
    };
  }, [kind, c.key]);
  const noun = (n: number) => (kind === "expense" ? (n === 1 ? "expense" : "expenses") : n === 1 ? "income entry" : "income entries");

  return (
    <Modal open onClose={() => !del.isPending && onClose()} title={`Delete ${c.label}?`} subtitle="Your entries are kept — they move to another category.">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {count == null ? "Checking how many entries use it…" : count === 0 ? "Nothing is filed under it yet." : `${count} ${noun(count)} will move to:`}
        </p>
        <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Move entries to">
          {options.map((o) => (
            <option key={o.key} value={o.key}>{o.emoji ? `${o.emoji}  ` : ""}{o.label}{o.hidden ? " (hidden)" : ""}</option>
          ))}
        </Select>
        <ErrorNote message={del.error?.message} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={del.isPending}>Cancel</Button>
          <Button type="button" variant="danger" loading={del.isPending} onClick={() => del.mutate({ kind, key: c.key, moveTo }, { onSuccess: onClose })}>
            <Trash2 size={15} /> Delete and move
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-lg p-1.5 text-subtle transition disabled:opacity-40 ${danger ? "hover:bg-expense/10 hover:text-expense" : "hover:bg-fg/5 hover:text-fg"}`}
    >
      {children}
    </button>
  );
}
