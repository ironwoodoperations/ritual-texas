import React, { useState } from "react";
import { MessageSquare, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Parse internalNotes — can be JSON array or plain string
export function parseActivityLog(internalNotes, createdDate) {
  if (!internalNotes) return [];
  if (typeof internalNotes === "string") {
    // Try JSON parse
    try {
      const parsed = JSON.parse(internalNotes);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Plain text — migrate to single entry
    if (internalNotes.trim()) {
      return [{ timestamp: createdDate || new Date().toISOString(), author: "Staff", text: internalNotes }];
    }
    return [];
  }
  if (Array.isArray(internalNotes)) return internalNotes;
  return [];
}

export function serializeActivityLog(entries) {
  return JSON.stringify(entries);
}

export function appendLogEntry(internalNotes, createdDate, text, author = "Staff") {
  const existing = parseActivityLog(internalNotes, createdDate);
  const entry = { timestamp: new Date().toISOString(), author, text };
  return serializeActivityLog([...existing, entry]);
}

function formatTs(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch { return ts; }
}

export default function ActivityLog({ record, onUpdate }) {
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch {}
    };
    loadUser();
  }, []);

  const entries = parseActivityLog(record.internalNotes, record.created_date).slice().reverse();

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    const authorName = user?.full_name || "Staff";
    const newLog = appendLogEntry(record.internalNotes, record.created_date, noteText.trim(), authorName);
    await base44.entities.HotelTreatmentIntake.update(record.id, { internalNotes: newLog });
    setNoteText("");
    setSaving(false);
    onUpdate();
  }

  return (
    <div className="space-y-3">
      {/* Note input */}
      <div className="flex gap-2">
        <input
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && addNote()}
          placeholder="Add a note…"
          className="flex-1 text-sm border border-[rgb(220,210,200)] rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[rgb(107,85,64)]"
        />
        <button
          onClick={addNote}
          disabled={saving || !noteText.trim()}
          className="px-3 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-xs disabled:opacity-40 hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          {saving ? "…" : "Log Note"}
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {entries.length === 0 && (
          <p className="text-xs text-[rgb(170,155,140)] italic py-2">No activity yet.</p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="bg-white border border-[rgb(235,225,213)] rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 text-[rgb(180,165,150)] shrink-0" />
              <span className="text-[10px] text-[rgb(150,130,110)]">{formatTs(entry.timestamp)}</span>
              <span className="text-[10px] text-[rgb(150,170,155)] font-medium">{entry.author}</span>
            </div>
            <p className="text-xs text-[rgb(45,45,45)] leading-relaxed">{entry.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}