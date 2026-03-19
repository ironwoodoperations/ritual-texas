import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, RefreshCw, Download, Search, Loader2 } from "lucide-react";
import PageHelpBanner from "@/components/PageHelpBanner";

const HELP_CONTENT = `Your unified guest database — every person who has booked a room, treatment, or attended an event.

1. Sync All Data: Click "Sync Now" to pull latest records from Cloudbeds, SimplyBook, and Square. Run weekly.
2. Search a Guest: Type name, email, or phone to pull a complete record.
3. Guest Profile: Contact info, stay history, treatment history, total spend, last visit date, and notes.
4. Filter by Tag: Use the tag dropdown to segment by source (hotel, spa, square, etc.).
5. Export CSV: Filter first, then click Export CSV to download a list for email campaigns.

Pro Tip: Before every shift, pull up today's arriving guests in the CRM. Knowing their history turns a transactional check-in into a reunion.`;
import { Input } from "@/components/ui/input";

export default function AdminMasterCRM() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== "admin") {
          window.location.href = createPageUrl("Home");
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl("AdminMasterCRM"));
      }
    };
    checkAuth();
  }, []);

  const { data: contacts = [], isLoading, refetch } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: () => base44.entities.CrmContact.list("-lastActivityAt", 500),
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter(c => {
      const hay = `${c.fullName || ""} ${c.email || ""} ${c.phone || ""}`.toLowerCase();
      const okQ = !q || hay.includes(q);
      const okTag = !tagFilter || (c.tags || []).includes(tagFilter);
      return okQ && okTag;
    });
  }, [contacts, search, tagFilter]);

  const allTags = useMemo(() => {
    const set = new Set();
    contacts.forEach(c => {
      (c.tags || []).forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [contacts]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke("crmSyncAll", {});
      setSyncResult(res.data);
      await refetch();
    } catch (e) {
      setSyncResult({ ok: false, error: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (tagFilter) params.set("tag", tagFilter);
    params.set("marketingOptInOnly", "true");
    params.set("doNotContactExclude", "true");
    window.location.href = `/api/functions/crmExportCsv?${params.toString()}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("AdminDashboard")} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Master CRM</h1>
              <p className="text-sm text-[rgb(150,150,150)]">Unified contacts across Cloudbeds, Square, Acuity, SimplyBook</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Controls */}
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-6 mb-6">
          <div className="grid gap-4 mb-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-[rgb(150,150,150)] mb-1 block">Search</label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, phone…"
                className="border-[rgb(235,225,213)]"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-[rgb(150,150,150)] mb-1 block">Filter by Tag</label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full border border-[rgb(235,225,213)] rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">All Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-[rgb(150,170,155)] text-white text-sm rounded-lg hover:bg-[rgb(130,150,135)] disabled:opacity-50 transition-colors"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? "Syncing…" : "Sync Now"}
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 border border-[rgb(235,225,213)] text-[rgb(107,85,64)] text-sm rounded-lg hover:bg-[rgb(235,225,213)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-[rgb(235,225,213)] text-[rgb(107,85,64)] text-sm rounded-lg hover:bg-[rgb(235,225,213)] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className={`border rounded-lg p-4 mb-6 ${syncResult.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className={`text-sm font-medium ${syncResult.ok ? "text-green-800" : "text-red-800"} mb-2`}>
              {syncResult.ok ? "✓ Sync completed" : "✗ Sync failed"}
            </div>
            {syncResult.results && (
              <div className="text-xs space-y-1 text-[rgb(45,45,45)]">
                <div>Cloudbeds: {syncResult.results.cloudbeds?.pulled || 0} pulled · {syncResult.results.cloudbeds?.contacts || 0} contacts · {syncResult.results.cloudbeds?.events || 0} events</div>
                <div>Square: {syncResult.results.square?.pulled || 0} pulled · {syncResult.results.square?.contacts || 0} contacts · {syncResult.results.square?.events || 0} events</div>
                <div>Acuity: {syncResult.results.acuity?.pulled || 0} pulled · {syncResult.results.acuity?.contacts || 0} contacts · {syncResult.results.acuity?.events || 0} events</div>
                <div>SimplyBook: {syncResult.results.simplybook?.pulled || 0} pulled · {syncResult.results.simplybook?.contacts || 0} contacts · {syncResult.results.simplybook?.events || 0} events</div>
              </div>
            )}
            {syncResult.error && <div className="text-xs text-red-800 mt-2">{syncResult.error}</div>}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-4 text-center">
            <div className="text-2xl font-light text-[rgb(107,85,64)]">{contacts.length}</div>
            <div className="text-xs uppercase tracking-wide text-[rgb(150,150,150)]">Total Contacts</div>
          </div>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-4 text-center">
            <div className="text-2xl font-light text-[rgb(150,170,155)]">{filtered.length}</div>
            <div className="text-xs uppercase tracking-wide text-[rgb(150,150,150)]">Filtered</div>
          </div>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-4 text-center">
            <div className="text-2xl font-light text-[rgb(107,85,64)]">{contacts.filter(c => c.marketingOptIn).length}</div>
            <div className="text-xs uppercase tracking-wide text-[rgb(150,150,150)]">Opted In</div>
          </div>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-4 text-center">
            <div className="text-2xl font-light text-[rgb(107,85,64)]">${contacts.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0).toFixed(0)}</div>
            <div className="text-xs uppercase tracking-wide text-[rgb(150,150,150)]">LTV</div>
          </div>
        </div>

        {/* Contacts List */}
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[rgb(150,150,150)]">No contacts found.</div>
          ) : (
            <div className="divide-y divide-[rgb(235,225,213)]">
              {filtered.map((c) => (
                <div key={c.id} className="p-4 hover:bg-[rgb(248,246,242)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium text-[rgb(107,85,64)]">{c.fullName || "Unnamed"}</div>
                      <div className="text-sm text-[rgb(45,45,45)] mt-1">
                        {c.email && <div>{c.email}</div>}
                        {c.phone && <div>{c.phone}</div>}
                      </div>
                      {(c.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.tags.map((t) => (
                            <span key={t} className="inline-block text-xs px-2 py-1 rounded-full border border-[rgb(235,225,213)] text-[rgb(107,85,64)]">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {c.notes && (
                        <div className="text-xs text-[rgb(150,150,150)] mt-2 italic">"{c.notes}"</div>
                      )}
                    </div>
                    <div className="text-right text-sm text-[rgb(150,150,150)]">
                      <div className="font-medium text-[rgb(107,85,64)]">${Number(c.lifetimeValue || 0).toFixed(2)}</div>
                      <div className="text-xs">{c.totalBookings || 0} bookings</div>
                      <div className="text-xs mt-1">
                        {c.marketingOptIn ? "✓ Opted In" : "✗ Opted Out"}
                      </div>
                      {c.lastActivityAt && (
                        <div className="text-xs mt-1">{new Date(c.lastActivityAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}