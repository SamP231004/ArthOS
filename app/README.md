# ArthOS App (Android-first)

Built with Expo SDK 58, Expo Router (native tabs), React Query, Zustand and expo-secure-store.

Routes are in `src/app/`. `Stack.Protected` in `_layout.tsx` sends signed-out users to login/register, new users to onboarding, and everyone else to the tabs (Home · Income · Expenses · Settings).
`income-form` and `expense-form` are modal routes; pass `?id=` to edit an existing entry.

```bash
cp .env.example .env         # EXPO_PUBLIC_API_URL
npm install
npx expo start --android     # emulator or Expo Go
npm run typecheck && npm run lint
npx expo-doctor
```

Build an APK or AAB with EAS: `npx eas-cli@latest build -p android`.
Don't edit `android/` or `ios/` by hand; configure native settings in `app.json` instead.
