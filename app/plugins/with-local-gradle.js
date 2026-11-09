// Points the Gradle wrapper at a pre-downloaded distribution when GRADLE_DIST_FILE is set (the GitHub Actions APK
// build sets it after fetching Gradle with retries and caching it). That build kept failing when
// services.gradle.org answered 504 / timed out. Without the env var — local and EAS cloud builds — nothing changes.
// It only switches when the downloaded file is the same Gradle version the project asks for.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withLocalGradle(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const file = process.env.GRADLE_DIST_FILE;
      if (!file || !fs.existsSync(file)) return cfg;
      const props = path.join(cfg.modRequest.platformProjectRoot, 'gradle', 'wrapper', 'gradle-wrapper.properties');
      if (!fs.existsSync(props)) return cfg;
      const text = fs.readFileSync(props, 'utf8');
      const wanted = text.match(/gradle-([\d.]+)-(?:bin|all)\.zip/)?.[1];
      const have = path.basename(file).match(/gradle-([\d.]+)-bin\.zip/)?.[1];
      if (!wanted || wanted !== have) return cfg;
      const url = 'file\\:' + file.replace(/\\/g, '/');
      fs.writeFileSync(props, text.replace(/^distributionUrl=.*$/m, `distributionUrl=${url}`));
      return cfg;
    },
  ]);
};
