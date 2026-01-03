import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, BedDouble } from 'lucide-react';

export default function BookRooms() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hide loader after iframe loads or 12 seconds max
    const timer = setTimeout(() => setLoading(false), 12000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 px-6 py-4 border-b border-[rgb(235,225,213)] bg-white flex-shrink-0">
        <div className="flex items-center gap-2 opacity-60 pointer-events-none">
          <BedDouble className="w-5 h-5 text-[rgb(107,85,64)]" />
          <span className="text-sm font-medium text-[rgb(107,85,64)]">Book Rooms</span>
        </div>
        <Link 
          to={createPageUrl('BookingFlow')}
          className="flex items-center gap-2 text-[rgb(45,45,45)] hover:text-[rgb(150,170,155)] transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium">Book Spa & Treatments</span>
        </Link>
      </div>

      {/* Iframe Container */}
      <div className="relative flex-1 overflow-hidden">
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgb(248,246,242)] z-10">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-[rgb(107,85,64)] font-light">Loading secure room booking...</p>
            </div>
          </div>
        )}

        {/* Cloudbeds Booking Iframe */}
        <iframe
          src="https://hotels.cloudbeds.com/en/reservation/aqlut4?currency=usd"
          title="Hotel RITUAL Room Booking"
          className="w-full h-full border-0 block"
          onLoad={() => setLoading(false)}
          allow="payment"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}