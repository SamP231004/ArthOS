// The app is portrait-only ("orientation": "portrait" in app.json). Android reads that as *requiring*
// android.hardware.screen.portrait, and Google Play then hides the app from devices that don't report the feature
// (tablets, Chromebooks, Android XR) and blocks the release review. Declaring the screen features optional keeps the
// portrait layout but lets every device install it.
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURES = ['android.hardware.screen.portrait', 'android.hardware.screen.landscape'];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] ?? [];
    for (const name of FEATURES) {
      const existing = manifest['uses-feature'].find((f) => f.$?.['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
};
