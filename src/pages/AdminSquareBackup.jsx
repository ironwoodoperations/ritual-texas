import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Copy, Check, ExternalLink } from "lucide-react";

const SQUARE_LINKS = [
  { label: "Royal", slug: "royal", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/HLBJAKGW6OVLZOP6D7GFJQMO" },
  { label: "Aura", slug: "aura", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/7HLQNBFV7DDE3C4SSMWYWTAL" },
  { label: "Swedish 60", slug: "swedish60", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/YPVKZMCL7BLIMNTW4KYBLGXM" },
  { label: "Swedish 90", slug: "swedish90", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/DKOTRCVJPAU4YZPJNI7PENAC" },
  { label: "Lymphatic", slug: "lymphatic", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/PMSGEU5VO76MMFGT2K4BIFF4" },
  { label: "Shirodhara", slug: "shirodhara", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/QRVGKSUAYAPN7TVOD6MGMWOZ" },
  { label: "Shiro Glow", slug: "shiroglow", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/ZLVRPJR6VVQZO4C63JEQPGKV" },
  { label: "Forgiveness", slug: "forgiveness", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/4LXL6H4CETPOG24Y73BQYYW3" },
  { label: "Reiki", slug: "reiki", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/VIJZXOZCLRSXRDXOO3KPSVEV" },
  { label: "Sound (Private)", slug: "soundprivate", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/HFJVSRHBCZGF2DIJQVY2UXQ3" },
  { label: "Sound (Group)", slug: "soundgroup", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/IQKEIFVAI4PYG4DIDKC5TCRA" },
  { label: "Yoga (Private)", slug: "yogaprivate", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/4KH2D3DUU7PSEMTCCKEQUCK6" },
  { label: "Yoga (Group)", slug: "yogagroup", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/KP4V3SG3R3CYMYCAD3GNDILC" },
  { label: "Dr. Park", slug: "drpark", url: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/KQC3YJ6KP5JFD4S4QGDUVJB5" },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-[rgb(235,225,213)] transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-[rgb(150,150,150)]" />}
    </button>
  );
}

export default function AdminSquareBackup() {
  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl("AdminDashboard")} className="text-[rgb(107,85,64)] hover:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-light text-[rgb(107,85,64)]">Square Booking — Reference Archive</h1>
            <p className="text-xs text-[rgb(150,150,150)]">Archived 2026-03-02 · Replaced by SimplyBook</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Context banner */}
        <div className="bg-[rgb(235,225,213)] rounded-2xl p-4 text-sm text-[rgb(107,85,64)] leading-relaxed">
          <strong>Why this exists:</strong> These are the original Square appointment booking links that were used before switching to SimplyBook. No secrets are stored here — only the public booking URLs. To revert, restore <code className="bg-white/60 px-1 rounded">pages/booking.jsx</code> to use these links per service slug.
        </div>

        {/* SimplyBook info */}
        <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[rgb(107,85,64)] mb-3 tracking-wide">CURRENT — SimplyBook</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2">
              <span className="text-sm text-[rgb(45,45,45)]">Booking Portal</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[rgb(120,120,120)] font-mono">ritualtexas.simplybook.me/v2/</span>
                <CopyButton text="https://ritualtexas.simplybook.me/v2/" />
                <a href="https://ritualtexas.simplybook.me/v2/" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-[rgb(235,225,213)] rounded-lg transition-colors">
                  <ExternalLink className="w-3.5 h-3.5 text-[rgb(150,150,150)]" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2">
              <span className="text-sm text-[rgb(45,45,45)]">Callback Webhook URL</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[rgb(120,120,120)] font-mono truncate max-w-[240px]">/functions/simplybookCallback</span>
                <CopyButton text="https://hotel-ritual-experience-automation-a6e982ce.base44.app/functions/simplybookCallback" />
              </div>
            </div>
          </div>
        </div>

        {/* Square links */}
        <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[rgb(107,85,64)] mb-3 tracking-wide">ARCHIVED — Square Booking Links</h2>
          <div className="space-y-2">
            {SQUARE_LINKS.map((item) => (
              <div key={item.slug} className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-[rgb(45,45,45)] w-32 shrink-0">{item.label}</span>
                  <span className="text-xs text-[rgb(150,150,150)] font-mono truncate hidden sm:block">{item.url.split("/services/")[1]}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <CopyButton text={item.url} />
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-[rgb(235,225,213)] rounded-lg transition-colors">
                    <ExternalLink className="w-3.5 h-3.5 text-[rgb(150,150,150)]" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}