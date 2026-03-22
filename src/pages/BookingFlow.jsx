import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { format, differenceInDays, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ArrowLeft, Check, Users, Calendar as CalendarIcon, Sparkles, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const STEPS = ['dates', 'room', 'enhance', 'preferences', 'payment'];
const STEP_LABELS = {
  dates: 'Dates',
  room: 'Room',
  enhance: 'Enhance',
  preferences: 'Preferences',
  payment: 'Confirm',
};

export default function BookingFlow() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedRoomId = urlParams.get('room');
  const preselectedPackageId = urlParams.get('package');
  const preselectedTreatmentId = urlParams.get('treatment');

  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState({
    check_in_date: null,
    check_out_date: null,
    num_guests: 1,
    room_id: preselectedRoomId || '',
    room_name: '',
    package_id: preselectedPackageId || '',
    package_name: '',
    selected_treatments: preselectedTreatmentId ? [preselectedTreatmentId] : [],
    arrival_window: 'late_afternoon',
    wellness_intention: '',
    special_requests: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.filter({ is_available: true }),
  });

  const { data: treatments } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.filter({ is_available: true }),
  });

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.SpaPackage.filter({ is_available: true }),
  });

  const selectedRoom = rooms?.find(r => r.id === booking.room_id);
  const selectedPackage = packages?.find(p => p.id === booking.package_id);
  const selectedTreatments = treatments?.filter(t => booking.selected_treatments.includes(t.id)) || [];

  const nights = booking.check_in_date && booking.check_out_date 
    ? differenceInDays(new Date(booking.check_out_date), new Date(booking.check_in_date))
    : 0;

  const roomTotal = selectedRoom ? selectedRoom.price_per_night * nights : 0;
  const treatmentsTotal = selectedTreatments.reduce((sum, t) => sum + t.price, 0);
  const packageTotal = selectedPackage?.total_price || 0;
  const grandTotal = roomTotal + treatmentsTotal + packageTotal;

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData) => {
      const confirmationCode = 'RTL' + Date.now().toString(36).toUpperCase();
      return await base44.entities.Booking.create({
        ...bookingData,
        confirmation_code: confirmationCode,
        room_total: roomTotal,
        treatments_total: treatmentsTotal + packageTotal,
        grand_total: grandTotal,
        booking_status: 'confirmed',
        payment_status: 'pending',
      });
    },
    onSuccess: (data) => {
      window.location.href = createPageUrl('BookingConfirmation') + `?id=${data.id}`;
    },
  });

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = () => {
    createBookingMutation.mutate({
      ...booking,
      room_name: selectedRoom?.name,
      package_name: selectedPackage?.name,
      treatments: selectedTreatments.map(t => ({
        treatment_id: t.id,
        treatment_name: t.name,
        status: 'pending'
      })),
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return booking.check_in_date && booking.check_out_date && nights > 0;
      case 1: return booking.room_id;
      case 2: return true;
      case 3: return true;
      case 4: return booking.guest_name && booking.guest_email;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s}>
              <div 
                className={`w-3 h-3 rounded-full transition-colors ${
                  idx <= step ? 'bg-[rgb(150,170,155)]' : 'bg-[rgb(235,225,213)]'
                }`}
              />
              <span className="text-xs text-[rgb(150,150,150)] tracking-widest font-light">
                {STEP_LABELS[s]}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={`w-12 h-px transition-colors ${
                  idx < step ? 'bg-[rgb(150,170,155)]' : 'bg-[rgb(235,225,213)]'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Dates */}
          {step === 0 && (
            <motion.div
              key="dates"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-4">When would you like to arrive?</h2>
              <p className="text-[rgb(45,45,45)] font-light mb-8">Select your dates</p>

              <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
                <div>
                  <p className="text-sm tracking-widest text-[rgb(150,170,155)] mb-3">CHECK-IN</p>
                  <Calendar
                    mode="single"
                    selected={booking.check_in_date ? new Date(booking.check_in_date) : undefined}
                    onSelect={(date) => setBooking({
                      ...booking, 
                      check_in_date: date ? format(date, 'yyyy-MM-dd') : null,
                      check_out_date: null
                    })}
                    disabled={(date) => date < new Date()}
                    className="border border-[rgb(235,225,213)] bg-white"
                  />
                </div>
                <div>
                  <p className="text-sm tracking-widest text-[rgb(150,170,155)] mb-3">CHECK-OUT</p>
                  <Calendar
                    mode="single"
                    selected={booking.check_out_date ? new Date(booking.check_out_date) : undefined}
                    onSelect={(date) => setBooking({...booking, check_out_date: date ? format(date, 'yyyy-MM-dd') : null})}
                    disabled={(date) => !booking.check_in_date || date <= new Date(booking.check_in_date)}
                    className="border border-[rgb(235,225,213)] bg-white"
                  />
                </div>
              </div>

              <div className="mt-8">
                <label className="text-sm text-[rgb(45,45,45)] block mb-2">Number of guests</label>
                <select
                  value={booking.num_guests}
                  onChange={(e) => setBooking({...booking, num_guests: parseInt(e.target.value)})}
                  className="px-4 py-2 border border-[rgb(235,225,213)] bg-white text-[rgb(45,45,45)]"
                >
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
                </select>
              </div>

              {nights > 0 && (
                <p className="mt-6 text-[rgb(107,85,64)]">{nights} {nights === 1 ? 'night' : 'nights'} selected</p>
              )}
            </motion.div>
          )}

          {/* Step 2: Room */}
          {step === 1 && (
            <motion.div
              key="room"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-4 text-center">Choose your room</h2>
              <p className="text-[rgb(45,45,45)] font-light mb-8 text-center">Each space designed for deep rest</p>

              <div className="grid md:grid-cols-2 gap-6">
                {rooms?.map(room => (
                  <div
                    key={room.id}
                    onClick={() => setBooking({...booking, room_id: room.id})}
                    className={`cursor-pointer border-2 transition-all ${
                      booking.room_id === room.id 
                        ? 'border-[rgb(150,170,155)]' 
                        : 'border-[rgb(235,225,213)] hover:border-[rgb(198,182,165)]'
                    }`}
                  >
                    <img 
                      src={room.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80'}
                      alt={room.name}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-light text-[rgb(107,85,64)]">{room.name}</h3>
                        {booking.room_id === room.id && (
                          <Check className="w-5 h-5 text-[rgb(150,170,155)]" />
                        )}
                      </div>
                      <p className="text-sm text-[rgb(45,45,45)] mb-2">{room.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[rgb(45,45,45)] flex items-center gap-1">
                          <Users className="w-4 h-4" /> Up to {room.max_occupancy}
                        </span>
                        <span className="text-lg text-[rgb(107,85,64)]">${room.price_per_night}/night</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Enhance */}
          {step === 2 && (
            <motion.div
              key="enhance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-4 text-center">Enhance your stay</h2>
              <p className="text-[rgb(45,45,45)] font-light mb-8 text-center">Add spa treatments or choose a curated package</p>

              {/* Packages */}
              {packages?.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-4">PACKAGES</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {packages.map(pkg => (
                      <div
                        key={pkg.id}
                        onClick={() => setBooking({
                          ...booking, 
                          package_id: booking.package_id === pkg.id ? '' : pkg.id,
                          selected_treatments: booking.package_id === pkg.id ? booking.selected_treatments : []
                        })}
                        className={`cursor-pointer p-4 border-2 transition-all ${
                          booking.package_id === pkg.id 
                            ? 'border-[rgb(150,170,155)] bg-[rgb(150,170,155)]/5' 
                            : 'border-[rgb(235,225,213)] hover:border-[rgb(198,182,165)]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-lg font-light text-[rgb(107,85,64)]">{pkg.name}</h4>
                            <p className="text-sm text-[rgb(45,45,45)]">{pkg.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg text-[rgb(107,85,64)]">${pkg.total_price}</span>
                            {pkg.savings > 0 && (
                              <p className="text-xs text-[rgb(150,170,155)]">Save ${pkg.savings}</p>
                            )}
                          </div>
                        </div>
                        {booking.package_id === pkg.id && (
                          <Check className="w-5 h-5 text-[rgb(150,170,155)] ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Treatments */}
              {!booking.package_id && (
                <div>
                  <h3 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-4">OR SELECT INDIVIDUAL TREATMENTS</h3>
                  <div className="space-y-3">
                    {treatments?.map(treatment => (
                      <div
                        key={treatment.id}
                        onClick={() => {
                          const selected = booking.selected_treatments.includes(treatment.id)
                            ? booking.selected_treatments.filter(id => id !== treatment.id)
                            : [...booking.selected_treatments, treatment.id];
                          setBooking({...booking, selected_treatments: selected});
                        }}
                        className={`cursor-pointer p-4 border-2 transition-all flex items-center justify-between ${
                          booking.selected_treatments.includes(treatment.id)
                            ? 'border-[rgb(150,170,155)] bg-[rgb(150,170,155)]/5' 
                            : 'border-[rgb(235,225,213)] hover:border-[rgb(198,182,165)]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 border-2 flex items-center justify-center ${
                            booking.selected_treatments.includes(treatment.id)
                              ? 'border-[rgb(150,170,155)] bg-[rgb(150,170,155)]'
                              : 'border-[rgb(198,182,165)]'
                          }`}>
                            {booking.selected_treatments.includes(treatment.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-light text-[rgb(107,85,64)]">{treatment.name}</h4>
                            <p className="text-sm text-[rgb(45,45,45)] flex items-center gap-2">
                              <Clock className="w-3 h-3" /> {treatment.duration_minutes} min
                            </p>
                          </div>
                        </div>
                        <span className="text-[rgb(107,85,64)]">${treatment.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-center text-sm text-[rgb(45,45,45)] mt-8">
                You can skip this step and book treatments later
              </p>
            </motion.div>
          )}

          {/* Step 4: Preferences */}
          {step === 3 && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-4 text-center">Your preferences</h2>
              <p className="text-[rgb(45,45,45)] font-light mb-8 text-center">Help us prepare for your arrival</p>

              <div className="space-y-8">
                <div>
                  <label className="text-sm tracking-widest text-[rgb(150,170,155)] block mb-4">ARRIVAL WINDOW</label>
                  <RadioGroup 
                    value={booking.arrival_window} 
                    onValueChange={(val) => setBooking({...booking, arrival_window: val})}
                    className="space-y-3"
                  >
                    {[
                      { value: 'early_afternoon', label: 'Early Afternoon', desc: '3:00 PM - 4:00 PM' },
                      { value: 'late_afternoon', label: 'Late Afternoon', desc: '4:00 PM - 6:00 PM' },
                      { value: 'evening', label: 'Evening', desc: 'After 6:00 PM' },
                    ].map(opt => (
                      <div key={opt.value} className="flex items-center space-x-3 p-4 border border-[rgb(235,225,213)]">
                        <RadioGroupItem value={opt.value} id={opt.value} />
                        <Label htmlFor={opt.value} className="flex-1 cursor-pointer">
                          <span className="text-[rgb(107,85,64)]">{opt.label}</span>
                          <span className="text-sm text-[rgb(45,45,45)] block">{opt.desc}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <label className="text-sm tracking-widest text-[rgb(150,170,155)] block mb-3">WELLNESS INTENTION (OPTIONAL)</label>
                  <Textarea
                    value={booking.wellness_intention}
                    onChange={(e) => setBooking({...booking, wellness_intention: e.target.value})}
                    placeholder="What brings you to RITUAL? Deep rest, reconnection, celebration..."
                    className="border-[rgb(235,225,213)] bg-white min-h-24"
                  />
                </div>

                <div>
                  <label className="text-sm tracking-widest text-[rgb(150,170,155)] block mb-3">SPECIAL REQUESTS (OPTIONAL)</label>
                  <Textarea
                    value={booking.special_requests}
                    onChange={(e) => setBooking({...booking, special_requests: e.target.value})}
                    placeholder="Dietary needs, accessibility requirements, celebration arrangements..."
                    className="border-[rgb(235,225,213)] bg-white min-h-24"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Payment */}
          {step === 4 && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-4 text-center">Confirm your reservation</h2>
              <p className="text-[rgb(45,45,45)] font-light mb-8 text-center">Review your booking details below. We'll follow up by email to confirm availability and arrange payment.</p>

              <div className="grid md:grid-cols-2 gap-10">
                {/* Summary */}
                <div className="bg-[rgb(235,225,213)] p-6">
                  <h3 className="text-sm tracking-widest text-[rgb(107,85,64)] mb-4">YOUR STAY</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span>{selectedRoom?.name}</span>
                      <span>{nights} nights</span>
                    </div>
                    <div className="flex justify-between text-sm text-[rgb(45,45,45)]">
                      <span>{booking.check_in_date && format(new Date(booking.check_in_date), 'MMM d')} - {booking.check_out_date && format(new Date(booking.check_out_date), 'MMM d, yyyy')}</span>
                      <span>${roomTotal}</span>
                    </div>

                    {selectedPackage && (
                      <div className="flex justify-between pt-2 border-t border-[rgb(198,182,165)]">
                        <span>{selectedPackage.name}</span>
                        <span>${packageTotal}</span>
                      </div>
                    )}

                    {selectedTreatments.map(t => (
                      <div key={t.id} className="flex justify-between text-sm">
                        <span>{t.name}</span>
                        <span>${t.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between text-xl font-light text-[rgb(107,85,64)] pt-4 border-t border-[rgb(198,182,165)]">
                    <span>Total</span>
                    <span>${grandTotal}</span>
                  </div>
                </div>

                {/* Guest Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-[rgb(45,45,45)] block mb-2">Full Name *</label>
                    <Input
                      value={booking.guest_name}
                      onChange={(e) => setBooking({...booking, guest_name: e.target.value})}
                      className="border-[rgb(235,225,213)]"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[rgb(45,45,45)] block mb-2">Email *</label>
                    <Input
                      type="email"
                      value={booking.guest_email}
                      onChange={(e) => setBooking({...booking, guest_email: e.target.value})}
                      className="border-[rgb(235,225,213)]"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[rgb(45,45,45)] block mb-2">Phone</label>
                    <Input
                      type="tel"
                      value={booking.guest_phone}
                      onChange={(e) => setBooking({...booking, guest_phone: e.target.value})}
                      className="border-[rgb(235,225,213)]"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="bg-[rgb(248,246,242)] border border-[rgb(235,225,213)] rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-[rgb(107,85,64)] mb-2">No payment required now</p>
                    <p className="text-xs text-[rgb(45,45,45)]">We'll confirm your dates and follow up within 24 hours with payment details. A credit card hold may be required to secure your room.</p>
                  </div>

                  <p className="text-xs text-[rgb(45,45,45)]">
                    By completing this reservation request, you agree to receive your itinerary and check-in instructions via email.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-12 pt-8 border-t border-[rgb(235,225,213)]">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className={`flex items-center gap-2 px-6 py-3 text-sm tracking-widest ${
              step === 0 ? 'opacity-0 pointer-events-none' : 'text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-8 py-3 text-sm tracking-widest transition-all ${
                canProceed()
                  ? 'bg-[rgb(150,170,155)] text-white hover:bg-[rgb(130,150,135)]'
                  : 'bg-[rgb(235,225,213)] text-[rgb(198,182,165)] cursor-not-allowed'
              }`}
            >
              CONTINUE
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || createBookingMutation.isPending}
              className={`flex items-center gap-2 px-8 py-3 text-sm tracking-widest transition-all ${
                canProceed()
                  ? 'bg-[rgb(107,85,64)] text-white hover:bg-[rgb(87,65,44)]'
                  : 'bg-[rgb(235,225,213)] text-[rgb(198,182,165)] cursor-not-allowed'
              }`}
            >
              {createBookingMutation.isPending ? 'SUBMITTING...' : 'REQUEST RESERVATION'}
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}