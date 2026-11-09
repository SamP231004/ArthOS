import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, ErrorNote, Input, T } from '@/components/ui';
import { money } from '@/lib/format';
import { heldSummary, parseImport, SOURCES, withSince, type ImportItem, type Parsed, type SourceId } from '@/lib/import';
import { useImportHoldings, useIsinIndex, type ImportResult } from '@/lib/queries';
import { alpha, F, R, S, useTheme } from '@/theme';

import { ArthosOcrModule } from '../../modules/arthos-ocr';

/**
 * Import investments from Zerodha, Groww, other brokers or a CAS. The file is opened and matched on the phone
 * (spreadsheets in JavaScript, PDFs with PDFBox); the server only receives the holdings the user confirms.
 */
const yearAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

function PrivacyNote() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: S.sm, borderWidth: 1, borderColor: alpha(c.income, 0.3), backgroundColor: alpha(c.income, 0.07), borderRadius: R.md, padding: S.md }}>
      <Text style={{ color: c.income, fontSize: 14 }}>🔒</Text>
      <Text style={{ flex: 1, color: c.fg2, fontFamily: F.ui, fontSize: 12.5, lineHeight: 18 }}>
        <Text style={{ fontFamily: F.uiSemibold, color: c.fg }}>Read on your phone.</Text> Your file is never uploaded — it&apos;s opened and matched right here. Only the holdings
        you confirm are saved to your account.
      </Text>
    </View>
  );
}

export default function ImportScreen() {
  const [source, setSource] = useState<SourceId | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const src = SOURCES.find((s) => s.id === source);

  return (
    <Screen edges={['bottom']}>
      {result ? (
        <Done r={result} />
      ) : parsed && source ? (
        <Preview parsed={parsed} source={source} onBack={() => setParsed(null)} onDone={setResult} />
      ) : src ? (
        <Upload src={src} onBack={() => setSource(null)} onParsed={setParsed} />
      ) : (
        <Sources onPick={setSource} />
      )}
    </Screen>
  );
}

function Sources({ onPick }: { onPick: (s: SourceId) => void }) {
  const { c } = useTheme();
  return (
    <>
      <View style={{ gap: 2 }}>
        <T variant="title" style={{ fontSize: 26 }}>Import investments</T>
        <T variant="muted">Bring in what you already own — no typing.</T>
      </View>
      <PrivacyNote />
      {SOURCES.map((s) => (
        <Pressable key={s.id} onPress={() => onPick(s.id)} accessibilityRole="button">
          <Card style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm }}>
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 15 }}>{s.name}</Text>
              {s.exact && <Text style={{ color: c.income, backgroundColor: alpha(c.income, 0.1), borderRadius: R.pill, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, fontSize: 10.5, fontFamily: F.uiSemibold }}>Exact dates</Text>}
            </View>
            <T variant="small">{s.what}</T>
          </Card>
        </Pressable>
      ))}
    </>
  );
}

function Upload({ src, onBack, onParsed }: { src: (typeof SOURCES)[number]; onBack: () => void; onParsed: (p: Parsed) => void }) {
  const { c } = useTheme();
  const index = useIsinIndex(true);
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [password, setPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(f = file, pw = password) {
    if (!f) return;
    if (!index.data) {
      setError(index.isLoading ? 'Still loading the list of stocks and funds — try again in a moment.' : "Couldn't load the list of stocks and funds. Check your connection.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await new File(f.uri).bytes();
      const p = await parseImport(bytes, f.name, index.data, {
        since: yearAgo(),
        password: pw,
        pdfText: async (_bytes, password) => {
          if (!ArthosOcrModule) throw new Error('Reading PDFs needs the ArthOS app build (not Expo Go).');
          return ArthosOcrModule.pdfText(f.uri, password ?? null);
        },
      });
      if (!p.items.length) throw new Error(p.unmatched.length ? 'None of the rows matched an NSE stock or a mutual fund.' : 'No holdings found in this file.');
      onParsed(p);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'PDF_PASSWORD_REQUIRED' || code === 'PDF_PASSWORD_WRONG') {
        setNeedPassword(true);
        setError(code === 'PDF_PASSWORD_WRONG' ? "That password didn't open the PDF." : null);
      } else setError(e instanceof Error ? e.message : "Couldn't read this file.");
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: src.id === 'CAS' ? ['application/pdf'] : ['*/*'] });
    if (r.canceled || !r.assets?.[0]) return;
    const next = { uri: r.assets[0].uri, name: r.assets[0].name ?? 'file' };
    setFile(next);
    setNeedPassword(false);
    setPassword('');
    run(next, '');
  }

  return (
    <>
      <Pressable onPress={onBack} hitSlop={8}>
        <T variant="small">‹ All sources</T>
      </Pressable>
      <View style={{ gap: 2 }}>
        <T variant="title" style={{ fontSize: 24 }}>{src.name}</T>
        <T variant="muted">{src.what}</T>
      </View>
      <Card style={{ gap: 4, backgroundColor: alpha(c.fg, 0.03) }}>
        <T variant="small">How to get the file</T>
        <T style={{ fontSize: 14, lineHeight: 20, color: c.fg2 }}>{src.how}</T>
      </Card>
      <Pressable onPress={pick} disabled={busy} accessibilityRole="button" style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: c.lineStrong, borderRadius: R.lg, paddingVertical: S.xl, alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 22 }}>{busy ? '⏳' : '📄'}</Text>
        <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 15 }}>{file ? file.name : 'Choose your file'}</Text>
        <T variant="small">{src.accepts.replace(/,/g, ' · ')}</T>
      </Pressable>
      {needPassword && (
        <View style={{ gap: S.sm }}>
          <Input label="PDF password" value={password} onChangeText={setPassword} secureTextEntry autoFocus hint="The password you set when requesting the statement. Used only here to open the file." />
          <Button title="Open" loading={busy} onPress={() => run()} />
        </View>
      )}
      <ErrorNote message={error} />
      <PrivacyNote />
    </>
  );
}

