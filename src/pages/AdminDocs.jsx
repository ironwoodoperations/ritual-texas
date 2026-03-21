import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, FileText, BookOpen } from "lucide-react";

const DOCS = [
  {
    title: "Project Technical Specification",
    description: "Full architecture: database schema, backend functions, integrations, pages, and patterns.",
    page: "AdminBase44",
    icon: FileText,
    color: "rgb(107,85,64)",
  },
  {
    title: "Intake Page — Technical Documentation",
    description: "Complete reference for the Reservation Intake pipeline: entities, backend functions, APIs, workflows, and UI logic.",
    page: "AdminIntakeDocs",
    icon: BookOpen,
    color: "rgb(150,170,155)",
  },
];

export default function AdminDocs() {
  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to={createPageUrl("AdminDashboard")} className="p-2 rounded-xl hover:bg-[rgb(248,246,242)]">
            <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
          </Link>
          <div>
            <h1 className="text-lg font-medium text-[rgb(107,85,64)]">Technical Documentation</h1>
            <p className="text-xs text-[rgb(150,150,150)]">Architecture specs and page references</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {DOCS.map(doc => (
            <Link
              key={doc.page}
              to={createPageUrl(doc.page)}
              className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6 hover:shadow-md hover:border-[rgb(198,182,165)] transition-all group"
            >
              <doc.icon className="w-7 h-7 mb-4" style={{ color: doc.color }} />
              <h2 className="text-base font-medium text-[rgb(45,45,45)] group-hover:text-[rgb(107,85,64)] mb-2">{doc.title}</h2>
              <p className="text-sm text-[rgb(120,120,120)] leading-relaxed">{doc.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}