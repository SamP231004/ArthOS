import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, ErrorNote, T } from '@/components/ui';
import { useParseText } from '@/lib/queries';
import { readText, scanAvailable, toDraft } from '@/lib/scan';
import { alpha, F, R, S, useTheme } from '@/theme';

/**
 * Scan a payment screenshot, bank SMS or receipt: pick or take a photo (or paste the SMS), ML Kit reads it on the
 * phone, the backend drafts the transaction, and the normal form opens pre-filled for confirmation.
 */
export default function ScanScreen() {
  const { c } = useTheme();
  const parse = useParseText();
  const [uri, setUri] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function finish(raw: string) {
    const r = await parse.mutateAsync(raw);
    if (!r.usable) {
      setError("Couldn't find an amount in that. Try a clearer, uncropped screenshot — or paste the SMS text below.");
      return;
    }
    const d = toDraft(r);
    router.replace({ pathname: d.kind === 'EXPENSE' ? '/expense-form' : '/income-form', params: { draft: JSON.stringify(d.draft) } });
  }

  async function pick(source: 'library' | 'camera') {
    setError(null);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Camera permission is needed to photograph a receipt.');
    }
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setUri(a.uri);
    setReading(true);
    try {
      await finish(await readText(a.uri));
    } catch {
      setError("Couldn't read that image. Try again, or paste the text instead.");
    } finally {
      setReading(false);
    }
  }

  const busy = reading || parse.isPending;

  return (
    <Screen edges={['bottom']}>
      <T variant="muted">Add a transaction from a payment screenshot (GPay, PhonePe, Paytm, bank app), a bank SMS or a receipt.</T>

      {scanAvailable ? (
        <>
          <View style={{ height: 260, borderRadius: R.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: c.lineStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: alpha(c.fg, 0.02) }}>
            {uri ? (
              <Image source={{ uri }} style={{ width: '100%', height: '100%', opacity: busy ? 0.5 : 1 }} resizeMode="contain" />
            ) : (
              <View style={{ alignItems: 'center', gap: 6, padding: S.lg }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: alpha(c.brand, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c.brand, fontSize: 22 }}>⌗</Text>
                </View>
                <T style={{ fontFamily: F.uiSemibold }}>Choose a screenshot</T>
                <T variant="small" style={{ textAlign: 'center' }}>It&apos;s read on your phone — the image is never uploaded.</T>
              </View>
            )}
            {busy && (
              <View style={{ position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 8 }}>
                <ActivityIndicator color={c.brand} size="small" />
                <T variant="small" style={{ color: c.fg }}>{reading ? 'Reading text…' : 'Working out the details…'}</T>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Button title="Choose screenshot" style={{ flex: 1 }} onPress={() => pick('library')} disabled={busy} />
            <Button title="Take photo" variant="secondary" style={{ flex: 1 }} onPress={() => pick('camera')} disabled={busy} />
          </View>
        </>
      ) : (
        <Card style={{ gap: 4 }}>
          <T style={{ fontFamily: F.uiSemibold }}>Image scanning needs the installed app</T>
          <T variant="small">Expo Go can&apos;t run the on-device text reader. You can still paste an SMS below.</T>
        </Card>
      )}

      <View style={{ gap: S.sm }}>
        <T variant="label">…or paste the SMS / message</T>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          maxLength={20000}
          placeholderTextColor={c.subtle}
          placeholder="Rs.649.00 debited from A/c XX4821 to VPA netflix@hdfcbank…"
          style={{ minHeight: 110, textAlignVertical: 'top', borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.field, color: c.fg, borderRadius: R.md, padding: 14, fontSize: 14, fontFamily: F.ui }}
        />
        <Button title="Read details" variant="secondary" onPress={() => finish(text)} loading={parse.isPending && !reading} disabled={!text.trim() || busy} />
      </View>

      <ErrorNote message={error ?? parse.error?.message ?? null} />
      <Pressable onPress={() => router.back()} hitSlop={8} style={{ alignSelf: 'center' }}>
        <T variant="small">Cancel</T>
      </Pressable>
    </Screen>
  );
}
