import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { format, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, ShoppingCart, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TreatmentCheckout() {
  const urlParams = new URLSearchParams(window.location.search);
  const treatmentId = urlParams.get('treatment');

  const [selectedDate, setSelectedDate] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const { data: treatment } = useQuery({
    queryKey: ['treatment', treatmentId],
    queryFn: async () => {
      const treatments = await base44.entities.Treatment.filter({ id: treatmentId });
      return treatments?.[0];
    },
    enabled: !!treatmentId,
  });

  // Convert selected date to CST (UTC-6) to fix timezone issue
  const handleDateSelect = (date) => {
    if (date) {
      // Create date in local timezone at midnight
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(format(localDate, 'yyyy-MM-dd'));
    } else {
      setSelectedDate(null);
    }
  };

  const canProceed = selectedDate && guestName && guestEmail && treatment;

  if (!treatment) {
    return (
      <div className="min-h-screen py-16 px-6 flex items-center justify-center">
        <p className="text-[rgb(107,85,64)]">Loading treatment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-[rgb(150,170,155)]" />
          <h1 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-2">
            Book Your Treatment
          </h1>
          <p className="text-[rgb(45,45,45)] font-light">
            Select a date and provide your details
          </p>
        </motion.div>

        {/* Treatment Summary */}
        <div className="bg-white border border-[rgb(235,225,213)] p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-light text-[rgb(107,85,64)] mb-2">
                {treatment.name}
              </h2>
              <p className="text-sm text-[rgb(45,45,45)] flex items-center gap-2">
                <Clock className="w-4 h-4" /> {treatment.duration_minutes} minutes
              </p>
            </div>
            <div className="text-2xl text-[rgb(107,85,64)]">
              ${treatment.price}
            </div>
          </div>
          <p className="text-sm text-[rgb(45,45,45)] font-light leading-relaxed">
            {treatment.what_it_is}
          </p>
        </div>

        {/* Date Selection */}
        <div className="bg-[rgb(248,246,242)] p-6 mb-8">
          <h3 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-4 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            SELECT PREFERRED DATE
          </h3>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate ? new Date(selectedDate + 'T12:00:00') : undefined}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              className="border border-[rgb(235,225,213)] bg-white"
            />
          </div>
          {selectedDate && (
            <p className="text-center mt-4 text-[rgb(107,85,64)]">
              Selected: {format(new Date(selectedDate + 'T12:00:00'), 'MMMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Guest Information */}
        <div className="bg-white border border-[rgb(235,225,213)] p-6 mb-8">
          <h3 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-6">
            YOUR INFORMATION
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[rgb(45,45,45)] block mb-2">Full Name *</label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="border-[rgb(235,225,213)]"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm text-[rgb(45,45,45)] block mb-2">Email *</label>
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="border-[rgb(235,225,213)]"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-[rgb(45,45,45)] block mb-2">Phone</label>
              <Input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="border-[rgb(235,225,213)]"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Checkout Placeholder */}
        <div className="bg-[rgb(235,225,213)] p-8 text-center">
          <h3 className="text-lg font-light text-[rgb(107,85,64)] mb-4">
            Payment Processing
          </h3>
          <p className="text-[rgb(45,45,45)] mb-6 max-w-md mx-auto">
            Square payment integration coming soon. You'll receive a payment link via email to complete your booking.
          </p>
          
          <div className="max-w-sm mx-auto bg-white border border-[rgb(198,182,165)] p-6 mb-6">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-[rgb(235,225,213)]">
              <span className="text-[rgb(45,45,45)]">Treatment</span>
              <span className="text-[rgb(107,85,64)]">${treatment.price}</span>
            </div>
            <div className="flex justify-between items-center text-xl">
              <span className="font-light text-[rgb(107,85,64)]">Total</span>
              <span className="font-medium text-[rgb(107,85,64)]">${treatment.price}</span>
            </div>
          </div>

          <button
            disabled={!canProceed}
            className={`flex items-center justify-center gap-2 px-8 py-4 mx-auto text-sm tracking-widest transition-all ${
              canProceed
                ? 'bg-[rgb(150,170,155)] text-white hover:bg-[rgb(130,150,135)]'
                : 'bg-[rgb(198,182,165)] text-white cursor-not-allowed'
            }`}
            onClick={() => {
              if (canProceed) {
                alert(`Booking confirmed!\n\nTreatment: ${treatment.name}\nDate: ${format(new Date(selectedDate + 'T12:00:00'), 'MMMM d, yyyy')}\nGuest: ${guestName}\n\nYou'll receive a payment link at ${guestEmail} to complete your booking.`);
              }
            }}
          >
            CONFIRM BOOKING
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-[rgb(45,45,45)] mt-4">
            By confirming, you agree to receive booking details and payment instructions via email.
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href={createPageUrl('Treatments')}
            className="inline-flex items-center gap-2 text-sm text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Treatments
          </a>
        </div>
      </div>
    </div>
  );
}