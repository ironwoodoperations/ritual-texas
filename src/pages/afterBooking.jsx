import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Calendar, MessageCircle, CheckCircle } from 'lucide-react';

export default function AfterBooking() {
  return (
    <div style={{ backgroundColor: '#F0E8DD' }} className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16" style={{ color: '#C4A55C' }} />
          </div>
          <h1 className="text-4xl md:text-5xl font-light mb-4" style={{ color: '#3B4831' }}>
            You're Booked.
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#1B1B1B' }}>
            Your treatment is confirmed. Want to elevate your stay? Add another ritual below — most guests pair a body reset with a facial or sound work.
          </p>
        </div>

        {/* Concierge Pick */}
        <Card className="mb-8 p-6" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
          <div className="flex items-start gap-3">
            <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(196,165,92,0.18)', border: '1px solid rgba(59,72,49,0.1)', color: '#3B4831' }}>
              Concierge Pick
            </div>
          </div>
          <div className="mt-4">
            <p className="font-bold mb-2" style={{ color: '#1B1B1B' }}>
              Pairing that books out fastest
            </p>
            <p className="leading-relaxed" style={{ color: '#1B1B1B' }}>
              <strong>Sound Bath</strong> (private or group) + <strong>Swedish Massage</strong> is a favorite for deep nervous-system calm.
            </p>
          </div>
        </Card>

        {/* Main Actions */}
        <Card className="mb-8 p-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
          <h2 className="text-2xl font-light mb-6" style={{ color: '#3B4831' }}>
            What's Next?
          </h2>

          <div className="grid gap-4 mb-6">
            {/* Tip */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(240,232,221,0.65)', border: '1px solid rgba(59,72,49,0.08)' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#1B1B1B' }}>
                <strong>Square books one service at a time.</strong> To add another treatment, use the button below. Your itinerary will show all your bookings in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => window.open('https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services', '_blank')}
              className="text-white font-medium"
              style={{ backgroundColor: '#C57C5D' }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Book Another Treatment
            </Button>
            
            <Button
              onClick={() => window.location.href = '/itinerary'}
              variant="outline"
              style={{ borderColor: '#3B4831', color: '#3B4831' }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              View My Itinerary
            </Button>
            
            <Button
              onClick={() => window.location.href = '/Treatments'}
              variant="outline"
              style={{ borderColor: '#3B4831', color: '#3B4831' }}
            >
              Back to All Treatments
            </Button>
          </div>
        </Card>

        {/* Quick Treatment Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-light mb-4" style={{ color: '#3B4831' }}>
            Popular Add-Ons
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow" 
              style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}
              onClick={() => window.location.href = '/booking?service=royal'}
            >
              <h4 className="font-bold mb-2" style={{ color: '#3B4831' }}>
                Royal Treatment Facial
              </h4>
              <p className="text-sm mb-4" style={{ color: '#1B1B1B' }}>
                Instant radiance with zero downtime.
              </p>
              <span className="inline-block px-4 py-2 rounded-lg font-bold text-sm text-white" style={{ backgroundColor: '#C57C5D' }}>
                Book Now
              </span>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow" 
              style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}
              onClick={() => window.location.href = '/booking?service=soundprivate'}
            >
              <h4 className="font-bold mb-2" style={{ color: '#3B4831' }}>
                Sound Bath (Private)
              </h4>
              <p className="text-sm mb-4" style={{ color: '#1B1B1B' }}>
                A full-body frequency reset.
              </p>
              <span className="inline-block px-4 py-2 rounded-lg font-bold text-sm text-white" style={{ backgroundColor: '#C57C5D' }}>
                Book Now
              </span>
            </Card>
          </div>
        </div>

        {/* Need Help */}
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#1B1B1B' }}>
            Need help building your perfect wellness day?
          </p>
          <Button
            onClick={() => window.open('sms:+19038106695?&body=Hi%20RITUAL%20Concierge%20—%20I%20just%20booked%20and%20want%20help%20adding%20more%20treatments.', '_blank')}
            variant="outline"
            style={{ borderColor: '#3B4831', color: '#3B4831' }}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Text Concierge
          </Button>
        </div>
      </div>
    </div>
  );
}