// @ts-check

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRootDir = path.resolve(path.join(import.meta.dirname, ".."));
const outputFile = path.join(projectRootDir, "src", "_prism.ts");
const prismjsDir = path.join(projectRootDir, "node_modules", "prismjs");
/**
 * ```
 * $ tree node_modules/prismjs/components | head -n 10
 * node_modules/prismjs/components
 * ├── index.js
 * ├── prism-abap.js
 * ├── prism-abap.min.js
 * ├── prism-abnf.js
 * ├── prism-abnf.min.js
 * ├── prism-actionscript.js
 * ├── prism-actionscript.min.js
 * ├── prism-ada.js
 * ├── prism-ada.min.js
 * ```
 */
const languagesDir = path.join(prismjsDir, "components");
const languages = fs
  .readdirSync(languagesDir)
  .filter((lang) => /^prism-.*\.js$/.test(lang) && !/\.min\.js$/.test(lang))
  .map((lang) => lang.replace(/^prism-(.*)\.js$/, "$1"))
  // The "components" directory contains not only language files.
  // As of now, "core" appears to be the only non-language component.
  .filter((lang) => lang !== "core");

/**
 * ```
 * $ tree node_modules/prismjs/plugins | head -n 10
 * node_modules/prismjs/plugins
 * ├── autolinker
 * │   ├── prism-autolinker.css
 * │   ├── prism-autolinker.js
 * │   ├── prism-autolinker.min.css
 * │   └── prism-autolinker.min.js
 * ├── autoloader
 * │   ├── prism-autoloader.js
 * │   └── prism-autoloader.min.js
 * ├── command-line
 * ```
 */
const pluginsDir = path.join(prismjsDir, "plugins");
const plugins = fs
  .readdirSync(pluginsDir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      fs.existsSync(
        path.join(pluginsDir, `${entry.name}`, `prism-${entry.name}.js`),
      ),
  )
  .map((dirent) => dirent.name);

/**
 * Language dependencies from components.json
 * The "require" field can be a string or an array of strings.
 */
const componentsJson = JSON.parse(
  fs.readFileSync(path.join(prismjsDir, "components.json"), "utf-8"),
);
/** @type {Record<string, string[]>} */
const languageDependencies = {};
for (const [langId, langInfo] of Object.entries(componentsJson.languages)) {
  if (langId === "meta") continue;
  const info = /** @type {{ require?: string | string[] }} */ (langInfo);
  if (info.require) {
    const deps = Array.isArray(info.require) ? info.require : [info.require];
    languageDependencies[langId] = deps;
  }
}

fs.writeFileSync(
  outputFile,
  [
    "// DO NOT EDIT MANUALLY",
    "export const LANGUAGES = [" +
      languages.map((lang) => `"${lang}"`).join(",") +
      "] as const;",
    "export const PLUGINS = [" +
      plugins.map((plugin) => `"${plugin}"`).join(",") +
      "] as const;",
    "export const LANGUAGE_DEPENDENCIES: Partial<Record<(typeof LANGUAGES)[number], (typeof LANGUAGES)[number][]>> = " +
      JSON.stringify(languageDependencies) +
      ";",
  ].join("\n") + "\n",
  {
    encoding: "utf-8",
  },
);
execSync("npx prettier --write " + outputFile, { cwd: projectRootDir });
