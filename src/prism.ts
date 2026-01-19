import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import url from "node:url";
import vm from "node:vm";

import { JSDOM } from "jsdom";

import {
  LANGUAGES,
  PLUGINS,
  LANGUAGE_DEPENDENCIES,
} from "./prism-constants.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const loadedLanguagesKey = Symbol();
const prismContextBrand = Symbol();
export type PrismContext = vm.Context & {
  [prismContextBrand]: unknown;
  [loadedLanguagesKey]?: Set<Language>;
};

const moduleCache = new Map<string, vm.Script>();
function readModule(moduleName: string): Pick<vm.Script, "runInContext"> {
  return {
    runInContext(ctx) {
      let cached = moduleCache.get(moduleName);
      if (!cached) {
        const modulePath = require.resolve(moduleName);
        const moduleContent = fs.readFileSync(modulePath, {
          encoding: "utf-8",
        });
        cached = new vm.Script(moduleContent);
        moduleCache.set(moduleName, cached);
      }
      return cached.runInContext(ctx);
    },
  };
}
/**
 * The difference between "prismjs" and "prismjs/components/prism-core.js"
 * is the presence of pre-enabled languages and plugins.
 *
 * - https://github.com/PrismJS/prism/blob/v1.30.0/gulpfile.js/paths.js#L8-L15
 */
const CORE_MODULE = readModule("prismjs/components/prism-core.js");

function readPatch(patchName: string): Pick<vm.Script, "runInContext"> {
  let cached: vm.Script | undefined;
  return {
    runInContext(ctx) {
      if (!cached) {
        const patchPath = path.join(__dirname, "patches", patchName);
        const patchContent = fs.readFileSync(patchPath, { encoding: "utf-8" });
        cached = new vm.Script(patchContent);
      }
      return cached.runInContext(ctx);
    },
  };
}
const AUTOLOADER_OVERRIDE = readPatch("autoloader-override.js");
const DISABLE_AUTO_HIGHLIGHTING = readPatch("disable-auto-highlighting.js");
const DYNAMIC_LANGUAGE_LOADER = readPatch("dynamic-language-loader.js");
const FIX_DIFF_HIGHLIGHT = readPatch("fix-diff-highlight.js");
const HIGHLIGHT_MANUALLY = readPatch("highlight-manually.js");
const XHR_STUB = readPatch("xhr-stub.js");

function disableAutoHighlighting(ctx: vm.Context): void {
  DISABLE_AUTO_HIGHLIGHTING.runInContext(ctx);
}
export function highlightManually(ctx: PrismContext): void {
  HIGHLIGHT_MANUALLY.runInContext(ctx);
}

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
function loadModuleDirectly<T extends string>(
  ctx: PrismContext,
  name: T,
  resolver: (name: T) => string,
): void {
  readModule(resolver(name)).runInContext(ctx);
}

function resolveLanguage(language: Language): string {
  return `prismjs/components/prism-${language}.js`;
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
  loadModuleDirectly(ctx, language, resolveLanguage);
  ctx[loadedLanguagesKey].add(language);
}

export type Plugin = (typeof PLUGINS)[number];
function resolvePlugin(plugin: Plugin): string {
  return `prismjs/plugins/${plugin}/prism-${plugin}.js`;
}

function getAutoloadedLanguages(html: string): Language[] {
  const jsdom = new JSDOM(html, { runScripts: "dangerously" });
  const ctx = loadPrism(jsdom.getInternalVMContext(), true);

  const appendedByAutoloader: string[] = [];
  ctx["__appendedByAutoloader"] = appendedByAutoloader;
  AUTOLOADER_OVERRIDE.runInContext(ctx);

  loadModuleDirectly(ctx, "autoloader", resolvePlugin);
  highlightManually(ctx);

  return appendedByAutoloader
    .map((rawLang) => rawLang.replace(/components\/prism-(.*)\.min\.js/, "$1"))
    .filter((lang) => isLanguage(lang));
}

/**
 * Injects a dynamic language loader that works like autoloader.
 * When Prism encounters an unloaded language, it will be loaded synchronously.
 */
function injectDynamicLanguageLoader(ctx: PrismContext): void {
  ctx["__loadLanguageIfNeeded"] = (lang: string) => {
    if (isLanguage(lang)) {
      loadLanguage(ctx, lang as Language);
      return true;
    }
    return false;
  };
  DYNAMIC_LANGUAGE_LOADER.runInContext(ctx);
}

/**
 * Injects an XMLHttpRequest stub that reads files from the local filesystem.
 * This is required for the file-highlight plugin to work in a Node.js environment.
 */
function injectXhrStub(ctx: PrismContext, baseDir: string): void {
  ctx["__xhrBaseDir"] = baseDir;
  ctx["__xhrReadFileSync"] = (filePath: string) => {
    const resolvedPath = path.resolve(baseDir, filePath);
    return fs.readFileSync(resolvedPath, "utf-8");
  };
  XHR_STUB.runInContext(ctx);
}

export type LoadPluginOptions = {
  html: string;
  baseDir?: string | undefined;
};

export function loadPlugin(
  ctx: PrismContext,
  plugin: Plugin,
  options: LoadPluginOptions,
): void {
  const { html, baseDir } = options;
  switch (plugin) {
    // Known plugins that do not work with straightforward methods
    case "autoloader": {
      const langs = getAutoloadedLanguages(html);
      for (const lang of langs) {
        loadLanguage(ctx, lang);
      }
      injectDynamicLanguageLoader(ctx);
      break;
    }
    case "file-highlight": {
      if (baseDir) {
        injectXhrStub(ctx, baseDir);
      }
      loadModuleDirectly(ctx, plugin, resolvePlugin);
      break;
    }
    case "diff-highlight": {
      loadModuleDirectly(ctx, plugin, resolvePlugin);
      // Apply fix for diff-highlight alignment issue after loading the plugin
      FIX_DIFF_HIGHLIGHT.runInContext(ctx);
      break;
    }
    default: {
      loadModuleDirectly(ctx, plugin, resolvePlugin);
    }
  }
}