function Preview({ parsed, source, onBack, onDone }: { parsed: Parsed; source: SourceId; onBack: () => void; onDone: (r: ImportResult) => void }) {
  const { c } = useTheme();
  const importer = useImportHoldings();
  const [since, setSince] = useState(yearAgo());
  const [off, setOff] = useState<Set<string>>(new Set());
  const items: ImportItem[] = parsed.dated ? parsed.items : withSince(parsed.items, since);
  const chosen = items.filter((i) => !off.has(i.symbol));
  const total = chosen.reduce((s, i) => s + heldSummary(i).invested, 0);
  const validSince = /^\d{4}-\d{2}-\d{2}$/.test(since) && since <= new Date().toISOString().slice(0, 10);

  return (
    <>
      <Pressable onPress={onBack} hitSlop={8}>
        <T variant="small">‹ Choose another file</T>
      </Pressable>
      <View style={{ gap: 2 }}>
        <T variant="title" style={{ fontSize: 24 }}>Check and import</T>
        <T variant="muted">Untick anything you don&apos;t want.</T>
      </View>
      {!parsed.dated && (
        <Card style={{ gap: S.sm }}>
          <Input label="Held since (YYYY-MM-DD)" value={since} onChangeText={setSince} keyboardType="numbers-and-punctuation" hint="Holdings files have no purchase dates, so returns per year (XIRR) are approximate." />
        </Card>
      )}
      <Card style={{ gap: 0, paddingVertical: S.xs }}>
        {items.map((i, n) => {
          const h = heldSummary(i);
          const on = !off.has(i.symbol);
          return (
            <View key={i.symbol} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 10, borderTopWidth: n ? 1 : 0, borderTopColor: c.line }}>
              <Switch
                value={on}
                onValueChange={() =>
                  setOff((o) => {
                    const next = new Set(o);
                    if (next.has(i.symbol)) next.delete(i.symbol);
                    else next.add(i.symbol);
                    return next;
                  })
                }
                trackColor={{ true: alpha(c.brand, 0.45), false: c.lineStrong }}
                thumbColor={on ? c.brand : c.subtle}
              />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: on ? c.fg : c.subtle, fontFamily: F.uiMedium, fontSize: 14, textDecorationLine: on ? 'none' : 'line-through' }}>{i.name}</Text>
                <T variant="small" numberOfLines={1}>
                  {i.assetClass === 'STOCK' ? 'Stock / ETF' : 'Mutual fund'} · {h.quantity} · avg {money(h.avg)}
                </T>
              </View>
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 13.5 }}>{money(Math.round(h.invested))}</Text>
            </View>
          );
        })}
      </Card>
      {parsed.unmatched.length > 0 && (
        <Card style={{ gap: 4, borderColor: alpha(c.warn, 0.35), backgroundColor: alpha(c.warn, 0.07) }}>
          <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 13 }}>{parsed.unmatched.length} row(s) couldn&apos;t be matched and will be skipped</Text>
          {parsed.unmatched.slice(0, 8).map((u) => (
            <T key={u.label} variant="small">{u.label}</T>
          ))}
        </Card>
      )}
      {parsed.notes.map((n) => (
        <T key={n} variant="small">{n}</T>
      ))}
      <T variant="small">These count as investments you already had — they won&apos;t be taken from your savings account or this month&apos;s spending. Importing a newer file from the same source later updates them.</T>
      <ErrorNote message={importer.error?.message} />
      <Button
        title={`Import ${chosen.length} holding${chosen.length === 1 ? '' : 's'} · ${money(Math.round(total))}`}
        size="lg"
        loading={importer.isPending}
        disabled={!chosen.length || (!parsed.dated && !validSince)}
        onPress={() => importer.mutate({ source, items: chosen }, { onSuccess: onDone })}
      />
    </>
  );
}

function Done({ r }: { r: ImportResult }) {
  const { c } = useTheme();
  return (
    <>
      <Card glow style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xl }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: alpha(c.income, 0.15), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.income, fontSize: 24 }}>✓</Text>
        </View>
        <T variant="h2">{r.created} new, {r.updated} updated</T>
        <T variant="small">{r.transactions} transaction{r.transactions === 1 ? '' : 's'} imported · prices update live from now on</T>
      </Card>
      {r.skipped.length > 0 && (
        <Card style={{ gap: 6, borderColor: alpha(c.warn, 0.35), backgroundColor: alpha(c.warn, 0.07) }}>
          {r.skipped.map((s) => (
            <T key={s.name} variant="small">
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold }}>{s.name}</Text> — {s.reason}
            </T>
          ))}
        </Card>
      )}
      <Button title="Done" size="lg" onPress={() => router.back()} />
    </>
  );
}
