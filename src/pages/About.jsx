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
            backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/ca960cfa8_generated-image45.jpg)',
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
                Whitney Walker Graham is a creator of sacred healing spaces, entrepreneur, and modern-day alchemist rooted in ancient wisdom. As the founder of RITUAL—a multi-faceted wellness brand based in Jacksonville, Texas—she has built more than a destination. She has created a sanctuary for self-love, spiritual realignment, and whole-body transformation.
              </p>

              <p className="font-light mb-6">
                In 2018, Whitney founded Hotel RITUAL to offer a healing sanctuary providing Ayurvedic-inspired detox treatments, natural therapies, and holistic wellness experiences. Her vision was clear: create a place where guests could slow down, turn within, and reboot their mind, body, and soul. Today, Hotel RITUAL is known as the "Mecca of Self-Love"—a Tudor-style sanctuary that serves as a spiritual renewal for the human body.
              </p>

              <div className="bg-[rgb(248,246,242)] border-l-4 border-[rgb(150,170,155)] p-6 my-8">
                <p className="text-sm text-[rgb(45,45,45)] italic">
                  "Hotel RITUAL—a healing sanctuary offering our version of Ayurvedic detox (Panchakarma) and holistic experiences rooted in vibration, nutrition, breath, and nature."
                </p>
                <p className="text-xs text-[rgb(107,85,64)] mt-2">— VoyageDallas</p>
              </div>

              <p className="font-light mb-6">
                Every aspect of Hotel RITUAL reflects Whitney's deep commitment to wellness as a practice of remembering rather than doing. From the carefully curated treatments to the intentional design of each space, she has infused the property with her philosophy that true healing comes from returning to the rituals that keep us healthy, sane, and present.
              </p>

              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-6 mt-12">A Journey of Healing</h2>
              
              <p className="font-light mb-6">
                A descendant of Cherokee ancestry and a lifelong student of the human body's ability to heal, Whitney's path was forged through personal trauma and deep spiritual searching. She studied Pre-Med and Economics Honors under Alfred Lorn Norman II at the University of Texas at Austin, training in surgical medicine before realizing her true calling lay in preventative care, vibrational medicine, and ancient wellness practices.
              </p>

              <p className="font-light mb-6">
                Whitney's journey took her across 50+ countries, working with pioneering anti-aging scientists Joseph A. Lewis II and Joseph DiNardo, and studying Ayurvedic medicine, sound therapy, and chakra healing under world-renowned mentors Dr. Kuhlreet Chaudhary and her husband, Reiki Master Joshua Barr. A pivotal internship at nineteen with French beauty icon Jean Francois Lazartigue sparked a bold mission: to bring ancient healing modalities into modern, approachable spaces that nourish body, mind, and soul.
              </p>

              <p className="font-light mb-6">
                Currently, Whitney studies Vedic astrology under Systems Approach astrologer David Hawthorne. His daughter, Sara Hawthorne, has joined the RITUAL Wellness team to offer Vedic Astrology readings to guests—adding another dimension to the transformative experiences available at Hotel RITUAL.
              </p>

              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-6 mt-12">The RITUAL Ecosystem</h2>
              
              <p className="font-light mb-6">
                Whitney's vision extends far beyond Hotel RITUAL. She has created a complete ecosystem of wellness experiences throughout Jacksonville, each designed to nourish a different aspect of the human experience.
              </p>

              <p className="font-light mb-6">
                <strong>RITUAL Luncheonette</strong> offers soul-satisfying, high-vibrational food in a light-filled brownstone with Parisian charm and Southern warmth. Locally sourced ingredients shine in signature dishes like East Texas sustainably raised wagyu pot roast, alongside rainbow-hued made-to-order soups, salads, and herbal teas. Above the café, a seven-circuit labyrinth and studio host yoga, meditation, and sound healing sessions.
              </p>

              <p className="font-light mb-6">
                <strong>RITUAL Laboratorium + Soda Fountain of Youth</strong> revives childhood wonder with handcrafted ice cream, root beer floats, and organic aura smoothies—all infused with high-vibe ingredients and healing intention. The adjoining Laboratorium offers natural remedies, cosmeceuticals, and custom lifestyle prescriptions designed to elevate your daily wellness practice.
              </p>

              <div className="bg-[rgb(248,246,242)] border-l-4 border-[rgb(150,170,155)] p-6 my-8">
                <p className="text-sm text-[rgb(45,45,45)] italic">
                  "All-inclusive... access to dozens of amenities like high-vibrational foods, a sauna, chakra showers, sage ceremonies, and even private yoga, meditation, and sound baths."
                </p>
                <p className="text-xs text-[rgb(107,85,64)] mt-2">— Dallasites101</p>
              </div>

              <p className="font-light mb-6">
                At the heart of it all is <strong>Hotel RITUAL</strong>—where guests experience Ayurvedic detoxification, lymphatic massage, sound healing, and the transformative "SuperHuman Transformation" package. This modernized panchakarma journey is Whitney's answer to healing through vibration, nature, food, and ancient therapies.
              </p>

              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-6 mt-12">Resilience & Renewal</h2>
              
              <p className="font-light mb-6">
                Whitney's path has not been without hardship. From losing her first wellness property to fire, to rebuilding during the pandemic, to healing through personal loss—her journey is living proof of what she offers others: renewal through rhythm, ritual, and resilience.
              </p>

              <p className="font-light mb-6">
                These experiences have only deepened her commitment to creating sacred spaces where others can find their own path to healing. "RITUAL is a slowing down, a turning within, a rebooting of the mind, body, and soul," Whitney explains. "Let us return to all the rituals that keep us healthy, sane, and enjoying the life we were given."
              </p>

              <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-6 mt-12">A Movement of Self-Love</h2>

              <p className="font-light mb-6">
                At the heart of Whitney's work is a simple but profound belief: wellness isn't something you do—it's something you remember. She has designed Hotel RITUAL to strip away decisions, remove noise, and create space for guests to simply be.
              </p>

              <p className="font-light mb-8">
                RITUAL is more than a brand—it's a movement. A return to sacred self-love. A reminder that joy is measurable, that food is medicine, and that healing is our birthright. Through her leadership, Hotel RITUAL has become a destination for those seeking authentic transformation—a place where ancient wisdom meets modern comfort, and where every detail is thoughtfully considered to support your journey home to yourself.
              </p>
            </div>

            <div className="bg-[rgb(235,225,213)] p-8 mt-12 text-center">
              <p className="text-lg font-light text-[rgb(107,85,64)] italic mb-6">
                "Every detail has been considered so you don't have to consider anything at all."
              </p>
              <p className="text-sm text-[rgb(45,45,45)]">— Whitney Graham</p>
            </div>

            {/* Press Recognition */}
            <div className="mt-16">
              <h2 className="text-2xl font-extralight text-[rgb(107,85,64)] mb-8 text-center">Recognition & Press</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <a 
                  href="https://www.texasmonthly.com/travel/new-age-meets-yore-east-texas-hotel-ritual-spa/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-6 border border-[rgb(235,225,213)] hover:border-[rgb(150,170,155)] transition-colors bg-white"
                >
                  <p className="text-sm font-light text-[rgb(150,170,155)] mb-2">Texas Monthly</p>
                  <p className="text-[rgb(107,85,64)] font-light">New Age Meets Yore at East Texas Hotel RITUAL + Spa</p>
                </a>
                <a 
                  href="https://voyagedallas.com/interview/meet-whitney-graham-of-hotel-ritual/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-6 border border-[rgb(235,225,213)] hover:border-[rgb(150,170,155)] transition-colors bg-white"
                >
                  <p className="text-sm font-light text-[rgb(150,170,155)] mb-2">VoyageDallas</p>
                  <p className="text-[rgb(107,85,64)] font-light">Meet Whitney Graham of Hotel RITUAL</p>
                </a>
                <a 
                  href="https://www.dallasites101.com/blog/post/wellness-resorts-around-texas-for-an-escape/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-6 border border-[rgb(235,225,213)] hover:border-[rgb(150,170,155)] transition-colors bg-white"
                >
                  <p className="text-sm font-light text-[rgb(150,170,155)] mb-2">Dallasites101</p>
                  <p className="text-[rgb(107,85,64)] font-light">9 Wellness Resorts Around Texas for an Escape</p>
                </a>
                <a 
                  href="https://www.charmeasttexas.com/features/creating-a-new-ritual/article_25d5907e-a6e4-11eb-b3a5-a3f2319e4b20.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-6 border border-[rgb(235,225,213)] hover:border-[rgb(150,170,155)] transition-colors bg-white"
                >
                  <p className="text-sm font-light text-[rgb(150,170,155)] mb-2">Charm East Texas</p>
                  <p className="text-[rgb(107,85,64)] font-light">Creating a New RITUAL</p>
                </a>
              </div>
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