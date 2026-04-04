import React from "react";

export const ApiLinkRenderer = ({ href, children, ...props }: any) => {
  const decodedHref = href ? decodeURIComponent(href) : "";
  
  if (decodedHref.startsWith("#api-link|")) {
    const [, method, path] = decodedHref.split("|");
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          const opblocks = document.querySelectorAll(".opblock");
          let found = false;
          
          for (const block of Array.from(opblocks)) {
            const methodEl = block.querySelector(".opblock-summary-method");
            const pathEl = block.querySelector(".opblock-summary-path");

            const blockMethod = methodEl?.textContent?.trim().toUpperCase();
            const blockPath =
              pathEl?.getAttribute("data-path") ||
              pathEl?.textContent?.trim().replace(/\u200B/g, "");

            if (blockMethod === method && blockPath === path) {
              found = true;
              const isExpanded = block.classList.contains("is-open");
              if (!isExpanded) {
                // Click to expand
                const summaryBtn =
                  block.querySelector(".opblock-summary-control") ||
                  block.querySelector(".opblock-summary");
                (summaryBtn as HTMLElement)?.click();
              }

              setTimeout(() => {
                block.scrollIntoView({ behavior: "smooth", block: "center" });
                // Add a temporary highlight effect
                block.classList.add(
                  "ring-2",
                  "ring-indigo-500",
                  "ring-offset-2",
                  "transition-all",
                  "duration-500"
                );
                setTimeout(() => {
                  block.classList.remove(
                    "ring-2",
                    "ring-indigo-500",
                    "ring-offset-2"
                  );
                }, 2000);
              }, 100);
              break;
            }
          }
          if (!found) {
            console.warn("API endpoint not found in Swagger view:", method, path);
          }
        }}
        className="font-medium text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-1"
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:underline"
      {...props}
    >
      {children}
    </a>
  );
};
