declare const window: {
  setTimeout: (
    callback: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ) => number;
};
declare const document: Document;
declare const __appendedByAutoloader: string[];

interface ScriptNode extends Node {
  tagName: string;
  src: string;
  onload: (() => void) | null;
}

/**
 * Override setTimeout to execute synchronously for autoloader's dependency resolution.
 *
 * - https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L416
 * - https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L510
 */
window.setTimeout = (
  callback: (...args: unknown[]) => void,
  _delay?: number,
  ...args: unknown[]
) => {
  callback(...args);
  return 0;
};

/**
 * https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L344
 */
const __document_body_appendChild = document.body.appendChild.bind(
  document.body,
);
const __autoloaderScripts = new Set<Node>();
document.body.appendChild = <T extends Node>(node: T): T => {
  const scriptNode = node as unknown as ScriptNode;
  if (
    scriptNode.tagName?.toLowerCase() === "script" &&
    __appendedByAutoloader.includes(scriptNode.src)
  ) {
    __autoloaderScripts.add(node);
    /**
     * Immediately trigger onload to let autoloader proceed with dependency chain.
     *
     * - https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L336-L339
     */
    if (scriptNode.onload) {
      scriptNode.onload();
    }
    return node;
  }
  return __document_body_appendChild(node);
};

const __document_body_removeChild = document.body.removeChild.bind(
  document.body,
);
document.body.removeChild = <T extends Node>(node: T): T => {
  if (__autoloaderScripts.has(node)) {
    __autoloaderScripts.delete(node);
    return node;
  }
  return __document_body_removeChild(node);
};

/**
 * https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L333
 */
const __document_createElement = document.createElement.bind(document);
(document.createElement as unknown) = (
  tagName: string,
  options?: ElementCreationOptions,
): HTMLElement => {
  const elem = __document_createElement(tagName, options);
  if (tagName.toLowerCase() !== "script") {
    return elem;
  }

  /**
   * https://github.com/PrismJS/prism/blob/v1.30.0/plugins/autoloader/prism-autoloader.js#L334
   */
  const elemProto = Object.getPrototypeOf(elem) as HTMLElement;
  const elemSrc = Object.getOwnPropertyDescriptor(elemProto, "src");
  Object.defineProperty(elem, "src", {
    set(this: HTMLElement, value: string) {
      __appendedByAutoloader.push(value);
      if (elemSrc?.set) {
        elemSrc.set.call(this, value);
      } else {
        this.setAttribute("src", value);
      }
    },
    get(this: HTMLElement): string {
      if (elemSrc?.get) {
        return elemSrc.get.call(this) as string;
      }
      return this.getAttribute("src") ?? "";
    },
    configurable: true,
    enumerable: true,
  });
  return elem;
};
