import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminSeedData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runSeed = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('seedHotelRitualContent', {});
      setResult(response.data);
    } catch (e) {
      setError(e.message || 'Failed to run seed function');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-[rgb(235,225,213)] p-8">
          <h1 className="text-2xl font-light text-[rgb(107,85,64)] mb-4">
            Seed Hotel RITUAL Content
          </h1>
          <p className="text-[rgb(45,45,45)] mb-6">
            Click the button below to populate all Suites, Treatments, Packages, 
            Testimonials, and Press items. Safe to run multiple times.
          </p>

          <Button
            onClick={runSeed}
            disabled={loading}
            className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              'Run Seed Function'
            )}
          </Button>

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Success!</span>
              </div>
              <pre className="text-xs text-green-800 overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Error: {error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}