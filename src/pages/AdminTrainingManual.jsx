import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft, Download, Search, X, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";

const PDF_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/ed47d3f85_Ritual_Manager_Training_Manual.pdf";

// ── Pro Tips ─────────────────────────────────────────────────────────────────
const PRO_TIPS = [
  "Scan the Day in 60 Seconds panel every morning and again at 3 PM — it tells you where to focus before anything else.",
  "Prices in Admin Treatments must always match SimplyBook.me exactly. A mismatch causes guest friction and refund requests.",
  "Before every shift, pull up today's arriving guests in the CRM. Knowing their history turns a check-in into a reunion.",
  "Always get a 50% deposit paid before holding a date for catering events — non-refundable within 14 days.",
  "If the Cloudbeds token shows a warning, go to AdminCloudbeds and click Refresh Token. If that fails, click Reconnect.",
  "The Knowledge Base is what Loman (your AI phone system) uses to answer guest calls. Keep it current and detailed.",
  "A healthy restaurant runs labor at 28-32% of net sales. Flag anything above 35% for Whitney's review.",
  "Never release a room for new check-in until the HK task shows Complete and all flagged issues are resolved.",
  "Gap count in the Spa panel = revenue opportunity. Gaps of 30+ minutes between treatments can be filled with walk-ins.",
  "Mark specials as inactive when sold out — never delete them. You'll want to reuse them.",
];

