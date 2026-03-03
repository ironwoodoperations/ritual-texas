import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Upload, ArrowLeft, Copy, Check } from 'lucide-react';

export default function AdminSimplybookImport() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('AdminSimplybookImport'));
      }
    };
    loadUser();
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const fileUrl = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl.file_url,
        json_schema: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: { type: 'object' }
            }
          }
        }
      });

      const response = await base44.functions.invoke('importSimplybookClients', {
        rows: extracted.output?.rows || extracted.output || []
      });

      if (response.data?.success) {
        setResults(response.data);
      } else {
        setError(response.data?.error || 'Import failed');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyError = () => {
    navigator.clipboard.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">Import SimplyBook Clients</h1>
            <p className="text-sm text-[rgb(45,45,45)]">Upload CSV or Excel file from SimplyBook</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-[rgb(45,45,45)] mb-3">
              Select CSV or Excel File
            </label>
            <div className="flex gap-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1 px-4 py-2 border border-[rgb(235,225,213)] rounded-lg text-sm"
              />
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex items-center gap-2 px-6 py-2 bg-[rgb(150,170,155)] text-white rounded-lg hover:bg-[rgb(130,150,135)] disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-red-800">Error:</p>
                  <textarea
                    value={error}
                    readOnly
                    className="w-full mt-2 p-3 bg-white border border-red-200 rounded text-xs font-mono text-red-700 h-32 resize-none"
                  />
                </div>
                <button
                  onClick={copyError}
                  className="ml-2 p-2 text-red-600 hover:bg-red-100 rounded"
                  title="Copy error"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">✓ Import successful!</p>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-green-600 text-xs">Contacts Created</p>
                  <p className="text-lg font-bold text-green-800">{results.contactsCreated}</p>
                </div>
                <div>
                  <p className="text-green-600 text-xs">Events Created</p>
                  <p className="text-lg font-bold text-green-800">{results.eventsCreated}</p>
                </div>
                <div>
                  <p className="text-green-600 text-xs">Total Rows</p>
                  <p className="text-lg font-bold text-green-800">{results.totalRows}</p>
                </div>
              </div>
              {results.errors && results.errors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-xs text-green-700 font-medium">Issues encountered:</p>
                  <ul className="text-xs text-green-600 mt-2 space-y-1">
                    {results.errors.map((err, i) => <li key={i}>• {err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}