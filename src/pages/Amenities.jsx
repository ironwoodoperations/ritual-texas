import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Droplets, Flame, Coffee, Home, Sparkles, Leaf, TreePine, Music, MapPin } from 'lucide-react';

export default function Amenities() {
  const amenities = [
    {
      icon: Droplets,
      title: "Pool",
      description: "Outdoor heated pool surrounded by palms and loungers",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/2066d91a2_IMG_20260209_095832.jpg"
    },
    {
      icon: Droplets,
      title: "Jacuzzi",
      description: "Private outdoor jacuzzi for deep relaxation",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/8fcf6591d_IMG_20260209_093700.jpg"
    },
    {
      icon: Flame,
      title: "Sauna",
      description: "Traditional dry sauna with ritual sweat circuit available",
      image: "https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/9b89c6de-d91a-4333-ae22-99e134ff6756/Sauna.jpg"
    },
    {
      icon: Droplets,
      title: "Rain Shower",
      description: "Luxurious rain shower experience for ultimate relaxation",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/f36ad538e_Screenshot_20260209_101258_Gallery.jpg"
    },
    {
      icon: Coffee,
      title: "Breakfast Included",
      description: "Gourmet breakfast served fresh each morning",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/afb220366_IMG_20260209_093626.jpg"
    },
    {
      icon: Home,
      title: "Luxury Linens & Robes",
      description: "Premium bedding and plush robes in every room",
      image: "https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG"
    },
    {
      icon: Sparkles,
      title: "Spa Treatments",
      description: "Full-service spa with massage, facials, and healing rituals",
      image: "https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/8becffb7-f1ca-4af9-ad75-5706b45baed5/shirodhara.jpg"
    },
    {
      icon: MapPin,
      title: "Property Map",
      description: "Easy navigation of our beautiful grounds and amenities",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/373728481_IMG_20260209_094256.jpg"
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/1746543454044-THNR2OK3WC721WLFRL37/Stairway.jpg)',
          }}
        >
          <div className="absolute inset-0 bg-[rgb(107,85,64)]/50" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center px-6"
        >
          <h1 className="text-4xl md:text-6xl font-extralight text-white tracking-wide mb-4">
            Amenities
          </h1>
          <p className="text-lg text-white/90 font-light">
            Everything you need to rest, restore, and return
          </p>
        </motion.div>
      </section>

      {/* Amenities Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-4">
              All Stays Include
            </h2>
            <p className="text-[rgb(45,45,45)] font-light max-w-2xl mx-auto">
              Every detail considered, every need anticipated. Your wellness journey begins with these thoughtfully curated amenities.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {amenities.map((amenity, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-[rgb(235,225,213)] overflow-hidden group"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={amenity.image}
                    alt={amenity.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <amenity.icon className="w-6 h-6 text-[rgb(150,170,155)]" />
                    <h3 className="text-xl font-light text-[rgb(107,85,64)]">{amenity.title}</h3>
                  </div>
                  <p className="text-[rgb(45,45,45)] font-light leading-relaxed">
                    {amenity.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-16 px-6 bg-[rgb(235,225,213)]">
        <div className="max-w-4xl mx-auto text-center">
          <Leaf className="w-8 h-8 mx-auto mb-6 text-[rgb(150,170,155)]" />
          <h2 className="text-2xl md:text-3xl font-extralight text-[rgb(107,85,64)] mb-6">
            On-Site Experiences
          </h2>
          <p className="text-[rgb(45,45,45)] font-light leading-relaxed mb-8">
            RITUAL Luncheonette, Soda Fountain of Youth with house-made custards, 
            wellness studio, antique shops nearby, and nature trails. Everything designed 
            to help you disconnect from the world and reconnect with yourself.
          </p>
          <Link 
            to={createPageUrl('BookingFlow')}
            className="inline-block px-8 py-3 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all"
          >
            BOOK YOUR STAY
          </Link>
        </div>
      </section>
    </div>
  );
}