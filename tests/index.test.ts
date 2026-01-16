import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import url from "node:url";

import rehype from "rehype"; // ^11, unified: ^9

import { spectra } from "../dist/index.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("Do nothing", () => {
  const htmlPath = path.join(fixturesDir, "empty.html");
  const html = fs.readFileSync(htmlPath, { encoding: "utf-8" });
  const expected = rehype().processSync({ contents: html, path: htmlPath });
  const actual = rehype()
    .use(spectra)
    .processSync({ contents: html, path: htmlPath });
  assert.deepStrictEqual(actual, expected);
});

test("TypeScript with line-numbers plugin", () => {
  const htmlPath = path.join(fixturesDir, "typescript-line-numbers.html");
  const html = fs.readFileSync(htmlPath, { encoding: "utf-8" });
  const result = rehype()
    .use(spectra, { languages: ["typescript"], plugins: ["line-numbers"] })
    .processSync({ contents: html, path: htmlPath });
  const output = String(result);
  assert.ok(output.includes("token"), "Should contain Prism tokens");
  assert.ok(
    output.includes("line-numbers"),
    "Should contain line-numbers class",
  );
});

test("C with diff-highlight plugin", () => {
  const htmlPath = path.join(fixturesDir, "c-diff-highlight.html");
  const html = fs.readFileSync(htmlPath, { encoding: "utf-8" });
  const result = rehype()
    .use(spectra, { languages: ["c", "diff"], plugins: ["diff-highlight"] })
    .processSync({ contents: html, path: htmlPath });
  const output = String(result);
  assert.ok(output.includes("token"), "Should contain Prism tokens");
  assert.ok(
    output.includes("deleted") || output.includes("inserted"),
    "Should contain diff markers",
  );
});

test("OCaml with autoloader plugin", () => {
  const htmlPath = path.join(fixturesDir, "ocaml-autoloader.html");
  const html = fs.readFileSync(htmlPath, { encoding: "utf-8" });
  const result = rehype()
    .use(spectra, { plugins: ["autoloader"] })
    .processSync({ contents: html, path: htmlPath });
  const output = String(result);
  assert.ok(output.includes("token"), "Should contain Prism tokens");
});

test("Lua with file-highlight plugin", () => {
  const htmlPath = path.join(fixturesDir, "lua-file-highlight.html");
  const html = fs.readFileSync(htmlPath, { encoding: "utf-8" });
  const result = rehype()
    .use(spectra, { plugins: ["autoloader", "file-highlight"] })
    .processSync({ contents: html, path: htmlPath });
  const output = String(result);
  assert.ok(output.includes("print"), "Should contain loaded file content");
  assert.ok(output.includes("token"), "Should contain Prism tokens");
});

test("stripExistingHighlight removes previous highlighting", () => {
  const htmlPath = path.join(fixturesDir, "already-highlighted.html");
  const html = fs.readFileSync(htmlPath, { encoding: "utf-8" });
  const result = rehype()
    .use(spectra, {
      languages: ["javascript"],
      stripExistingHighlight: true,
    })
    .processSync({ contents: html, path: htmlPath });
  const output = String(result);
  assert.ok(output.includes("token"), "Should contain Prism tokens");
  assert.ok(output.includes("const"), "Should contain original code text");
});
