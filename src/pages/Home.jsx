import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Leaf, Wind, Droplets, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TestimonialCard from '@/components/TestimonialCard';
import PressSection from '@/components/PressSection';

export default function Home() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    // SEO Meta Tags
    document.title = "Hotel RITUAL | Boutique Wellness Retreat in Jacksonville, Texas";
    
    const metaTags = [
      { name: "description", content: "Experience deep rest and restoration at Hotel RITUAL in Jacksonville, Texas. Boutique suites, luxury spa treatments, and wellness experiences in a 1932 historic mansion. Book your transformative escape." },
      { name: "keywords", content: "Hotel Ritual, boutique hotel Jacksonville Texas, spa services, wellness retreat, luxury stay, East Texas hotel, boutique stays, massage therapy, holistic wellness" },
      { property: "og:title", content: "Hotel RITUAL | Boutique Wellness Retreat in Jacksonville, Texas" },
      { property: "og:description", content: "Discover Hotel RITUAL in Jacksonville, TX: boutique suites, spa treatments, and transformative wellness experiences in a historic mansion. Book your sacred reset." },
      { property: "og:url", content: "https://hotel-ritual-experience-automation-a6e982ce.base44.app/" },
      { property: "og:type", content: "hotel" },
      { property: "og:image", content: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/d388bd802_generated-image44.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hotel RITUAL | Boutique Wellness Retreat in Jacksonville, Texas" },
      { name: "twitter:description", content: "Luxury suites, spa treatments, and curated wellness stays at Hotel RITUAL in Jacksonville, Texas. Book your transformative experience." },
      { name: "twitter:image", content: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/d388bd802_generated-image44.jpg" }
    ];

    metaTags.forEach(({ name, property, content }) => {
      const attr = name ? 'name' : 'property';
      const value = name || property;
      let meta = document.querySelector(`meta[${attr}="${value}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, value);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://hotel-ritual-experience-automation-a6e982ce.base44.app/');

    // Structured Data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Hotel",
      "name": "Hotel RITUAL",
      "description": "Boutique wellness retreat and spa with luxury suites, curated wellness experiences, and holistic treatments in Jacksonville, Texas. A sacred space for deep rest and restoration.",
      "url": "https://hotel-ritual-experience-automation-a6e982ce.base44.app/",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "540 El Paso Street",
        "addressLocality": "Jacksonville",
        "addressRegion": "TX",
        "postalCode": "75766",
        "addressCountry": "US"
      },
      "image": [
        "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/d388bd802_generated-image44.jpg",
        "https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG"
      ],
      "priceRange": "$$$",
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
        "opens": "00:00",
        "closes": "23:59"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "31.9638",
        "longitude": "-95.2705"
      },
      "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": "Spa Services" },
        { "@type": "LocationFeatureSpecification", "name": "Massage Therapy" },
        { "@type": "LocationFeatureSpecification", "name": "Sauna" },
        { "@type": "LocationFeatureSpecification", "name": "Jacuzzi" },
        { "@type": "LocationFeatureSpecification", "name": "Pool" }
      ]
    };

    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (e) {}
    };
    checkAuth();
  }, []);

  const { data: testimonials } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => base44.entities.Testimonial.filter({ is_active: true }, 'sort_order'),
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/d388bd802_generated-image44.jpg)',
          }}
        >
          <div className="absolute inset-0 bg-[rgb(107,85,64)]/40" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 text-center px-6 max-w-3xl"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extralight text-white tracking-wide mb-6">
            Rest. Restore. Return.
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-light mb-10 leading-relaxed">
            A boutique sanctuary where time slows and intention guides every moment
          </p>
          <Link 
            to={createPageUrl('Rooms')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all"
          >
            BEGIN YOUR JOURNEY
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-16 bg-white/50" />
        </motion.div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 px-6 bg-[rgb(248,246,242)]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Leaf className="w-8 h-8 mx-auto mb-8 text-[rgb(150,170,155)]" />
            <h2 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-8">
              The RITUAL Philosophy
            </h2>
            <p className="text-lg text-[rgb(45,45,45)] leading-relaxed font-light">
              We believe wellness isn't something you do — it's something you remember. 
              Hotel RITUAL is designed to remove the noise, strip away decisions, and 
              return you to yourself. Every detail has been considered so you don't have to consider anything at all.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div className="order-2 md:order-1">
              <h2 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-6">
                Meet Whitney Graham
              </h2>
              <p className="text-lg text-[rgb(45,45,45)] leading-relaxed font-light mb-6">
                Whitney is the heart and soul behind everything RITUAL. As a modern-day alchemist and creator of sacred healing spaces, she has curated every detail of your experience to guide you back to yourself.
              </p>
              <p className="text-[rgb(45,45,45)] leading-relaxed font-light mb-8">
                Rooted in ancient wisdom and holistic healing practices, Whitney founded Hotel RITUAL to offer a sanctuary where wellness isn't something you do—it's something you remember.
              </p>
              <Link 
                to={createPageUrl('About')}
                className="inline-flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
              >
                <span className="tracking-widest text-sm">LEARN MORE ABOUT WHITNEY</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="order-1 md:order-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/ca960cfa8_generated-image45.jpg" 
                alt="Whitney Graham, Founder of Hotel RITUAL"
                className="w-full aspect-square object-cover rounded-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-[rgb(235,225,213)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wind,
                title: "Effortless Arrival",
                description: "Self-guided check-in. Your itinerary waiting. No lines, no paperwork, no friction."
              },
              {
                icon: Droplets,
                title: "Curated Wellness",
                description: "Treatments scheduled around your rhythm. Packages that make sense. Clarity at every step."
              },
              {
                icon: Sun,
                title: "Intentional Days",
                description: "A daily itinerary delivered to you. Know exactly what awaits. Surrender to the flow."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="text-center p-8"
              >
                <feature.icon className="w-10 h-10 mx-auto mb-6 text-[rgb(150,170,155)]" />
                <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-4">{feature.title}</h3>
                <p className="text-[rgb(45,45,45)] font-light leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Preview */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-4">
              Your Sanctuary Awaits
            </h2>
            <p className="text-[rgb(45,45,45)] font-light">Each room designed for restoration</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] overflow-hidden group"
            >
              <img 
                src="https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG" 
                alt="Suite"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-2xl font-light mb-2 drop-shadow-lg">Suites & Rooms</h3>
                <p className="text-white/90 font-light drop-shadow-lg">Starting at $150/night</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] overflow-hidden group"
            >
              <img 
                src="https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/9b89c6de-d91a-4333-ae22-99e134ff6756/Sauna.jpg" 
                alt="Spa"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-2xl font-light mb-2 drop-shadow-lg">Spa & Wellness</h3>
                <p className="text-white/90 font-light drop-shadow-lg">Treatments from $95</p>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <Link 
              to={createPageUrl('Rooms')}
              className="inline-flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
            >
              <span className="tracking-widest text-sm">VIEW ALL ROOMS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-extralight text-[rgb(107,85,64)] text-center mb-12"
            >
              Guest Experiences
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((testimonial, idx) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <TestimonialCard testimonial={testimonial} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Press */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-extralight text-[rgb(107,85,64)] text-center mb-8"
          >
            As Featured In
          </motion.h2>
          <PressSection />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[rgb(107,85,64)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extralight text-white mb-10">
            Ready to Slow Down?
          </h2>
          <Link 
            to={createPageUrl('BookRooms')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[rgb(107,85,64)] tracking-widest text-sm hover:bg-[rgb(235,225,213)] transition-all"
          >
            RESERVE YOUR ESCAPE
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Admin Link */}
      {user?.role === 'admin' && (
        <div className="py-8 text-center">
          <Link 
            to={createPageUrl('AdminDashboard')}
            className="text-sm text-[rgb(150,170,155)] hover:text-[rgb(107,85,64)] transition-colors"
          >
            Admin Dashboard →
          </Link>
        </div>
      )}

      </div>
      );
      }