// @ts-check

import { spectroscope } from "@u1f992/rehype-spectroscope";

import { defineConfig } from "@vivliostyle/cli";
import { VFM } from "@vivliostyle/vfm";
export default defineConfig({
  title: "example",
  author: "u1f992",
  theme: "./css",
  entry: ["manuscript.md"],
  documentProcessor: (opts, meta) =>
    VFM(opts, meta).use(spectroscope, {
      // languages: ["c", "typescript", "ocaml", "lua"],
      plugins: [
        "autoloader",
        "line-numbers",
        "file-highlight",
        "diff-highlight",
      ],
      stripExistingHighlight: true,
    }),
});
