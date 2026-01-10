// @ts-check

import { spectroscope } from "@u1f992/rehype-spectroscope";

import { VFM } from "@vivliostyle/vfm";

/** @type {import('@vivliostyle/cli').VivliostyleConfigSchema} */
const vivliostyleConfig = {
  title: "example",
  author: "u1f992",
  theme: "./css",
  entry: ["manuscript.md"],
  documentProcessor: (opts, meta) =>
    VFM(opts, meta).use(spectroscope, {
      // languages: ["c", "typescript", "ocaml", "lua"],
      plugins: ["autoloader", "line-numbers", "file-highlight"],
      stripExistingHighlight: true,
    }),
};

export default vivliostyleConfig;
