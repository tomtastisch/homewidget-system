// babel.config.js
// Hinweis: Da "type": "module" in package.json gesetzt ist, muss die Babel-Konfiguration
// als ESM exportiert werden. Das vermeidet den Fehler
// "ReferenceError: module is not defined in ES module scope" in Jest/Node 20.
export default function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
}
