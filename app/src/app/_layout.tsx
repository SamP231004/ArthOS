import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { C } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.surface, text: C.fg, border: C.border, primary: C.brand },
};

export default function RootLayout() {
  const { hydrated, token, user } = useAuth();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      }),
  );

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  // Clear cached data from the previous account when signing out.
  useEffect(() => {
    if (!token) queryClient.clear();
  }, [token, queryClient]);

  if (!hydrated) return null; // splash stays visible while the session loads

  const signedIn = !!token && !!user;
  const onboarded = signedIn && user!.onboardingCompleted;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="income-form"
              options={{ presentation: 'modal', headerShown: true, title: 'Income', headerStyle: { backgroundColor: C.surface } }}
            />
            <Stack.Screen
              name="expense-form"
              options={{ presentation: 'modal', headerShown: true, title: 'Expense', headerStyle: { backgroundColor: C.surface } }}
            />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
