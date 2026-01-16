declare const Prism: {
  hooks: {
    add: (
      name: string,
      callback: (env: { language: string; element: Element }) => void,
    ) => void;
  };
  languages: Record<string, unknown>;
  highlightElement: (element: Element) => void;
};
declare const __loadLanguageIfNeeded: (lang: string) => boolean;

Prism.hooks.add("complete", function (env) {
  const language = env.language;
  if (!language || language === "none") return;

  if (!Prism.languages[language]) {
    if (__loadLanguageIfNeeded(language)) {
      Prism.highlightElement(env.element);
    }
  }
});
