import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords, canonicalUrl, og, twitter, schema }) => {
  const defaultTitle = 'Hotel RITUAL Experience | Boutique Hotel & Spa in Jacksonville, TX';
  const defaultDesc = 'Experience unmatched hospitality at Hotel RITUAL. Boutique rooms, luxury spa services, event spaces, and curated guest experiences in Jacksonville. Book direct for best rates!';

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Hotel RITUAL Experience",
    "description": "Boutique hotel and spa with luxury rooms, curated guest experiences, and on-site services in Jacksonville, Texas.",
    "url": "https://hotel-ritual-experience-automation-a6e982ce.base44.app/",
    "telephone": "+1-903-586-9821",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "540 El Paso Street",
      "addressLocality": "Jacksonville",
      "addressRegion": "TX",
      "postalCode": "75766",
      "addressCountry": "US"
    },
    "image": [
      "https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG",
      "https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/1601332790958-FD3GKA0O3D7L23B7C513/image-asset.jpeg?format=2500w"
    ],
    "priceRange": "$$",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      "opens": "00:00",
      "closes": "23:59"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "31.9685",
      "longitude": "-95.2694"
    }
  };


  return (
    <Helmet>
      {/* Basic SEO Meta Tags */}
      <title>{title || defaultTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      <meta name="keywords" content={keywords || "Hotel Ritual, boutique hotel, spa services, hotel rooms, luxury stay, hotel in Jacksonville, boutique stays, spa booking, event spaces, hospitality"} />

      {/* Canonical URL (prevents duplicate indexing) */}
      <link rel="canonical" href={canonicalUrl || "https://hotel-ritual-experience-automation-a6e982ce.base44.app/"} />

      {/* Open Graph Social Preview */}
      <meta property="og:title" content={og?.title || 'Hotel RITUAL Experience | Boutique Hotel & Spa in Jacksonville'} />
      <meta property="og:description" content={og?.description || 'Discover Hotel RITUAL in Jacksonville: boutique rooms, spa services, and unforgettable guest experiences. Book direct for exclusive rates!'} />
      <meta property="og:url" content={og?.url || "https://hotel-ritual-experience-automation-a6e982ce.base44.app/"} />
      <meta property="og:type" content={og?.type || 'hotel'} />
      <meta property="og:image" content={og?.image || 'https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitter?.card || 'summary_large_image'} />
      <meta name="twitter:title" content={twitter?.title || 'Hotel RITUAL Experience | Boutique Hotel & Spa in Jacksonville'} />
      <meta name="twitter:description" content={twitter?.description || 'Luxury rooms, spa bookings, and curated stays at Hotel RITUAL in Jacksonville. Book direct online now!'} />
      <meta name="twitter:image" content={twitter?.image || 'https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG'} />

      {/* Structured Data: Local Business & Hotel */}
      <script type="application/ld+json">{JSON.stringify(schema || structuredData)}</script>
    </Helmet>
  );
};

export default SEO;