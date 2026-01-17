import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80)',
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
            Whitney Graham
          </h1>
          <p className="text-lg text-white/90 font-light">
            Founder & Modern-Day Alchemist
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8 text-[rgb(45,45,45)] leading-relaxed"
          >
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center p-6 bg-[rgb(248,246,242)]">
                <Sparkles className="w-8 h-8 mx-auto mb-4 text-[rgb(150,170,155)]" />
                <h3 className="text-lg font-light text-[rgb(107,85,64)] mb-2">Creator</h3>
                <p className="text-sm">Sacred healing spaces rooted in ancient wisdom</p>
              </div>
              <div className="text-center p-6 bg-[rgb(248,246,242)]">
                <Heart className="w-8 h-8 mx-auto mb-4 text-[rgb(150,170,155)]" />
                <h3 className="text-lg font-light text-[rgb(107,85,64)] mb-2">Entrepreneur</h3>
                <p className="text-sm">Founded Hotel RITUAL in 2018</p>
              </div>
              <div className="text-center p-6 bg-[rgb(248,246,242)]">
                <Sparkles className="w-8 h-8 mx-auto mb-4 text-[rgb(150,170,155)]" />
                <h3 className="text-lg font-light text-[rgb(107,85,64)] mb-2">Alchemist</h3>
                <p className="text-sm">Curator of all things high vibe</p>
              </div>
            </div>

            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-6">The Vision Behind RITUAL</h2>
              
              <p className="font-light mb-6">
                Whitney Walker Graham is a creator of sacred healing spaces, entrepreneur, and modern-day alchemist rooted in ancient wisdom. As the founder of Hotel RITUAL, she has built more than just a boutique hotel and spa—she has created a sanctuary for transformation.
              </p>

              <p className="font-light mb-6">
                In 2018, Whitney founded Hotel RITUAL to offer a healing sanctuary providing Ayurvedic-inspired detox treatments, natural therapies, and holistic wellness experiences. Her vision was clear: create a place where guests could slow down, turn within, and reboot their mind, body, and soul.
              </p>

              <p className="font-light mb-6">
                Every aspect of Hotel RITUAL reflects Whitney's deep commitment to wellness as a practice of remembering rather than doing. From the carefully curated treatments to the intentional design of each space, she has infused the property with her philosophy that true healing comes from returning to the rituals that keep us healthy, sane, and present.
              </p>

              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-6 mt-12">A Modern-Day Alchemist</h2>
              
              <p className="font-light mb-6">
                Whitney describes herself as a "curator of all things high vibe." Her approach blends ancient healing modalities—like Shirodhara, Reiki, and Ayurvedic practices—with modern wellness needs. She believes in the power of vibrational healing, intentional living, and creating spaces that allow transformation to unfold naturally.
              </p>

              <p className="font-light mb-6">
                Her work extends beyond the physical treatments offered at Hotel RITUAL. Whitney has created a complete ecosystem of wellness, including the RITUAL Luncheonette, the Soda Fountain of Youth, and experiential healing spaces like the RITUAL Wonderland—each designed to nourish a different aspect of the human experience.
              </p>

              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-6 mt-12">The RITUAL Philosophy</h2>
              
              <p className="font-light mb-6">
                At the heart of Whitney's work is a simple but profound belief: wellness isn't something you do—it's something you remember. She has designed Hotel RITUAL to strip away decisions, remove noise, and create space for guests to simply be.
              </p>

              <p className="font-light mb-6">
                "RITUAL is a slowing down, a turning within, a rebooting of the mind, body, and soul," Whitney explains. "Let us return to all the rituals that keep us healthy, sane, and enjoying the life we were given."
              </p>

              <p className="font-light mb-8">
                Through her leadership, Hotel RITUAL has become a destination for those seeking authentic transformation—a place where ancient wisdom meets modern luxury, and where every detail is thoughtfully considered to support your journey home to yourself.
              </p>
            </div>

            <div className="bg-[rgb(235,225,213)] p-8 mt-12 text-center">
              <p className="text-lg font-light text-[rgb(107,85,64)] italic mb-6">
                "Every detail has been considered so you don't have to consider anything at all."
              </p>
              <p className="text-sm text-[rgb(45,45,45)]">— Whitney Graham</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-[rgb(107,85,64)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extralight text-white mb-10">
            Experience Whitney's Vision
          </h2>
          <Link 
            to={createPageUrl('BookRooms')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[rgb(107,85,64)] tracking-widest text-sm hover:bg-[rgb(235,225,213)] transition-all"
          >
            BOOK YOUR TRANSFORMATION
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}