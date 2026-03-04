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

  const [profileFile, setProfileFile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResult, setProfileResult] = useState(null);
  const [profileError, setProfileError] = useState(null);

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
      setResult(null);

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

      if (extractResp.status !== 'success' || !extractResp.output || extractResp.output.length === 0) {
        setError(`Parse error: ${extractResp.details || 'No data extracted from file'}`);
        setLoading(false);
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
      setLoading(false);
    } catch (e) {
      console.error('Import error:', e);
      let errorMsg = e.message || 'Import failed';
      if (e.response?.data) {
        errorMsg = JSON.stringify(e.response.data, null, 2);
      } else if (e.response?.status) {
        errorMsg = `HTTP ${e.response.status}: ${e.response.statusText || 'Server error'}\nDetails: ${e.response.data ? JSON.stringify(e.response.data, null, 2) : 'No response data'}`;
      }
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleProfileImport = async () => {
    if (!profileFile) { setProfileError('Please select a file'); return; }
    try {
      setProfileLoading(true);
      setProfileError(null);
      setProfileResult(null);

      const uploadResp = await base44.integrations.Core.UploadFile({ file: profileFile });
      const fileUrl = uploadResp.file_url;

      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            'Name': { type: 'string' },
            'Full Name': { type: 'string' },
            'First Name': { type: 'string' },
            'Last Name': { type: 'string' },
            'Email': { type: 'string' },
            'Email Address': { type: 'string' },
            'Phone': { type: 'string' },
            'Phone Number': { type: 'string' },
            'Mobile': { type: 'string' },
            'Profile ID': { type: 'string' },
            'Guest ID': { type: 'string' },
          }
        }
      };

      const extractResp = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: fileUrl, json_schema: schema });
      if (extractResp.status !== 'success' || !extractResp.output?.length) {
        setProfileError(`Parse error: ${extractResp.details || 'No data extracted'}`);
        setProfileLoading(false);
        return;
      }

      const importResp = await base44.functions.invoke('importCloudbedsProfiles', { profiles: extractResp.output });
      if (importResp.data?.error) { setProfileError(importResp.data.error); setProfileLoading(false); return; }

      setProfileResult(importResp.data);
      setProfileFile(null);
      setProfileLoading(false);
    } catch (e) {
      setProfileError(e.message || 'Import failed');
      setProfileLoading(false);
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
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-700 font-medium mb-3">Error:</div>
              <textarea
                readOnly
                value={error}
                className="w-full p-3 bg-white border border-red-300 rounded text-sm text-red-700 font-mono h-24"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(error);
                  alert('Error copied to clipboard');
                }}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Copy Error
              </button>
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