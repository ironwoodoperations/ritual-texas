import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AdminCloudbedsImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (user.role !== 'admin') navigate(createPageUrl('Home'));
      } catch {
        navigate(createPageUrl('Home'));
      }
    };
    checkAuth();
  }, [navigate]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload file
      const uploadResp = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResp.file_url;

      // Use extract_data to parse the XLSX
      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            Name: { type: 'string' },
            Email: { type: 'string' },
            'Phone Number': { type: 'string' },
            Mobile: { type: 'string' },
            'Check in Date': { type: 'string' },
            'Check out Date': { type: 'string' },
            'Room Type': { type: 'string' },
            'Room Number': { type: 'string' },
            'Reservation Number': { type: 'string' },
            'Grand Total': { type: 'number' },
            Status: { type: 'string' },
            Nights: { type: 'string' },
            Adults: { type: 'string' },
            Children: { type: 'string' }
          }
        }
      };

      const extractResp = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      if (extractResp.status !== 'success' || !extractResp.output) {
        setError('Failed to parse file');
        return;
      }

      // Call import function
      const importResp = await base44.functions.invoke('importCloudbedsReservations', {
        rows: extractResp.output
      });

      if (importResp.data?.error) {
        setError(importResp.data.error);
        setLoading(false);
        return;
      }

      setResult(importResp.data);
      setFile(null);
    } catch (e) {
      setError(e.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)] p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-light text-[rgb(107,85,64)] mb-8">Import Cloudbeds Reservations</h1>

        <div className="bg-white rounded-2xl border border-[rgb(235,225,213)] p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-[rgb(45,45,45)] mb-3">
              Select Cloudbeds Export (XLSX)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border border-[rgb(235,225,213)] rounded-lg focus:outline-none focus:border-[rgb(150,170,155)]"
            />
            {file && <p className="text-sm text-[rgb(150,170,155)] mt-2">✓ {file.name}</p>}
          </div>

          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full px-6 py-3 bg-[rgb(150,170,155)] text-white rounded-lg hover:bg-[rgb(130,150,135)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {loading ? 'Importing...' : 'Import Reservations'}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <div className="font-medium mb-2">✓ Import Complete</div>
              <div className="text-sm space-y-1">
                <p>Contacts created: {result.contactsCreated}</p>
                <p>Events created: {result.eventsCreated}</p>
                <p>Total rows processed: {result.totalRows}</p>
                {result.errors && <p className="text-red-600">Errors: {result.errors.length}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}