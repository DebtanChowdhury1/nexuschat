const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Package-exports resolution picks zustand's ESM build (esm/middleware.mjs)
// for the web platform target, since that file's "react-native" export
// condition — which correctly points at the CJS build — only applies to
// native platforms. The ESM file uses raw `import.meta.env`, which is
// invalid syntax in the CommonJS-style bundle Metro produces for web, so
// the whole web bundle silently failed to execute at all (a syntax error
// in a classic <script>, with no console output and no rendered UI).
// Disabling package-exports resolution falls back to plain "main"-field
// resolution everywhere, which correctly picks the CJS build on every
// platform.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
