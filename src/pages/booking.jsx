import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Calendar, MessageCircle, Phone } from 'lucide-react';

export default function Booking() {
  useEffect(() => {
    // Load Square widget script
    const script = document.createElement('script');
    script.src = 'https://square.site/appointments/buyer/widget/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/9Y1N836Q82W1V.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const scrollToNextSteps = () => {
    const element = document.getElementById('next-steps');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ backgroundColor: '#F0E8DD' }} className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-light mb-4" style={{ color: '#3B4831' }}>
            Book Your Treatment
          </h1>
          <p className="text-lg" style={{ color: '#1B1B1B' }}>
            Select your service and preferred time below.
          </p>
        </div>

        {/* Square Embed Container */}
        <Card className="mb-8 p-6" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
          <div id="square-appointments-embed"></div>
        </Card>

        {/* Helper Button */}
        <div className="text-center mb-8">
          <Button
            onClick={scrollToNextSteps}
            variant="outline"
            style={{ borderColor: '#3B4831', color: '#3B4831' }}
          >
            I finished booking — show next steps
          </Button>
        </div>

        {/* After You Book Panel */}
        <div id="next-steps">
          <Card className="p-8" style={{ backgroundColor: '#FCF9F4', borderRadius: '16px' }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-light mb-3" style={{ color: '#3B4831' }}>
                  Want to add another treatment?
                </h2>
                <p className="text-base leading-relaxed" style={{ color: '#1B1B1B' }}>
                  Square books one service at a time. After you complete a booking, tap below to add another service, or jump to your full itinerary.
                </p>
              </div>
            </div>

            <div className="grid gap-4 mb-6">
              {/* Tip Card */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(240,232,221,0.65)', border: '1px solid rgba(59,72,49,0.08)' }}>
                <div className="font-bold mb-2" style={{ color: '#1B1B1B' }}>
                  Pro Tip
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#1B1B1B' }}>
                  Most guests pair a body reset (massage, lymphatic) with a facial or sound work. Build your perfect wellness day.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
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
                View My Full Itinerary
              </Button>
              
              <Button
                onClick={() => window.open('sms:+19038106695?&body=Hi%20RITUAL%20Concierge%20—%20I%20just%20booked%20a%20treatment%20and%20want%20to%20add%20another.%20Can%20you%20help%3F', '_blank')}
                variant="outline"
                style={{ borderColor: '#3B4831', color: '#3B4831' }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Text Concierge
              </Button>
              
              <Button
                onClick={() => window.open('tel:9038106695', '_blank')}
                variant="outline"
                style={{ borderColor: '#3B4831', color: '#3B4831' }}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Hotel
              </Button>
            </div>
          </Card>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <a 
            href="/Treatments" 
            className="text-sm" 
            style={{ color: '#3B4831', textDecoration: 'underline' }}
          >
            ← Back to All Treatments
          </a>
        </div>
      </div>
    </div>
  );
}