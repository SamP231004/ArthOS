// Ask Google Play services to download the ML Kit text-recognition model when the app is installed, instead of on
// the first scan (when the first reads would fail with "Waiting for the text optional module to be downloaded").
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withMlkitOcr(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app['meta-data'] = app['meta-data'] ?? [];
    const name = 'com.google.mlkit.vision.DEPENDENCIES';
    if (!app['meta-data'].some((m) => m.$['android:name'] === name)) {
      app['meta-data'].push({ $: { 'android:name': name, 'android:value': 'ocr' } });
    }
    return cfg;
  });
};