// ── Chapter data ──────────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: "welcome",
    title: "Welcome to Ritual",
    color: "rgb(107,85,64)",
    content: `You have just stepped into one of the most thoughtfully designed independent hospitality properties in Texas. Ritual is three things at once — a boutique hotel, a wellness spa, and a restaurant — and your job is to make all three feel like one seamless experience for every guest.

THE RITUAL PHILOSOPHY
• Guests arrive to disconnect. Every interaction should feel unhurried and intentional.
• Whitney (the owner) should only ever need to open one tab: this Admin Dashboard.
• When in doubt, over-communicate with the guest and under-react internally. Calm is the brand.
• The hotel, spa, and restaurant are one experience. A room guest should always be invited to add a treatment. A spa guest should always leave with a restaurant recommendation.
• Your role as manager is to run all three at once using this dashboard, so Whitney can focus on vision and guest relationships, not logistics.`,
  },
  {
    id: "ch1",
    title: "Chapter 1: The Dashboard",
    color: "rgb(107,85,64)",
    defaultOpen: true,
    content: `LOGGING IN
Navigate to ritualtexas.com and use the Staff Login link. Enter your admin credentials. The dashboard loads automatically showing today's date and the full operational overview.

THE HEADER BAR
Top-right contains three links: Staff (staff-facing dashboard), View Site (public website), and Logout. Always log out when leaving a shared device.

QUICK ACTION TILES
Two large buttons at the very top:
• TODAY'S ITINERARIES (Brown): Print-ready guest briefing for every arrival today — room, spa appointments, special requests, and a pre-written SMS welcome text. Review before 10 AM and text guests 2-3 hours before their expected arrival.
• SQUARE INVOICES (Green): Invoice Generator for custom Square invoices — group bookings, catering deposits, custom packages, anything outside the standard booking flow.

THE DAY IN 60 SECONDS PANEL
Real-time snapshot of everything happening today. Scan every morning at open and again at 3 PM:
• CONCIERGE INBOX: Unread guest inquiries. Highlighted border = respond immediately. Target: 2-hour response time.
• HOTEL TODAY (Arrivals / Departures / In-House): Three live numbers from Cloudbeds.
• SPA TODAY: Appointments today + gap count. Gaps = revenue opportunity. The count syncs live from SimplyBook.me each time the dashboard loads. A manual refresh button (↻) appears next to the count — if the number looks off, click it before troubleshooting.
• HOUSEKEEPING: Open tasks + flagged issues. Resolve before checking guests out of those rooms.
• TOAST (Restaurant): Today's net restaurant sales from Toast POS.
• RESTAURANT LEADS: Pending reservations and event inquiries needing confirmation.
• INTAKE FOLLOW-UPS: Warm leads from website inquiries not yet converted to bookings.

HOTEL TODAY PANEL & RESTAURANT WEEK PANEL
Live widgets below the 60-second panel. Hotel Today: arrivals/departures/in-house in card format, ideal for front desk handoffs. Restaurant Week: current week's sales trend from Toast — spot slow nights ahead.

NAVIGATION GRID
Color-coded tiles by department:
• ROOMS & STAYS (Brown): Rooms · Packages · Housekeeping Setup
• SPA & WELLNESS (Green): Treatments
• RESTAURANT (Blush): Restaurant · Catering
• CRM & MARKETING (Green): Master CRM
• CONTENT & SETTINGS (Tan): Knowledge Base · Image Library · Media · Staff Controls · Admin Files · Training Manual
• DATA MANAGEMENT (Gray): All import tools + Square Archive`,
  },
  {
    id: "ch2",
    title: "Chapter 2: Rooms & Stays",
    color: "rgb(107,85,64)",
    content: `ROOMS (Admin Rooms)
Your room inventory. Every bookable room lives here.
1. View All Rooms: List with name, type, price per night, capacity, and availability toggle.
2. Add a New Room: Click +. Fill in Room Name, Type, Description, Price, Capacity, hero image URL. Click Save.
3. Edit a Room: Pencil icon. Update details and Save. Changes go live immediately on the booking page.
4. Toggle Availability: Green/red toggle to block or unblock rooms without deleting them.
5. Delete a Room: Only if the room no longer physically exists — historical bookings may lose their reference.
Pro Tip: Keep room descriptions sensory — guests choose an experience, not a spec sheet. Mention the view, the linens, the light.

PACKAGES (Admin Packages)
Curated bundles — room + spa + extras. Appear on the public Packages page.
1. View All Packages: Title, price, availability badge, sort position. Drag grip handle to reorder.
2. Create a Package: Click +. Fill in Title, Subtitle, Price, Hero Image URL, Short Description, Includes list. Toggle Available to publish.
3. Edit or Hide: Pencil to edit. Eye icon to show/hide without deleting. Hide seasonal packages off-season.
4. Pricing: 10-15% savings vs. booking individually. Guests must feel they're getting a deal.

HOUSEKEEPING (Admin Housekeeping + Admin HK Setup)
1. Define Spaces: In HK Setup, add every cleanable space — rooms, common areas, spa rooms, bathrooms.
2. Build Checklists: Step-by-step tasks per space. Specific: "Strip and remake bed with fresh linens" not "Clean room."
3. Daily Operations: Open AdminHousekeeping every morning. Today tab = active tasks. Assign to staff. Monitor completion.
4. Flag Issues: Staff flag room problems → appear in AdminHousekeepingIssues with severity. Assign resolution timeline.
5. Check-Out Flow: NEVER release a room for new check-in until HK task shows Complete and all issues are resolved.`,
  },
  {
    id: "ch3",
    title: "Chapter 3: Spa & Wellness",
    color: "rgb(150,170,155)",
    content: `TREATMENTS (Admin Treatments)
The spa's service menu. Every bookable treatment with full pricing and visibility control.
1. View All Treatments: Name, duration, price, category, availability toggle, sort order.
2. Add a Treatment: Click +. Fill in Name, Duration (minutes), Price, Category, Description. Toggle Available.
3. Edit Pricing: Pencil icon. CRITICAL: also update prices in SimplyBook.me to keep both systems in sync.
4. Hide vs. Delete: Eye icon hides without losing historical data. Only delete if the treatment truly no longer exists.
5. Category Grouping: The public Treatments page auto-groups by the category you enter here — keep names consistent.
CRITICAL: Prices here must always match SimplyBook.me exactly. A mismatch causes guests to see one price and get charged another.

SPA SCHEDULE (Admin Spa Schedule)
Operational view of all spa bookings, pulled live from SimplyBook.me.
1. Date Range View: Select dates at the top. Today is the default.
2. Appointment Details: Guest name, treatment, provider, start/end time, payment status.
3. Gap Analysis: System identifies open slots between appointments — 30+ minute gaps are revenue opportunities.
4. Guest Lookup: Search by name or email to pull full spa history. Essential for personalizing return visits.
5. Provider Filter: Filter by therapist to see their individual schedule. Use for staffing decisions.

INTAKE FORMS (Admin Intake)
Website inquiry forms become Intake Forms — your primary lead management tool.
1. View Inquiries: Sorted by newest first. Badges: New Inquiry, Pending, Confirmed, Cancelled.
2. Review: Click any entry — full details: name, email, phone, preferred dates, treatments of interest, wellness intention.
3. Convert to Booking: Once confirmed, click "Create Intake" to push to AdminBookings.
4. Follow-Up Tracking: Dashboard shows the follow-up count. Target: respond to New Inquiries within 2 hours.
5. Internal Notes: Staff-only notes to track conversation history and quotes given.`,
  },
  {
    id: "ch4",
    title: "Chapter 4: Restaurant",
    color: "rgb(196,155,145)",
    content: `RESTAURANT MANAGER — 4 TABS (Admin Restaurant)
Tab 1: Daily Specials — Items marked "Active Today" display on the public menu page automatically. Add specials with title, description, price, category (Lunch/Dinner/Soup), and the Active Today toggle. Deactivate when sold out — never delete. Use Soup toggle for soups — they display in a dedicated section.
Tab 2: Menu Items — Full permanent menu management by category.
Tab 3: Menu Sections — Create and manage category buckets (Breakfast, Lunch, Dinner). Control display order, enable/disable sections seasonally.
Tab 4: Hours — Set public hours for each day of the week. Displays on the Restaurant page and is used by Loman to answer guest phone calls.

CATERING (Admin Catering)
1. View Quotes: All submitted catering requests with event type, guest count, date, and status.
2. Create a Quote: Click +. Select menu items, add venue fee, apply discount, generate PDF quote.
3. Approval Flow: Once approved — mark Confirmed, collect deposit via Square Invoice, add to operations calendar.
4. Deposit Policy: 50% deposit, non-refundable within 14 days of the event. Get this paid before holding the date.

RESTAURANT SALES REPORTS (Admin Restaurant Sales)
1. Sync Today: Click "Sync Today" to pull latest data from Toast. If Toast is compiling, try again in 30-60 seconds.
2. Manual Entry: If auto-sync fails, manually enter Net Sales, Gross Sales, Tax, Labor Cost, and Business Date.
3. View History: 90 days of daily summaries. Healthy restaurant = labor at 28-32% of net sales. Flag anything above 35% for Whitney.
4. Open Toast Directly: The "Open Toast" link jumps to Toast admin for full POS reporting.`,
  },
  {
    id: "ch5",
    title: "Chapter 5: CRM & Marketing",
    color: "rgb(150,170,155)",
    content: `MASTER CRM (Admin Master CRM)
Your unified guest database — every person who has booked a room, treatment, or attended an event.
1. Sync All Data: Click "Sync All" to pull latest records from Cloudbeds, SimplyBook, and Square. Run weekly.
2. Search a Guest: Type name or email to pull complete record: stays, spa visits, purchases, contact details.
3. Guest Profile: Contact info, stay history, treatment history, total spend, last visit date, and notes.
4. Add a Note: Staff-only notes — dietary restrictions, preferences, special occasions. Surface in Concierge Inbox.
5. Export for Marketing: Filter and export guest lists for email campaigns.
Pro Tip: Before every shift, pull up today's arriving guests in the CRM. Knowing their history turns a transactional check-in into a reunion.

CONCIERGE INBOX (Admin Concierge Inbox)
Every contact form, package inquiry, and guest message flows here.
1. Triage: Sorted by newest first. Status: New (unread), Pending, Resolved. Dashboard badge shows unread count.
2. Reply: Click any message. Use "Build Reply Email" to auto-compose a response with guest's name pre-filled.
3. Convert to Intake: For booking leads, click "Create Intake" to move into the formal Intake workflow.
4. Mark as Resolved: Once conversation ends (booking confirmed, question answered), mark Resolved to clear the count.`,
  },
  {
    id: "ch6",
    title: "Chapter 6: Bookings & Reservations",
    color: "rgb(107,85,64)",
    content: `GUESTBOOKNOW — PUBLIC BOOKING FLOW (/GuestBookNow)
The public-facing booking page where guests self-book online. Supports three booking types:
• Hotel Stay & Spa Treatments: Guests select dates, choose a room, schedule spa treatments, and enter contact info. Full end-to-end booking in one flow.
• Hotel Stay Only: Room booking with no spa component.
• Spa Treatments Only: Day-spa visit — no overnight room required.

Room Ordering: Rooms appear in a fixed order — Suite 1, Suite 2, Suite 3, Suite 5, Carriage House. Suite 4 and Suite 6 are gated and only shown to guests who select 3 or more guests — they will not appear for parties of 1 or 2.

Spa Treatments: Guests pick a treatment, optionally choose a therapist (or "No Preference"), then select an available date and time slot from their stay window. Multiple treatments can be added for different guests. Selections appear in a running summary before checkout.

Auto-Completion: On submit, the system automatically creates the Cloudbeds hotel reservation, books the SimplyBook spa appointments, and generates a Square invoice — all in one step. The intake record arrives in Admin Intake pre-confirmed with all fields populated. No manual data entry required.

ADMIN BOOKINGS — CLOUDBEDS TAB
1. View Upcoming Reservations: All reservations live from Cloudbeds, sorted by check-in date.
2. Filter Tabs: Use the Upcoming, Past, Cancelled, and All filter tabs to navigate reservation history. Past and Cancelled filters are useful for resolving guest disputes or looking up historical stays.
3. Guest Actions per Reservation:
   • Check In — marks the guest as checked in inside Cloudbeds. Use on arrival day.
   • Check Out — marks the guest as departed. Do this after key return.
   • Payment — records a payment against the reservation. Two sources: Cloudbeds/OTA (for folio-based payments and OTA-collected amounts) or Square (for card payments processed through Square). Select the correct source before posting.
4. Troubleshoot Token: If Cloudbeds warning banner appears → AdminCloudbeds → click "Refresh Token". If fails, click "Reconnect Cloudbeds".

ADMIN BOOKINGS — CREATE RESERVATION TAB
1. Manual Reservation: Select dates, choose room from live availability, enter guest details (name, email, phone), submit.
2. Instant Sync: On success, Cloudbeds reservation ID returned. Booking appears in Cloudbeds PMS immediately.
3. Payment: Two sources — Cloudbeds/OTA (folio payment or OTA-collected) or Square (card payment processed via Square). Always select the correct source.

TODAY'S ITINERARIES (Admin Today Itineraries)
1. Open at 8 AM: All today's check-ins load automatically. Each arriving guest has a full details card.
2. Guest Card: Name, room, dates, spa appointments, arrival window, wellness intention, special requests.
3. SMS Welcome Text: Pre-built message per guest. Copy and text 2-3 hours before expected arrival.
4. Action Buttons per Guest: Three buttons appear on each card:
   • Check In — marks arrival in Cloudbeds directly from the itinerary.
   • Check Out — marks departure in Cloudbeds.
   • Payment — opens the payment dialog with two source options: Cloudbeds/OTA or Square. Select the correct one before posting.
5. Print for Front Desk: Use browser print (Ctrl+P) for a clean printed version.
6. Real-Time Updates: Refresh the page if spa appointments change same-day — re-reads SimplyBook live.`,
  },
  {
    id: "ch7",
    title: "Chapter 7: Finance & Invoicing",
    color: "rgb(198,182,165)",
    content: `SQUARE INVOICE GENERATOR (Admin Invoice Generator)
Create invoices for any transaction outside the standard booking system. Guests pay online via Square payment link.
1. Create an Invoice: Click +. Enter client name, email, invoice title, due date, and line items (description + amount each).
2. Send via Square: Click "Send via Square." Square emails the client a payment link. Invoice appears in both this system and Square Dashboard.
3. Track Status: Draft, Sent, Paid, Overdue, Cancelled. Paid invoices show payment date and transaction ID.
4. Void or Refund: Void before payment. For paid invoice refunds, process in Square Dashboard, then note it here.
5. Download PDF: Click any invoice for the full breakdown and a PDF copy for clients requesting paper records.
Deposit Policy: 50% deposit, non-refundable within 14 days of the event. Always get this paid before holding a date.

MONTHLY RECONCILIATION
Compare Toast totals (restaurant revenue) with Square invoices (spa and catering) for a complete property financial picture. Cloudbeds handles room revenue billing separately. Cross-reference all three monthly.`,
  },
  {
    id: "ch8",
    title: "Chapter 8: Content & Settings",
    color: "rgb(198,182,165)",
    content: `KNOWLEDGE BASE (Admin Knowledge)
Your internal wiki — SOPs, training documents, vendor contacts, scripts, and policies.
1. Browse: Articles organized by category. Search bar is full-text — search keywords within articles.
2. Add an Article: Click +. Title, category, content in rich-text editor. Embed videos via YouTube/Vimeo URLs.
3. Edit vs. Delete: Only delete fully obsolete articles — prefer to update with a "Last Updated" note at top.
4. Staff Access: Staff see Knowledge Base from Staff Dashboard. Articles marked Admin Only are hidden from staff.

IMAGE LIBRARY (Admin Images)
Central image storage for all public-facing photos.
1. Upload: Click Upload. Accepted: JPG, PNG, WebP. Stored and served via CDN.
2. Copy URL: Each image has a Copy URL button. Use these URLs in room, treatment, and package admin pages.
3. Organize: Tag images by category (Rooms, Spa, Restaurant, Events). Filter by category to browse.
4. Clean Up: Verify no page references an image URL before deleting it.

ADMIN FILES (Admin Files)
File storage for documents, PDFs, and other non-image files.
1. Upload: Click upload to add any file type — PDFs, Word docs, spreadsheets, etc.
2. Copy URL: Each file has a shareable URL you can use to link to documents from anywhere in the dashboard.
3. This is where the Manager Training Manual PDF is stored and accessed from.
4. Use this section to store any operational documents — menus, contracts, vendor agreements, staff forms.

MEDIA (Admin Media)
Press coverage, editorial features, and brand assets. Feeds the public Press page.
• Add press coverage: publication name, article title, URL, date, optional quote. Toggle "Featured" for prominent placement.
• Store downloadable brand assets (logo files, press kit, brand guidelines) here for journalists and partners.

STAFF CONTROLS (Admin Staff Controls)
1. View Accounts: All staff logins with role (admin / staff) and last login date.
2. Add Staff: Enter name, email, and role. They receive an email invite to set their password.
3. Change Roles: Promote to admin (full access) or set as staff (Staff Dashboard only).
4. Deactivate: When someone leaves, deactivate their account the same day. Never share your own admin credentials.`,
  },
  {
    id: "ch9",
    title: "Chapter 9: Integration Icons",
    color: "rgb(107,85,64)",
    content: `When you see integration icons in the dashboard — in the header, in data panels, or in settings — here is exactly what each system does and how it connects to Ritual.

SQUARE (squareup.com) — Payment processing and invoicing
• Ritual's primary payment processor. Every spa deposit, hotel invoice, and catering payment runs through Square.
• The Square Invoices tile connects to the Invoice Generator, which creates and sends Square payment links.
• Square holds all historical payment records. If a guest disputes a charge, log into Square Dashboard to pull the transaction.
• For end-of-month reconciliation, Square's Reports > Sales Summary is the official record for spa and custom-invoice revenue.

CLOUDBEDS (cloudbeds.com) — Hotel Property Management System
• The hotel's brain. Every room reservation — website, phone, or OTA — lives in Cloudbeds.
• Dashboard connects via OAuth token. When it shows "Connected to Cloudbeds" with green check, live data is flowing.
• Arrivals, departures, and in-house counts on the Day in 60 Seconds panel come directly from Cloudbeds in real time.
• If the token expires (8-hour lifespan), go to AdminCloudbeds → Refresh Token. If that fails, Reconnect Cloudbeds.
• Cloudbeds handles folio management — room charges, discounts, and final guest bills. Guest's invoice comes from Cloudbeds, not Square.

TOAST (toasttab.com) — Restaurant Point of Sale
• The restaurant's cash register and order management system. Every order goes through Toast POS on the tablet.
• Dashboard pulls Toast's daily sales summary each evening — net sales, gross sales, tax, and labor costs.
• Cannot create or modify restaurant orders from the Ritual dashboard — all in-service operations happen on the Toast tablet.
• Use "Open Toast" link to jump to Toast admin for full reporting, menu changes, timeclock, and order history.
• If data looks wrong, click "Sync Today" to force a refresh from Toast.

SIMPLYBOOK.ME (ritualtexas.simplybook.me/v2/) — Spa booking engine
• The actual booking engine for all spa appointments. When a guest books a treatment on the website, they use SimplyBook.
• Every spa appointment in the Spa Schedule admin page is pulled live from SimplyBook.
• To modify an appointment (reschedule, cancel), log into SimplyBook directly as admin — Ritual can read SimplyBook data but not write to it from here.
• SimplyBook sends automated confirmation and reminder emails to guests automatically.
• Pricing in SimplyBook must always match the Treatments page in the Ritual admin. Update both when prices change.

LOMAN (loman.ai) — AI phone answering and voice concierge
• AI-powered phone system that handles inbound calls — answering guest questions, taking messages, routing urgent calls.
• Uses the Knowledge Base content from the Ritual admin to answer questions about rooms, spa, restaurant hours, and policies.
• Calls Loman cannot handle are transferred to live staff or sent as transcripts to the Concierge Inbox.
• Review Loman call transcripts weekly to identify common questions. If guests frequently ask something Loman answers poorly, add it to the Knowledge Base.
• Loman's effectiveness = Knowledge Base quality. A well-maintained KB equals a well-performing phone system.

OPTIMUM (optimum.net) — Business phone and internet service provider
• Optimum is Ritual's business phone and internet service provider for the physical property — this is NOT a restaurant management or inventory tool.
• Use the Optimum portal to manage phone lines, view monthly bills, configure call forwarding, and adjust internet or voice service settings.
• Go to optimum.net and log in with the business account credentials to access your account and service settings.
• If a phone line is down, call forwarding is not working, or internet is having issues at the property, start here before calling support.
• Note for new managers: Optimum has no connection to restaurant food costing, recipe management, or POS systems. Those functions are handled by Toast.`,
  },
  {
    id: "ch10",
    title: "Chapter 10: Data Management & Imports",
    color: "rgb(120,120,120)",
    content: `These are not daily tasks — they are used for onboarding, migrations, or periodic data reconciliation. Run imports during off-peak hours.

IMPORT CLOUDBEDS — For migrating historical reservation data. Export from Cloudbeds: Reports > Reservations > Export as CSV. Upload here. Verify results in AdminBookings after import.

IMPORT SQUARE — For bringing historical Square payment/customer data into the CRM. Export from Square Dashboard > Customers > Export as CSV. Upload here. The import checks for existing email addresses to prevent duplicates.

IMPORT ACUITY — Ritual previously used Acuity Scheduling before switching to SimplyBook. This import brings historical Acuity appointment data into the system. For new managers: you will almost never need this. It exists for historical continuity.

IMPORT SIMPLYBOOK — Import SimplyBook client records into the Master CRM to ensure spa clients appear in the unified guest database. Export from SimplyBook Admin > Clients > Export. Upload here. For ongoing syncing, use the CRM Sync All function in Master CRM — this import is for bulk historical loads only.

SQUARE ARCHIVE — A read-only reference page archived in March 2026 when Ritual switched from Square Appointments to SimplyBook.me. Contains the original Square booking URLs for all 14 spa services. These links are no longer active. You will almost never need this page.

DATA MANAGEMENT BEST PRACTICES:
• Run imports during off-peak hours (early morning or late night).
• Always export a backup of existing data before running a large import.
• Never import the same file twice — may create duplicates.
• After any import, spot-check 5-10 records manually before relying on the results.
• Save your source export files in a dated folder so you can audit what was imported and when.`,
  },
];

