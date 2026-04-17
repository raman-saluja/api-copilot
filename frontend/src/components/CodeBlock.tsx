import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { codeToHtml } from "shiki";

function CodeBlock({ children, className }: ComponentPropsWithoutRef<"code">) {
  const [html, setHtml] = useState("");
  const lang = className?.replace("language-", "") || "text";

  useEffect(() => {
    codeToHtml(String(children), {
      lang,
      themes: { dark: "github-dark", light: "github-light" },
    }).then(setHtml);
  }, [children, lang]);

  if (!html)
    return (
      <pre>
        <code>{children}</code>
      </pre>
    );
  return (
    <div
      className="inline-flex px-1 border border-slate-200 rounded-2xl overflow-x-auto max-w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default CodeBlock;
