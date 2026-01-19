/**
 * Fix for Prism diff-highlight plugin alignment issue.
 *
 * Problem: PHP's `<?php` delimiter starts a block that spans multiple lines,
 * creating a `<span class="token php language-php">` wrapper around all subsequent
 * code. When diff-highlight processes this multi-line wrapper structure, it
 * generates an erroneous prefix span before the wrapper's closing tag.
 *
 * Other templating languages (ERB, EJS, Twig, etc.) use self-contained tags
 * that open and close on the same line, so they don't have this issue.
 *
 * This patch removes erroneous prefix spans that are followed only by closing tags.
 *
 * This patch should be applied AFTER loading diff-highlight plugin.
 */

declare const Prism: {
  hooks: {
    add(name: string, callback: (env: WrapEnv) => void): void;
  };
};

declare const document: Document;

interface WrapEnv {
  type: string;
  content: string;
  language: string;
}

Prism.hooks.add("wrap", function (env: WrapEnv) {
  if (env.type !== "unchanged") {
    return;
  }

  // Parse the content as HTML
  const container = document.createElement("div");
  container.innerHTML = env.content;

  // Find all prefix spans
  const prefixSpans = container.querySelectorAll("span.token.prefix");

  for (const prefixSpan of prefixSpans) {
    // Check if this prefix span is followed only by closing tags (no text content after it)
    let node: Node | null = prefixSpan;
    let hasContentAfter = false;

    while ((node = node.nextSibling)) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Check if there's any non-whitespace text
        if (node.textContent && node.textContent.trim() !== "") {
          hasContentAfter = true;
          break;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        hasContentAfter = true;
        break;
      }
    }

    // If no content after this prefix, it's erroneous - remove it
    if (!hasContentAfter) {
      prefixSpan.remove();
    }
  }

  env.content = container.innerHTML;
});