// ── Highlight helper ──────────────────────────────────────────────────────────
function highlightText(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-100 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  );
}

// ── URL extraction helper ──────────────────────────────────────────────────────
// Finds URLs in parentheses like (squareup.com) or (cloudbeds.com) in section headers
// and renders the header text with a clickable link icon
function renderLineWithLinks(line, searchQuery) {
  // Check if ALL-CAPS header line contains a URL in parentheses
  const urlMatch = line.match(/\(([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\)]*)?)\)/);
  if (urlMatch && line === line.toUpperCase()) {
    const url = urlMatch[1];
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    return (
      <span>
        {highlightText(line.replace(urlMatch[0], ''), searchQuery)}
        {' '}
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-white text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "rgb(150,170,155)", verticalAlign: 'middle' }}
          onClick={e => e.stopPropagation()}
        >
          {url} ↗
        </a>
      </span>
    );
  }
  return highlightText(line, searchQuery);
}

// ── Chapter Accordion ─────────────────────────────────────────────────────────
function ChapterAccordion({ chapter, isOpen, onToggle, searchQuery, dimmed }) {
  const lines = chapter.content.split("\n");

  return (
    <div
      className={`border border-[rgb(235,225,213)] rounded-2xl overflow-hidden bg-white transition-all duration-200 ${dimmed ? "opacity-40" : "opacity-100"}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-90"
        style={{ backgroundColor: chapter.color }}
      >
        <span className="font-light text-white text-base tracking-wide">{chapter.title}</span>
        {isOpen
          ? <ChevronUp className="w-4 h-4 text-white/80 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-white/80 shrink-0" />}
      </button>

      {isOpen && (
        <div className="px-6 py-5 space-y-2">
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-2" />;

            // ALL-CAPS section headers (may include URL in parens)
            if (line === line.toUpperCase() && line.trim().length > 3 && !line.startsWith("•") && !line.match(/^\d\./)) {
              return (
                <p key={i} className="text-sm font-semibold tracking-widest mt-4 mb-1 flex items-center gap-2 flex-wrap" style={{ color: "rgb(150,170,155)" }}>
                  {renderLineWithLinks(line, searchQuery)}
                </p>
              );
            }
            // Numbered items
            if (/^\d+\./.test(line.trim())) {
              return (
                <p key={i} className="text-sm text-[rgb(45,45,45)] pl-4">
                  {highlightText(line, searchQuery)}
                </p>
              );
            }
            // Bullets
            if (line.trim().startsWith("•")) {
              return (
                <p key={i} className="text-sm text-[rgb(45,45,45)] pl-4">
                  {highlightText(line, searchQuery)}
                </p>
              );
            }
            // Pro Tip lines
            if (line.startsWith("Pro Tip:") || line.startsWith("CRITICAL:") || line.startsWith("Deposit Policy:")) {
              return (
                <div key={i} className="bg-[rgb(255,248,240)] border border-[rgb(198,182,165)] rounded-xl px-4 py-3 mt-3">
                  <p className="text-sm text-[rgb(107,85,64)]">{highlightText(line, searchQuery)}</p>
                </div>
              );
            }
            // Regular body
            return (
              <p key={i} className="text-sm text-[rgb(45,45,45)] leading-relaxed">
                {highlightText(line, searchQuery)}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pro Tips Sidebar ──────────────────────────────────────────────────────────
function ProTipsSidebar() {
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTipIndex(i => (i + 1) % PRO_TIPS.length);
        setVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[rgb(255,248,240)] border border-[rgb(198,182,165)] rounded-2xl p-5 sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4" style={{ color: "rgb(150,170,155)" }} />
        <span className="text-sm font-semibold tracking-widest text-[rgb(107,85,64)] uppercase">Pro Tips</span>
      </div>

      <div
        className="transition-opacity duration-400 min-h-[80px]"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <p className="text-sm text-[rgb(45,45,45)] leading-relaxed italic">"{PRO_TIPS[tipIndex]}"</p>
      </div>

      <div className="flex gap-1 mt-4 flex-wrap">
        {PRO_TIPS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setTipIndex(i); setVisible(true); }}
            className="w-2 h-2 rounded-full transition-all"
            style={{ backgroundColor: i === tipIndex ? "rgb(150,170,155)" : "rgb(198,182,165)" }}
          />
        ))}
      </div>

      <button
        onClick={() => setShowAll(!showAll)}
        className="mt-4 text-xs text-[rgb(107,85,64)] hover:underline"
      >
        {showAll ? "Show less" : "Show all tips"}
      </button>

      {showAll && (
        <div className="mt-3 space-y-3">
          {PRO_TIPS.map((tip, i) => (
            <p key={i} className="text-xs text-[rgb(45,45,45)] leading-relaxed border-t border-[rgb(235,225,213)] pt-2">
              <span className="font-semibold text-[rgb(150,170,155)]">{i + 1}.</span> {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminTrainingManual() {
  const defaultOpen = CHAPTERS.reduce((acc, ch) => {
    acc[ch.id] = !!ch.defaultOpen;
    return acc;
  }, {});

  const [openMap, setOpenMap] = useState(defaultOpen);
  const [search, setSearch] = useState("");

  const toggle = (id) => setOpenMap(prev => ({ ...prev, [id]: !prev[id] }));

  const matchingIds = search
    ? new Set(
        CHAPTERS.filter(ch =>
          ch.title.toLowerCase().includes(search.toLowerCase()) ||
          ch.content.toLowerCase().includes(search.toLowerCase())
        ).map(ch => ch.id)
      )
    : null;

  const matchCount = matchingIds ? matchingIds.size : null;

  const clearSearch = () => {
    setSearch("");
    setOpenMap(defaultOpen);
  };

  // Auto-expand matching chapters when searching
  useEffect(() => {
    if (!matchingIds) return;
    setOpenMap(prev => {
      const next = { ...prev };
      CHAPTERS.forEach(ch => {
        if (matchingIds.has(ch.id)) next[ch.id] = true;
        else next[ch.id] = false;
      });
      return next;
    });
  }, [search]);

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Sticky Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl("AdminDashboard")}
              className="p-2 rounded-xl hover:bg-[rgb(248,246,242)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
            </Link>
            <div>
              <h1 className="text-lg font-light text-[rgb(107,85,64)]">Manager Training Manual</h1>
              <p className="text-xs text-[rgb(150,150,150)]">Ritual Hotel · Spa · Restaurant</p>
            </div>
          </div>
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: "rgb(107,85,64)" }}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(150,150,150)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search the manual... (try 'housekeeping', 'Square', 'intake')"
              className="w-full pl-11 pr-10 py-3 border border-[rgb(235,225,213)] rounded-2xl bg-white text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(198,182,165)] transition-all duration-200"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {search && matchCount !== null && (
            <p className="text-xs text-[rgb(150,150,150)] mt-2 ml-1">
              {matchCount > 0
                ? `Results found in ${matchCount} chapter${matchCount !== 1 ? "s" : ""}`
                : "No chapters match your search"}
            </p>
          )}
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">
          {/* Chapters */}
          <div className="flex-1 space-y-3 min-w-0">
            {CHAPTERS.map(ch => {
              const dimmed = matchingIds !== null && !matchingIds.has(ch.id);
              return (
                <ChapterAccordion
                  key={ch.id}
                  chapter={ch}
                  isOpen={!!openMap[ch.id]}
                  onToggle={() => toggle(ch.id)}
                  searchQuery={search}
                  dimmed={dimmed}
                />
              );
            })}
          </div>

          {/* Pro Tips Sidebar — desktop only */}
          <div className="hidden lg:block w-72 shrink-0">
            <ProTipsSidebar />
          </div>
        </div>

        {/* Pro Tips — mobile (below chapters) */}
        <div className="lg:hidden mt-6">
          <ProTipsSidebar />
        </div>
      </div>
    </div>
  );
}