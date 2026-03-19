import React, { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

/**
 * Reusable "How to use this page" collapsible banner.
 * Pass `title` and `content` (plain text, supports same formatting as AdminTrainingManual).
 * Pass `accentColor` (optional) for the left border / icon color.
 */
export default function PageHelpBanner({ title, content, accentColor = "rgb(150,170,155)" }) {
  const [open, setOpen] = useState(false);

  const lines = content.split("\n");

  return (
    <div
      className="mb-6 bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[rgb(250,248,245)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
          <span className="text-sm font-medium text-[rgb(107,85,64)]">How to use this page</span>
          {!open && (
            <span className="text-xs text-[rgb(150,150,150)] ml-1 hidden sm:inline">— {title}</span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-[rgb(150,150,150)] shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[rgb(150,150,150)] shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-1.5 border-t border-[rgb(235,225,213)]">
          <p className="text-xs font-semibold tracking-widest text-[rgb(150,150,150)] uppercase mb-3 mt-2">{title}</p>
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-1" />;

            // ALL-CAPS section headers
            if (line === line.toUpperCase() && line.trim().length > 3 && !line.startsWith("•") && !line.match(/^\d\./)) {
              return (
                <p key={i} className="text-xs font-semibold tracking-widest mt-3 mb-0.5" style={{ color: accentColor }}>
                  {line}
                </p>
              );
            }
            // Numbered items
            if (/^\d+\./.test(line.trim())) {
              return <p key={i} className="text-sm text-[rgb(45,45,45)] pl-4">{line}</p>;
            }
            // Bullets
            if (line.trim().startsWith("•")) {
              return <p key={i} className="text-sm text-[rgb(45,45,45)] pl-4">{line}</p>;
            }
            // Pro Tip / CRITICAL callouts
            if (line.startsWith("Pro Tip:") || line.startsWith("CRITICAL:") || line.startsWith("Deposit Policy:")) {
              return (
                <div key={i} className="bg-[rgb(255,248,240)] border border-[rgb(198,182,165)] rounded-xl px-4 py-2.5 mt-2">
                  <p className="text-sm text-[rgb(107,85,64)]">{line}</p>
                </div>
              );
            }
            return <p key={i} className="text-sm text-[rgb(45,45,45)] leading-relaxed">{line}</p>;
          })}
        </div>
      )}
    </div>
  );
}