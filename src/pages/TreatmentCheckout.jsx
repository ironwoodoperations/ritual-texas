import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { format, addDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, ShoppingCart, Calendar as CalendarIcon, Clock, X, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TreatmentCheckout() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTreatmentId = urlParams.get('treatment');

  const [stayType, setStayType] = useState(''); // 'hotel' or 'daytrip'
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [cart, setCart] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const { data: treatments } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.filter({ is_available: true }, 'sort_order'),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.filter({ is_available: true }),
  });

  // Add initial treatment to cart if provided
  useEffect(() => {
    if (initialTreatmentId && treatments && cart.length === 0) {
      const treatment = treatments.find(t => t.id === initialTreatmentId);
      if (treatment) {
        setCart([{ id: Date.now(), treatmentId: treatment.id, treatmentName: treatment.name, price: treatment.price, duration: treatment.duration_minutes, date: null }]);
      }
    }
  }, [initialTreatmentId, treatments]);

  const addTreatmentToCart = (treatmentId) => {
    if (!treatmentId) return;
    const treatment = treatments.find(t => t.id === treatmentId);
    if (treatment) {
      setCart([...cart, { 
        id: Date.now(), 
        treatmentId: treatment.id, 
        treatmentName: treatment.name, 
        price: treatment.price, 
        duration: treatment.duration_minutes,
        date: null 
      }]);
    }
  };

  const removeTreatmentFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateTreatmentDate = (id, date) => {
    setCart(cart.map(item => 
      item.id === id ? { ...item, date: date } : item
    ));
  };

  const handleDateSelect = (itemId, date) => {
    if (date) {
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      updateTreatmentDate(itemId, format(localDate, 'yyyy-MM-dd'));
    }
  };

  const selectedRoom = rooms?.find(r => r.id === selectedRoomId);
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const allDatesSelected = cart.every(item => item.date);
  const canProceed = stayType && (stayType === 'daytrip' || selectedRoomId) && cart.length > 0 && allDatesSelected && guestName && guestEmail;

  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-[rgb(150,170,155)]" />
          <h1 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-2">
            Book Spa Treatments
          </h1>
          <p className="text-[rgb(45,45,45)] font-light">
            Build your custom spa experience
          </p>
        </motion.div>

        {/* Stay Type Selection */}
        <div className="bg-white border border-[rgb(235,225,213)] p-6 mb-8">
          <h3 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-4">
            ARE YOU STAYING AT THE HOTEL?
          </h3>
          <RadioGroup value={stayType} onValueChange={setStayType}>
            <div className="flex items-center space-x-2 p-4 border border-[rgb(235,225,213)] mb-3">
              <RadioGroupItem value="hotel" id="hotel" />
              <Label htmlFor="hotel" className="flex-1 cursor-pointer">
                <span className="text-[rgb(107,85,64)]">Yes, I'm a hotel guest</span>
                <span className="text-sm text-[rgb(45,45,45)] block">I have a room reservation</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border border-[rgb(235,225,213)]">
              <RadioGroupItem value="daytrip" id="daytrip" />
              <Label htmlFor="daytrip" className="flex-1 cursor-pointer">
                <span className="text-[rgb(107,85,64)]">No, just spa treatments</span>
                <span className="text-sm text-[rgb(45,45,45)] block">Day visit for treatments only</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Room Selection (if hotel guest) */}
        {stayType === 'hotel' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-[rgb(248,246,242)] p-6 mb-8"
          >
            <h3 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-4">
              SELECT YOUR ROOM
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {rooms?.map(room => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`cursor-pointer p-4 border-2 transition-all ${
                    selectedRoomId === room.id
                      ? 'border-[rgb(150,170,155)] bg-white'
                      : 'border-[rgb(235,225,213)] bg-white hover:border-[rgb(198,182,165)]'
                  }`}
                >
                  <h4 className="font-light text-[rgb(107,85,64)] mb-1">{room.name}</h4>
                  <p className="text-sm text-[rgb(45,45,45)]">${room.price_per_night}/night</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Treatment Cart */}
        {(stayType === 'daytrip' || selectedRoomId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white border border-[rgb(235,225,213)] p-6 mb-8"
          >
            <div className="mb-6">
              <h3 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-4">
                YOUR TREATMENTS ({cart.length})
              </h3>
              <div className="relative">
                <select
                  onChange={(e) => {
                    addTreatmentToCart(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full px-4 py-4 pr-10 border-2 border-[rgb(235,225,213)] bg-white text-[rgb(45,45,45)] focus:border-[rgb(150,170,155)] focus:outline-none appearance-none transition-all hover:border-[rgb(198,182,165)] text-sm md:text-base"
                  defaultValue=""
                >
                  <option value="" disabled>✨ Add additional treatments</option>
                  {treatments?.map(treatment => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.name} • ${treatment.price} • {treatment.duration_minutes} min
                    </option>
                  ))}
                </select>
                <Plus className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(150,170,155)] pointer-events-none" />
              </div>
            </div>

            {cart.length === 0 ? (
              <p className="text-center py-8 text-[rgb(45,45,45)]">No treatments added yet</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="border border-[rgb(235,225,213)] p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-light text-[rgb(107,85,64)]">{item.treatmentName}</h4>
                        <p className="text-sm text-[rgb(45,45,45)] flex items-center gap-2">
                          <Clock className="w-3 h-3" /> {item.duration} min
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg text-[rgb(107,85,64)]">${item.price}</span>
                        <button
                          onClick={() => removeTreatmentFromCart(item.id)}
                          className="text-[rgb(196,155,145)] hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-[rgb(235,225,213)]">
                      <p className="text-xs tracking-widest text-[rgb(150,170,155)] mb-2">SELECT DATE FOR THIS TREATMENT</p>
                      <Calendar
                        mode="single"
                        selected={item.date ? new Date(item.date + 'T12:00:00') : undefined}
                        onSelect={(date) => handleDateSelect(item.id, date)}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        className="border border-[rgb(235,225,213)] bg-[rgb(248,246,242)]"
                      />
                      {item.date && (
                        <p className="text-sm text-[rgb(107,85,64)] mt-2">
                          Scheduled: {format(new Date(item.date + 'T12:00:00'), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

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

        {/* Checkout */}
        {cart.length > 0 && (stayType === 'daytrip' || selectedRoomId) && (
          <div className="bg-[rgb(235,225,213)] p-8">
            <h3 className="text-lg font-light text-[rgb(107,85,64)] mb-6 text-center">
              Complete Your Booking
            </h3>
            
            {/* Booking Summary */}
            <div className="max-w-2xl mx-auto bg-white border border-[rgb(198,182,165)] p-6 mb-6">
              <h4 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-4">BOOKING SUMMARY</h4>
              
              {stayType === 'hotel' && selectedRoom && (
                <div className="pb-4 mb-4 border-b border-[rgb(235,225,213)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[rgb(45,45,45)]">Room: {selectedRoom.name}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-4">
                {cart.map((item, idx) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="text-[rgb(45,45,45)]">{item.treatmentName}</span>
                      {item.date && (
                        <span className="block text-xs text-[rgb(150,170,155)]">
                          {format(new Date(item.date + 'T12:00:00'), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                    <span className="text-[rgb(107,85,64)]">${item.price}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xl pt-4 border-t border-[rgb(198,182,165)]">
                <span className="font-light text-[rgb(107,85,64)]">Total</span>
                <span className="font-medium text-[rgb(107,85,64)]">${cartTotal}</span>
              </div>
            </div>

            <p className="text-[rgb(45,45,45)] mb-6 max-w-md mx-auto text-center text-sm">
              Square payment integration coming soon. You'll receive a payment link via email to complete your booking.
            </p>

            <button
              disabled={!canProceed}
              className={`flex items-center justify-center gap-2 px-8 py-4 mx-auto text-sm tracking-widest transition-all ${
                canProceed
                  ? 'bg-[rgb(150,170,155)] text-white hover:bg-[rgb(130,150,135)]'
                  : 'bg-[rgb(198,182,165)] text-white cursor-not-allowed'
              }`}
              onClick={async () => {
                if (canProceed) {
                  const confirmationCode = 'SPA' + Date.now().toString(36).toUpperCase();
                  await base44.entities.TreatmentBooking.create({
                    confirmation_code: confirmationCode,
                    guest_name: guestName,
                    guest_email: guestEmail,
                    guest_phone: guestPhone,
                    stay_type: stayType,
                    room_id: selectedRoomId || null,
                    room_name: selectedRoom?.name || null,
                    treatments: cart.map(item => ({
                      treatment_id: item.treatmentId,
                      treatment_name: item.treatmentName,
                      price: item.price,
                      duration: item.duration,
                      scheduled_date: item.date,
                      status: 'pending'
                    })),
                    total_amount: cartTotal,
                    payment_status: 'pending',
                    booking_status: 'pending'
                  });
                  
                  setConfirmedBooking({
                    confirmationCode,
                    stayType,
                    roomName: selectedRoom?.name,
                    treatments: cart,
                    total: cartTotal,
                    guestName,
                    guestEmail
                  });
                  setShowConfirmation(true);
                }
              }}
            >
              CONFIRM BOOKING
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-xs text-[rgb(45,45,45)] mt-4 text-center">
              By confirming, you agree to receive booking details and payment instructions via email.
            </p>
          </div>
        )}

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

      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg bg-[rgb(248,246,242)] border-2 border-[rgb(150,170,155)]">
          {confirmedBooking && (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-[rgb(150,170,155)] flex items-center justify-center"
              >
                <ShoppingCart className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-extralight text-[rgb(107,85,64)] mb-2">
                Booking Confirmed!
              </h2>
              <p className="text-[rgb(45,45,45)] mb-6">
                Your spa experience is reserved
              </p>

              <div className="bg-white border border-[rgb(235,225,213)] p-6 mb-6 text-left">
                <div className="mb-4 pb-4 border-b border-[rgb(235,225,213)]">
                  <p className="text-xs tracking-widest text-[rgb(150,170,155)] mb-2">CONFIRMATION CODE</p>
                  <p className="text-xl font-light text-[rgb(107,85,64)] tracking-wider">
                    {confirmedBooking.confirmationCode}
                  </p>
                </div>

                {confirmedBooking.stayType === 'hotel' && confirmedBooking.roomName && (
                  <div className="mb-4">
                    <p className="text-xs tracking-widest text-[rgb(150,170,155)] mb-1">ROOM</p>
                    <p className="text-[rgb(45,45,45)]">{confirmedBooking.roomName}</p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs tracking-widest text-[rgb(150,170,155)] mb-2">TREATMENTS</p>
                  <div className="space-y-2">
                    {confirmedBooking.treatments.map((treatment, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="text-[rgb(107,85,64)]">{treatment.treatmentName}</p>
                        <p className="text-xs text-[rgb(45,45,45)]">
                          {format(new Date(treatment.date + 'T12:00:00'), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[rgb(235,225,213)] flex justify-between items-center">
                  <span className="text-[rgb(107,85,64)]">Total</span>
                  <span className="text-2xl font-light text-[rgb(107,85,64)]">${confirmedBooking.total}</span>
                </div>
              </div>

              <div className="bg-[rgb(235,225,213)] p-4 mb-6 text-sm text-[rgb(45,45,45)]">
                <p>📧 Payment link will be sent to:</p>
                <p className="font-medium mt-1">{confirmedBooking.guestEmail}</p>
              </div>

              <button
                onClick={() => window.location.href = createPageUrl('Treatments')}
                className="w-full py-4 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all flex items-center justify-center gap-2"
              >
                RETURN TO TREATMENTS
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}