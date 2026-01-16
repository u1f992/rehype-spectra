// @ts-check

import { spectra } from "@u1f992/rehype-spectra";

import { defineConfig, VFM } from "@vivliostyle/cli";

export default defineConfig({
  title: "example",
  author: "u1f992",
  theme: "./css",
  entry: ["manuscript.md"],
  documentProcessor: (opts, meta) =>
    VFM(opts, meta).use(spectra, {
      plugins: [
        "autoloader",
        "line-numbers",
        "file-highlight",
        "diff-highlight",
      ],
    }),
});
