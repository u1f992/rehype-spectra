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
      languages: ["c", "css", "typescript", "ocaml"],
      plugins: ["line-numbers", "file-highlight"],
    }),
};

export default vivliostyleConfig;
