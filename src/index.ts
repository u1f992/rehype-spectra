import type * as hast from "hast"; // ^2
import { fromHtml } from "hast-util-from-html"; // ^1
import { toHtml } from "hast-util-to-html"; // ^8
import { JSDOM } from "jsdom";
import type * as unified from "unified"; // ^9

import {
  type Language as PrismLanguage,
  type Plugin as PrismPlugin,
  highlightManually,
  loadPrism,
  loadLanguage,
  loadPlugin,
} from "./prism.js";

export type Config = {
  languages: readonly PrismLanguage[];
  plugins: readonly PrismPlugin[];
};

export const spectroscope: unified.Plugin<[Partial<Config>]> = (config) => {
  const languages = config.languages ?? [];
  const plugins = config.plugins ?? [];

  return (node) => {
    const html = toHtml(node as hast.Root);
    const jsdom = new JSDOM(html, { runScripts: "dangerously" });

    const ctx = loadPrism(jsdom.getInternalVMContext(), true);
    for (const language of languages) {
      loadLanguage(ctx, language);
    }
    for (const plugin of plugins) {
      loadPlugin(ctx, plugin, html);
    }
    highlightManually(ctx);

    return fromHtml(jsdom.serialize());
  };
};
