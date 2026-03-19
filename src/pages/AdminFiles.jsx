import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Upload, Download, Copy, Trash2, FileText,
  File, Plus, Search, FolderOpen, ExternalLink, Loader2
} from "lucide-react";

function fileIcon(type) {
  if (type === "pdf") return <div style={{ width: 36, height: 36, background: "#fee2e2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#dc2626", fontFamily: "sans-serif" }}>PDF</div>;
  if (type === "word") return <div style={{ width: 36, height: 36, background: "#dbeafe", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2563eb", fontFamily: "sans-serif" }}>DOC</div>;
  if (type === "excel") return <div style={{ width: 36, height: 36, background: "#dcfce7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#16a34a", fontFamily: "sans-serif" }}>XLS</div>;
  return <div style={{ width: 36, height: 36, background: "rgba(198,168,94,.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><File size={18} color="#C6A85E" /></div>;
}

function detectFileType(filename) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  return "other";
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AdminFiles() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", category: "", file: null });
  const qc = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["file-assets"],
    queryFn: () => base44.entities.FileAsset.list("-created_date", 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FileAsset.delete(id),
    onSuccess: () => qc.invalidateQueries(["file-assets"]),
  });

  const categories = ["all", ...Array.from(new Set(files.map(f => f.category).filter(Boolean)))];

  const filtered = files.filter(f => {
    const matchSearch = !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || f.category === categoryFilter;
    return matchSearch && matchCat;
  });

  async function handleUpload() {
    if (!form.file || !form.name) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: form.file });
      const fileType = detectFileType(form.file.name);
      const fileSize = formatSize(form.file.size);
      await base44.entities.FileAsset.create({
        name: form.name,
        description: form.description,
        category: form.category,
        file_url,
        file_type: fileType,
        file_size: fileSize,
        original_filename: form.file.name,
      });
      qc.invalidateQueries(["file-assets"]);
      setShowUpload(false);
      setForm({ name: "", description: "", category: "", file: null });
    } finally {
      setUploading(false);
    }
  }

  function copyLink(file) {
    navigator.clipboard.writeText(file.file_url);
    setCopied(file.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputStyle = { width: "100%", padding: "10px 12px", background: "rgba(245,240,232,.06)", border: "1px solid rgba(198,168,94,.2)", borderRadius: 8, color: "#F5F0E8", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: "#0C1C2C", fontFamily: "'Georgia', serif", color: "#F5F0E8" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0C1C2C 0%, #132336 100%)", borderBottom: "1px solid rgba(198,168,94,.2)", padding: "20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to={createPageUrl("AdminDashboard")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "rgba(198,168,94,.1)", border: "1px solid rgba(198,168,94,.3)", borderRadius: 8, color: "#C6A85E", textDecoration: "none" }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p style={{ color: "#C6A85E", fontSize: 11, letterSpacing: "3px", margin: "0 0 4px", fontFamily: "sans-serif" }}>HOTEL RITUAL</p>
              <h1 style={{ color: "#F5F0E8", fontSize: 26, fontWeight: 300, margin: 0 }}>File Library</h1>
            </div>
          </div>
          <button onClick={() => setShowUpload(true)} style={{ padding: "8px 16px", background: "#C6A85E", border: "none", borderRadius: 8, color: "#0C1C2C", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Upload File
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9AA8B5" }} />
            <input
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
            {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Files", value: files.length },
            { label: "PDFs", value: files.filter(f => f.file_type === "pdf").length },
            { label: "Word Docs", value: files.filter(f => f.file_type === "word").length },
            { label: "Excel", value: files.filter(f => f.file_type === "excel").length },
          ].map(stat => (
            <div key={stat.label} style={{ background: "rgba(245,240,232,.04)", border: "1px solid rgba(198,168,94,.15)", borderRadius: 10, padding: "10px 16px", flex: 1, minWidth: 100 }}>
              <div style={{ color: "#C6A85E", fontSize: 20, fontWeight: 600, fontFamily: "sans-serif" }}>{stat.value}</div>
              <div style={{ color: "#9AA8B5", fontSize: 11, fontFamily: "sans-serif" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* File list */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9AA8B5" }}><Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9AA8B5", border: "1px dashed rgba(198,168,94,.2)", borderRadius: 12 }}>
            <FolderOpen size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ margin: 0, fontFamily: "sans-serif" }}>{files.length === 0 ? "No files yet — upload your first file." : "No files match your search."}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(file => (
              <div key={file.id} style={{ background: "rgba(245,240,232,.05)", border: "1px solid rgba(198,168,94,.15)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                {fileIcon(file.file_type)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#F5F0E8", fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    {file.category && <span style={{ color: "#C6A85E", fontSize: 11, fontFamily: "sans-serif" }}>{file.category}</span>}
                    {file.file_size && <span style={{ color: "#9AA8B5", fontSize: 11, fontFamily: "sans-serif" }}>{file.file_size}</span>}
                    {file.description && <span style={{ color: "#9AA8B5", fontSize: 12, fontFamily: "sans-serif" }}>{file.description}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <a
                    href={file.file_url}
                    download={file.original_filename || file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "rgba(198,168,94,.1)", border: "1px solid rgba(198,168,94,.25)", borderRadius: 8, color: "#C6A85E", textDecoration: "none" }}
                  >
                    <Download size={15} />
                  </a>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in new tab"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "rgba(245,240,232,.05)", border: "1px solid rgba(198,168,94,.15)", borderRadius: 8, color: "#9AA8B5", textDecoration: "none" }}
                  >
                    <ExternalLink size={15} />
                  </a>
                  <button
                    onClick={() => copyLink(file)}
                    title="Copy link"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: copied === file.id ? "rgba(76,175,80,.15)" : "rgba(245,240,232,.05)", border: `1px solid ${copied === file.id ? "rgba(76,175,80,.4)" : "rgba(198,168,94,.15)"}`, borderRadius: 8, color: copied === file.id ? "#4CAF50" : "#9AA8B5", cursor: "pointer" }}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm("Delete this file?")) deleteMutation.mutate(file.id); }}
                    title="Delete"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "rgba(220,60,60,.08)", border: "1px solid rgba(220,60,60,.2)", borderRadius: 8, color: "#f08080", cursor: "pointer" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#132336", border: "1px solid rgba(198,168,94,.2)", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%" }}>
            <h3 style={{ color: "#C6A85E", fontSize: 11, letterSpacing: "3px", margin: "0 0 20px", fontFamily: "sans-serif" }}>UPLOAD FILE</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ color: "#9AA8B5", fontSize: 11, letterSpacing: "1px", display: "block", marginBottom: 5, fontFamily: "sans-serif" }}>FILE *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      setForm(f => ({ ...f, file, name: f.name || file.name.replace(/\.[^/.]+$/, "") }));
                    }
                  }}
                  style={{ ...inputStyle, cursor: "pointer" }}
                />
              </div>
              <div>
                <label style={{ color: "#9AA8B5", fontSize: 11, letterSpacing: "1px", display: "block", marginBottom: 5, fontFamily: "sans-serif" }}>DISPLAY NAME *</label>
                <input
                  type="text"
                  placeholder="e.g. 2024 Staff Handbook"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ color: "#9AA8B5", fontSize: 11, letterSpacing: "1px", display: "block", marginBottom: 5, fontFamily: "sans-serif" }}>CATEGORY</label>
                <input
                  type="text"
                  placeholder="e.g. HR, Menus, Contracts…"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ color: "#9AA8B5", fontSize: 11, letterSpacing: "1px", display: "block", marginBottom: 5, fontFamily: "sans-serif" }}>DESCRIPTION</label>
                <input
                  type="text"
                  placeholder="Optional short note…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => { setShowUpload(false); setForm({ name: "", description: "", category: "", file: null }); }} style={{ flex: 1, padding: 10, background: "transparent", border: "1px solid rgba(198,168,94,.2)", borderRadius: 8, color: "#9AA8B5", cursor: "pointer", fontFamily: "sans-serif" }}>Cancel</button>
                <button
                  onClick={handleUpload}
                  disabled={!form.file || !form.name || uploading}
                  style={{ flex: 2, padding: 10, background: "#C6A85E", border: "none", borderRadius: 8, color: "#0C1C2C", cursor: "pointer", fontWeight: 700, fontFamily: "sans-serif", opacity: (!form.file || !form.name) ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {uploading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</> : <><Upload size={14} /> Upload</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}