/**
 * Strip `export {};` from compiled patch files.
 *
 * TypeScript's `isolatedModules` option causes the compiler to add `export {};`
 * to files that have no imports/exports. Since patch files are executed via
 * `vm.Script`, ES module syntax causes a SyntaxError.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const patchesDir = path.join(__dirname, "..", "dist", "patches");

for (const file of fs.readdirSync(patchesDir)) {
  if (!file.endsWith(".js")) continue;

  const filePath = path.join(patchesDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  const stripped = content.replace(/^export \{\};\n/m, "");
  fs.writeFileSync(filePath, stripped);
}
