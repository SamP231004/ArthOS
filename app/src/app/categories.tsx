import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Segmented, T } from '@/components/ui';
import {
  categoryUsage,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type CategoryKind,
  type CategoryView,
} from '@/lib/categories';
import { alpha, F, R, S, useTheme } from '@/theme';

/**
 * Settings → Categories: rename or hide the built-ins, add your own, delete your own (moving their entries to a
 * category you pick). Mirrors web/src/components/settings/category-manager.tsx.
 */
export default function CategoriesScreen() {
  const { c } = useTheme();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const cats = useCategories(kind);
  const create = useCreateCategory();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [deleting, setDeleting] = useState<CategoryView | null>(null);

  const add = () => {
    if (!name.trim()) return;
    create.mutate({ kind, label: name.trim(), emoji: emoji.trim() || undefined }, { onSuccess: () => { setName(''); setEmoji(''); } });
  };

  return (
    <Screen edges={['bottom']}>
      <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense categories' }, { value: 'income', label: 'Income types' }]} />

      <Card style={{ padding: 0 }}>
        {cats.all.map((x, i) => (
          <Row key={x.key} kind={kind} x={x} first={i === 0} onDelete={() => setDeleting(x)} />
        ))}
      </Card>

      <Card style={{ gap: S.sm }}>
        <T variant="label">Add your own</T>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Field value={emoji} onChangeText={setEmoji} placeholder="🙂" maxLength={4} width={56} center />
          <Field value={name} onChangeText={setName} placeholder={kind === 'expense' ? 'e.g. Pets' : 'e.g. Rental'} maxLength={30} />
        </View>
        <Button title="Add" onPress={add} loading={create.isPending} disabled={!name.trim()} />
        <ErrorNote message={create.error?.message} />
      </Card>
      <T variant="small" style={{ color: c.subtle }}>Hidden ones disappear from pickers but stay on past entries. Renaming keeps every entry where it is.</T>

      {deleting && <DeleteSheet kind={kind} x={deleting} options={cats.all.filter((o) => o.key !== deleting.key)} onClose={() => setDeleting(null)} />}
    </Screen>
  );
}

function Row({ kind, x, first, onDelete }: { kind: CategoryKind; x: CategoryView; first: boolean; onDelete: () => void }) {
  const { c } = useTheme();
  const update = useUpdateCategory();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(x.label);
  const [emoji, setEmoji] = useState(x.emoji ?? '');
  const save = () => update.mutate({ kind, key: x.key, label: label.trim(), emoji: emoji.trim() }, { onSuccess: () => setEditing(false) });

  return (
    <View style={{ paddingHorizontal: S.md, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.line, opacity: x.hidden && !editing ? 0.55 : 1, gap: 6 }}>
      {editing ? (
        <>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Field value={emoji} onChangeText={setEmoji} maxLength={4} width={52} center />
            <Field value={label} onChangeText={setLabel} maxLength={30} autoFocus onSubmitEditing={save} />
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm, justifyContent: 'flex-end' }}>
            <Chip label="Cancel" onPress={() => { setEditing(false); setLabel(x.label); setEmoji(x.emoji ?? ''); }} />
            <Chip label={update.isPending ? 'Saving…' : 'Save'} active onPress={save} />
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Text style={{ width: 26, textAlign: 'center', fontSize: 17 }}>{x.emoji ?? '•'}</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 15 }} numberOfLines={1}>{x.label}</Text>
            {!x.builtIn && <Text style={{ color: c.brand, backgroundColor: alpha(c.brand, 0.1), fontFamily: F.uiMedium, fontSize: 10.5, borderRadius: 4, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 1 }}>yours</Text>}
            {x.hidden && <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11.5 }}>hidden</Text>}
          </View>
          <Action icon="pencil" label={`Rename ${x.label}`} onPress={() => setEditing(true)} />
          {x.key !== 'OTHER' && <Action icon={x.hidden ? 'eye-off' : 'eye'} label={x.hidden ? `Show ${x.label}` : `Hide ${x.label}`} onPress={() => update.mutate({ kind, key: x.key, hidden: !x.hidden })} />}
          {!x.builtIn && <Action icon="trash" label={`Delete ${x.label}`} danger onPress={onDelete} />}
        </View>
      )}
      {update.error && <Text style={{ color: c.expense, fontFamily: F.ui, fontSize: 12 }}>{update.error.message}</Text>}
    </View>
  );
}

function DeleteSheet({ kind, x, options, onClose }: { kind: CategoryKind; x: CategoryView; options: CategoryView[]; onClose: () => void }) {
  const { c } = useTheme();
  const del = useDeleteCategory();
  const [moveTo, setMoveTo] = useState('OTHER');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    categoryUsage(kind, x.key).then((r) => live && setCount(r.count)).catch(() => live && setCount(null));
    return () => {
      live = false;
    };
  }, [kind, x.key]);
  const noun = (n: number) => (kind === 'expense' ? (n === 1 ? 'expense' : 'expenses') : n === 1 ? 'income entry' : 'income entries');

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {
      if (!del.isPending) onClose();
    }}>
      <Pressable onPress={() => !del.isPending && onClose()} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: S.lg, gap: S.md, maxHeight: '80%' }}>
          <T variant="title" style={{ fontSize: 22 }}>Delete {x.label}?</T>
          <T variant="muted">
            {count == null ? 'Checking how many entries use it…' : count === 0 ? 'Nothing is filed under it yet. Pick where future matches go:' : `${count} ${noun(count)} will move to:`}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {options.map((o) => (
              <Chip key={o.key} label={`${o.emoji ? `${o.emoji} ` : ''}${o.label}${o.hidden ? ' (hidden)' : ''}`} active={moveTo === o.key} onPress={() => setMoveTo(o.key)} />
            ))}
          </View>
          <ErrorNote message={del.error?.message} />
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Button title="Cancel" variant="secondary" onPress={onClose} disabled={del.isPending} style={{ flex: 1 }} />
            <Button title="Delete and move" variant="danger" loading={del.isPending} onPress={() => del.mutate({ kind, key: x.key, moveTo }, { onSuccess: onClose })} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Lucide's pencil, eye, eye-off and trash (ISC), drawn with react-native-svg — the same icons as the web settings. */
const ICONS: Record<'pencil' | 'eye' | 'eye-off' | 'trash', string[]> = {
  pencil: ['M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z', 'm15 5 4 4'],
  eye: ['M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  'eye-off': [
    'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49',
    'M14.084 14.158a3 3 0 0 1-4.242-4.242',
    'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143',
    'm2 2 20 20',
  ],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6'],
};

function Action({ icon, label, onPress, danger }: { icon: keyof typeof ICONS; label: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  const color = danger ? c.expense : c.muted;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? alpha(danger ? c.expense : c.fg, 0.08) : 'transparent' })}
    >
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon].map((d) => (
          <Path key={d} d={d} />
        ))}
      </Svg>
    </Pressable>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { width?: number; center?: boolean }) {
  const { c } = useTheme();
  const { width, center, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={c.subtle}
      {...rest}
      style={[{ width, flex: width ? undefined : 1, borderWidth: 1, borderColor: c.lineStrong, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10, color: c.fg, fontFamily: F.ui, fontSize: 15, textAlign: center ? 'center' : 'left', backgroundColor: c.surface }, style]}
    />
  );
}
