// App entry: Expo Router, plus the Android home-screen widgets (Phase 6). The widget task handler and settings
// screen must be registered at startup, because Android launches them headlessly / in their own activity.
import 'expo-router/entry';

import { Platform } from 'react-native';
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

import { WidgetConfigScreen } from '@/widgets/config-screen';
import { widgetTaskHandler } from '@/widgets/task-handler';

if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigScreen);
}
