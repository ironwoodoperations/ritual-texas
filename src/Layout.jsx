import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Menu, X, Calendar, Leaf } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Layout({ children, currentPageName }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const userData = await base44.auth.me();
          setUser(userData);
          setIsAdmin(userData.role === 'admin');
        }
      } catch (e) {
        // Not authenticated
      }
    };
    checkAuth();
  }, []);

  const isAdminPage = currentPageName?.toLowerCase().includes('admin') || currentPageName?.toLowerCase().includes('staff');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(248, 246, 242)' }}>
      <style>{`
        :root {
          --sand: rgb(235, 225, 213);
          --taupe: rgb(198, 182, 165);
          --earth: rgb(107, 85, 64);
          --charcoal: rgb(45, 45, 45);
          --sage: rgb(150, 170, 155);
          --blush: rgb(196, 155, 145);
          --linen: rgb(248, 246, 242);
        }
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: rgb(107, 85, 64);
          font-weight: 300;
          letter-spacing: 0.02em;
        }
        
        body {
          color: rgb(45, 45, 45);
        }
        
        .btn-primary {
          background-color: rgb(150, 170, 155);
          color: white;
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
          background-color: rgb(130, 150, 135);
        }
        
        .btn-secondary {
          background-color: rgb(107, 85, 64);
          color: white;
        }
        
        .card-ritual {
          background-color: white;
          border: 1px solid rgb(235, 225, 213);
        }
        
        ::selection {
          background-color: rgb(198, 182, 165);
          color: white;
        }
      `}</style>

      {/* Navigation */}
      {!isAdminPage && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgb(248,246,242)]/95 backdrop-blur-sm border-b border-[rgb(235,225,213)]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2">
                <Leaf className="w-6 h-6 text-[rgb(150,170,155)]" />
                <span className="text-xl tracking-widest font-light text-[rgb(107,85,64)]">RITUAL</span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-10">
                <Link to={createPageUrl('Rooms')} className="text-sm tracking-wide text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)] transition-colors">
                  Rooms
                </Link>
                <Link to={createPageUrl('Treatments')} className="text-sm tracking-wide text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)] transition-colors">
                  Spa & Wellness
                </Link>
                <Link to={createPageUrl('Packages')} className="text-sm tracking-wide text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)] transition-colors">
                  Packages
                </Link>
                <Link to={createPageUrl('Amenities')} className="text-sm tracking-wide text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)] transition-colors">
                  Amenities
                </Link>
                <Link to={createPageUrl('AskRitual')} className="text-sm tracking-wide text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)] transition-colors">
                  Ask Ritual
                </Link>
                <Link 
                  to={createPageUrl('BookingFlow')} 
                  className="px-6 py-2.5 bg-[rgb(150,170,155)] text-white text-sm tracking-wide rounded-none hover:bg-[rgb(130,150,135)] transition-all"
                >
                  Book Your Stay
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-[rgb(248,246,242)] border-b border-[rgb(235,225,213)] py-6 px-6">
              <div className="flex flex-col gap-4">
                  <Link to={createPageUrl('Rooms')} className="text-[rgb(45,45,45)] py-2" onClick={() => setIsMenuOpen(false)}>
                    Rooms
                  </Link>
                  <Link to={createPageUrl('Treatments')} className="text-[rgb(45,45,45)] py-2" onClick={() => setIsMenuOpen(false)}>
                    Spa & Wellness
                  </Link>
                  <Link to={createPageUrl('Packages')} className="text-[rgb(45,45,45)] py-2" onClick={() => setIsMenuOpen(false)}>
                    Packages
                  </Link>
                  <Link to={createPageUrl('Amenities')} className="text-[rgb(45,45,45)] py-2" onClick={() => setIsMenuOpen(false)}>
                    Amenities
                  </Link>
                  <Link to={createPageUrl('AskRitual')} className="text-[rgb(45,45,45)] py-2" onClick={() => setIsMenuOpen(false)}>
                    Ask Ritual
                  </Link>
                <Link 
                  to={createPageUrl('BookingFlow')} 
                  className="mt-2 px-6 py-3 bg-[rgb(150,170,155)] text-white text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Book Your Stay
                </Link>
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Main Content */}
      <main className={!isAdminPage ? 'pt-20' : ''}>
        {children}
      </main>

      {/* Footer */}
      {!isAdminPage && (
        <footer className="bg-[rgb(235,225,213)] mt-20 py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="w-5 h-5 text-[rgb(150,170,155)]" />
                  <span className="text-lg tracking-widest font-light text-[rgb(107,85,64)]">RITUAL</span>
                </div>
                <p className="text-sm text-[rgb(107,85,64)] leading-relaxed">
                  A boutique sanctuary in Jacksonville, Texas. Rest. Restore. Return.
                </p>
              </div>
              <div>
                <h4 className="text-sm tracking-widest mb-4 text-[rgb(107,85,64)]">EXPERIENCE</h4>
                <div className="flex flex-col gap-2 text-sm text-[rgb(45,45,45)]">
                  <Link to={createPageUrl('Rooms')} className="hover:text-[rgb(107,85,64)]">Rooms & Suites</Link>
                  <Link to={createPageUrl('Treatments')} className="hover:text-[rgb(107,85,64)]">Spa Treatments</Link>
                  <Link to={createPageUrl('Packages')} className="hover:text-[rgb(107,85,64)]">Packages</Link>
                  <Link to={createPageUrl('Amenities')} className="hover:text-[rgb(107,85,64)]">Amenities</Link>
                </div>
              </div>
              <div>
                <h4 className="text-sm tracking-widest mb-4 text-[rgb(107,85,64)]">CONNECT</h4>
                <div className="flex flex-col gap-2 text-sm text-[rgb(45,45,45)]">
                  <Link to={createPageUrl('AskRitual')} className="hover:text-[rgb(107,85,64)]">Ask Ritual</Link>
                  <Link to={createPageUrl('MyBooking')} className="hover:text-[rgb(107,85,64)]">My Itinerary</Link>
                </div>
              </div>
              <div>
                <h4 className="text-sm tracking-widest mb-4 text-[rgb(107,85,64)]">VISIT</h4>
                <p className="text-sm text-[rgb(45,45,45)]">
                  Jacksonville, Texas<br />
                  Check-in: 3:00 PM<br />
                  Check-out: 11:00 AM
                </p>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-[rgb(198,182,165)] text-center text-xs text-[rgb(107,85,64)]">
              © {new Date().getFullYear()} Hotel RITUAL. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}