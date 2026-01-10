import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

import { JSDOM } from "jsdom";

import { LANGUAGES, PLUGINS, LANGUAGE_DEPENDENCIES } from "./_prism.js";

const loadedLanguagesKey = Symbol();
const prismContextBrand = Symbol();
export type PrismContext = vm.Context & {
  [prismContextBrand]: unknown;
  [loadedLanguagesKey]?: Set<Language>;
};

const require = createRequire(import.meta.url);
function readModule(moduleName: string): vm.Script {
  const modulePath = require.resolve(moduleName);
  const moduleContent = fs.readFileSync(modulePath, { encoding: "utf-8" });
  return new vm.Script(moduleContent);
}

/**
 * - https://prismjs.com/#manual-highlighting
 * - https://github.com/PrismJS/prism/blob/v1.30.0/prism.js#L1189-L1206
 */
const DISABLE_AUTO_HIGHLIGHTING = new vm.Script(
  "window.Prism = window.Prism || {}; window.Prism.manual = true;",
);
function disableAutoHighlighting(ctx: vm.Context): void {
  DISABLE_AUTO_HIGHLIGHTING.runInContext(ctx);
}

/**
 * The difference between "prismjs" and "prismjs/components/prism-core.js"
 * is the presence of pre-enabled languages and plugins.
 *
 * - https://github.com/PrismJS/prism/blob/v1.30.0/gulpfile.js/paths.js#L8-L15
 */
const CORE_MODULE = readModule("prismjs/components/prism-core.js");
export function loadPrism(ctx: vm.Context, manual: boolean): PrismContext {
  if (manual) {
    disableAutoHighlighting(ctx);
  }
  CORE_MODULE.runInContext(ctx);
  return ctx as PrismContext;
}

export type Language = (typeof LANGUAGES)[number];
function isLanguage(language: string): language is Language {
  return (LANGUAGES as readonly string[]).includes(language);
}
function resolveLanguage(language: Language): string {
  return `prismjs/components/prism-${language}.js`;
}
function loadLanguageDirectly(ctx: PrismContext, language: Language): void {
  const moduleName = resolveLanguage(language);
  const module = readModule(moduleName);
  module.runInContext(ctx);
}
export function loadLanguage(ctx: PrismContext, language: Language): void {
  if (!ctx[loadedLanguagesKey]) {
    ctx[loadedLanguagesKey] = new Set();
  }
  if (ctx[loadedLanguagesKey].has(language)) {
    return;
  }

  const deps = LANGUAGE_DEPENDENCIES[language];
  if (deps) {
    for (const dep of deps) {
      loadLanguage(ctx, dep);
    }
  }
  loadLanguageDirectly(ctx, language);
  ctx[loadedLanguagesKey].add(language);
}

export type Plugin = (typeof PLUGINS)[number];
function resolvePlugin(
  plugin: Plugin,
): `prismjs/plugins/${Plugin}/prism-${Plugin}.js` {
  return `prismjs/plugins/${plugin}/prism-${plugin}.js`;
}
function loadPluginDirectly(ctx: PrismContext, plugin: Plugin) {
  const moduleName = resolvePlugin(plugin);
  const module = readModule(moduleName);
  module.runInContext(ctx);
}

function getAutoloadedLanguages(html: string): Language[] {
  const jsdom = new JSDOM(html, { runScripts: "dangerously" });
  const ctx = loadPrism(jsdom.getInternalVMContext(), true);

  const appendedByAutoloader: string[] = [];
  ctx["__appendedByAutoloader"] = appendedByAutoloader;
  new vm.Script(`
    /**
     * https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L344
     */
    const __document_body_appendChild = document.body.appendChild.bind(
      document.body,
    );
    document.body.appendChild = (node) =>
      node.tagName.toLowerCase() === "script" && __appendedByAutoloader.includes(node.src)
        ? node
        : __document_body_appendChild(node);

    /**
     * https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L333
     */
    const __document_createElement = document.createElement.bind(document);
    document.createElement = (tagName, options) => {
      const elem = __document_createElement(tagName, options);
      if (tagName.toLowerCase() !== "script") {
        return elem;
      }

      /**
       * https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L334
       */
      const elemProto = Object.getPrototypeOf(elem);
      const elemSrc = Object.getOwnPropertyDescriptor(elemProto, "src");
      Object.defineProperty(elem, "src", {
        set(value) {
          __appendedByAutoloader.push(value);
          if (elemSrc && elemSrc.set) {
            elemSrc.set.call(this, value);
          } else {
            this.setAttribute("src", value);
          }
        },
        get() {
          if (elemSrc && elemSrc.get) {
            return elemSrc.get.call(this);
          }
          return this.getAttribute("src");
        },
        configurable: true,
        enumerable: true,
      });
      return elem;
    };
  `).runInContext(ctx);

  loadPluginDirectly(ctx, "autoloader");
  highlightManually(ctx);

  return appendedByAutoloader
    .map((rawLang) => rawLang.replace(/components\/prism-(.*)\.min\.js/, "$1"))
    .filter((lang) => isLanguage(lang));
}

export function loadPlugin(
  ctx: PrismContext,
  plugin: Plugin,
  html: string,
): void {
  switch (plugin) {
    // Known plugins that do not work with straightforward methods
    case "autoloader": {
      const langs = getAutoloadedLanguages(html);
      for (const lang of langs) {
        loadLanguage(ctx, lang);
      }
      break;
    }
    default: {
      loadPluginDirectly(ctx, plugin);
    }
  }
}

/**
 * - https://github.com/PrismJS/prism/blob/v1.30.0/prism.js#L1183-L1206
 */
const HIGHLIGHT_MANUALLY = new vm.Script("Prism.highlightAll();");
export function highlightManually(ctx: PrismContext): void {
  HIGHLIGHT_MANUALLY.runInContext(ctx);
}
