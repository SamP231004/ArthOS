import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { TiroDevanagariHindi_400Regular } from '@expo-google-fonts/tiro-devanagari-hindi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';

import { ApiError } from '@/lib/api';
import { useAuth, useHydrated } from '@/lib/auth-store';
import { F, ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    IBMPlexMono_400Regular,
    TiroDevanagariHindi_400Regular,
  });
  // Never trap the user on the splash screen: render with system fonts if custom fonts fail or are slow.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const fontsLoaded = fontsReady || !!fontError || fontTimeout;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2 },
        },
      }),
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppStack fontsLoaded={fontsLoaded} queryClient={queryClient} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function AppStack({ fontsLoaded, queryClient }: { fontsLoaded: boolean; queryClient: QueryClient }) {
  const { token, user } = useAuth();
  const hydrated = useHydrated();
  const { c, scheme, ready } = useTheme();
  const isReady = hydrated && fontsLoaded && ready;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  // Clear cached data from the previous account when signing out.
  useEffect(() => {
    if (!token) queryClient.clear();
  }, [token, queryClient]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.fg, border: c.line, primary: c.brand } };
  }, [scheme, c]);

  if (!isReady) return null; // splash stays visible while the session, fonts and theme load

  const signedIn = !!token && !!user;
  const onboarded = signedIn && user!.onboardingCompleted;
  const modal = {
    presentation: 'modal' as const,
    headerShown: true,
    headerStyle: { backgroundColor: c.surface },
    headerTintColor: c.fg,
    headerTitleStyle: { fontFamily: F.display, fontSize: 22 },
    headerShadowVisible: false,
  };

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="income-form" options={{ ...modal, title: 'Income' }} />
          <Stack.Screen name="expense-form" options={{ ...modal, title: 'Expense' }} />
          <Stack.Screen name="add-holding" options={{ ...modal, title: 'Add investment' }} />
          <Stack.Screen name="scan" options={{ ...modal, title: 'Scan a screenshot' }} />
          <Stack.Screen name="holding" options={{ ...modal, title: 'Holding' }} />
          <Stack.Screen name="settings" options={{ ...modal, presentation: 'card', title: 'Settings' }} />
        </Stack.Protected>
      </Stack>
    </NavThemeProvider>
  );
}
