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

/**
 * https://github.com/wooorm/refractor/blob/5.0.0/lib/prism-core.js#L7
 */
const CODE_BLOCK_SELECTOR =
  'pre[class*="language-"] > code, ' +
  'pre > code[class*="language-"], ' +
  'pre[class*="lang-"] > code, ' +
  'pre > code[class*="lang-"]';

export type Config = {
  languages?: readonly PrismLanguage[];
  plugins?: readonly PrismPlugin[];
  stripExistingHighlight?: boolean | { selector: string };
};

export const spectra: unified.Plugin<[Config]> = (config) => {
  const languages = config.languages ?? [];
  const plugins = config.plugins ?? [];
  const stripExistingHighlight = config.stripExistingHighlight ?? false;

  return (node, file) => {
    const html = toHtml(node as hast.Root);
    const jsdom = new JSDOM(html, { runScripts: "dangerously" });

    if (stripExistingHighlight) {
      const selector =
        typeof stripExistingHighlight === "object" &&
        "selector" in stripExistingHighlight
          ? stripExistingHighlight.selector
          : CODE_BLOCK_SELECTOR;
      jsdom.window.document.querySelectorAll(selector).forEach((elem) => {
        const textContent = elem.textContent;
        elem.textContent = textContent;
      });
    }

    const ctx = loadPrism(jsdom.getInternalVMContext(), true);
    for (const language of languages) {
      loadLanguage(ctx, language);
    }
    for (const plugin of plugins) {
      loadPlugin(ctx, plugin, { html, baseDir: file.dirname });
    }
    highlightManually(ctx);

    return fromHtml(jsdom.serialize());
  };
};
