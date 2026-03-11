import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";

const SPEC = `# Hotel RITUAL — Project Technical Specification

Generated: March 11, 2026
Platform: Base44 (React + Deno backend functions)
App ID: 6952b5de56519adda6e982ce

---

## 1. DATABASE SCHEMA

### Booking
Local mirror of Cloudbeds reservations (synced hourly).
- confirmation_code (string) — Cloudbeds confirmation #
- guest_name, guest_email, guest_phone (string)
- room_id, room_name (string)
- check_in_date, check_out_date (date)
- num_guests (number)
- arrival_window (enum) — early_afternoon, late_afternoon, evening
- wellness_intention, special_requests (string)
- treatments (array[object]) — embedded treatment schedule
- package_id, package_name (string)
- room_total, treatments_total, grand_total, deposit_paid (number)
- payment_status (enum) — pending, deposit_paid, fully_paid
- booking_status (enum) — pending, confirmed, checked_in, checked_out, cancelled
- itinerary_sent (boolean)

### HotelTreatmentIntake
Manual intake form filled by admin staff for new hotel + spa inquiries.
- guestName, phone, email (string)
- preferredContactMethod (enum) — phone, text, email
- checkInDate, checkOutDate (date)
- numberOfGuests, numberOfChildren (number)
- cloudbedsRoomTypeId (string) — Room from Cloudbeds or manual override
- flexibleOnRoom (boolean)
- hotelNotes (string)
- additionalGuests (array[object]) — name, email, phone per guest
- selectedTreatments (array[string]) — JSON-serialized "Book Online" treatment entries
- callToBookTreatments (array[string]) — JSON-serialized "Call to Book" treatment entries
- treatmentsRequested (string) — free-text notes
- therapistAssigned (string) — Whitney / Bishop / Tanita
- therapistStatus (enum) — not_contacted, contacted, follow_up, approved, declined
- therapistFollowUpDate (date)
- therapistNotes (string)
- bookingStatus (enum) — new_inquiry, pending, confirmed, declined, archived
- followUpDate (date)
- internalNotes (string)
- ccName, ccNumber, ccLast4, ccExpiry, ccCvc, ccType, ccNotes (string) — card on file
- howDidYouHearAboutUs (string)

### Treatment
Spa services catalog.
- name, slug (string)
- category (enum) — massage, facial, body, ritual, wellness
- what_it_is, how_it_feels, why_choose, what_to_expect_after, not_for (string)
- duration_minutes, price (number)
- sort_order (number)
- booking_mode (enum) — book_online, request_info, call_to_book, call_and_info
- is_available (boolean)
- video_url (string) — YouTube URL

### SpaBooking
Live spa appointments (imported from Acuity/SimplyBook or manual).
- startAt (datetime)
- status (string) — e.g. booking.cancelled
- (provider-specific fields)

### Suite / Room
Two overlapping room/suite catalogs.
- name, slug, headline, description (string)
- level (string) — First level, Second level, Carriage House
- features, images (array[string])
- price_per_night (number)
- max_occupancy (number)
- sort_order (number)
- is_available (boolean)

### Package
Spa/stay packages available to guests.
- name, slug, description (string)
- price (number)
- is_active (boolean)

### PackageInquiry
Guest inquiries about packages.
- guest_name, email, phone (string)
- package_id, package_name (string)
- status (enum) — new, in_progress, resolved
- notes (string)

### CateringQuote
Catering event quotes.
- status (enum) — draft, sent, accepted, deposit_paid, completed, cancelled
- (event details, line items, totals)

### CateringMenuItem
Catering menu items with cost/margin tracking.
- name, category, description (string)
- base_price, serving_size (number)
- ingredients (array[object]) — name, qty_per_serving, unit, category, cost_per_unit, vendor
- prep_notes (string)
- margin_percent (number) — default 30%
- is_active (boolean)

### RestaurantDailySpecials
- title, description (string)
- price (number)
- category (enum) — Lunch, Dinner, Bar, Dessert, Other
- isActiveToday, isArchived, isSoup (boolean)
- soupName (string)

### RestaurantReservationRequests
- guest_name, email, phone (string)
- date, time, party_size (various)
- status (enum) — pending, confirmed, cancelled

### RestaurantEventLeads
- name, email, phone (string)
- event_type, event_date (string / date)
- status (enum) — pending, contacted, booked, declined

### RestaurantContactLeads
- name, email, message (string)
- status (enum) — new, read, archived

### ToastDailySummary
Synced daily POS summary from Toast.
- businessDate (date)
- netSales, laborTotalCost (number)
- (other Toast metrics)

### ManualSalesDay / SalesWeekArchive
Restaurant labor & sales tracking independent of Toast.
- date, weekKey (string) — weekKey = Tuesday start
- sales, labor, laborHours (number)

### HkRoom
- roomNumber, roomType (string)
- active (boolean)
- sortOrder (number)

### HkTask
Daily housekeeping task assignments.
- taskDate (date)
- roomId, roomNumber (string)
- source (enum) — cloudbeds, manual, admin
- taskType (enum) — opening_duty, closing_duty, checkout, stayover, deep_clean, public_space, manual
- priority (enum) — low, normal, high, urgent
- status (enum) — pending, in_progress, paused, completed, needs_review
- assignedToUserId (string)
- startedAt, completedAt (datetime)
- completionPercent (number)
- adminNotes, housekeeperNotes (string)
- isBlocker (boolean) — opening duties block other tasks

### HkTaskItem, HkNote, HkIssue, HkTemplate, HkPublicSpace
Housekeeping sub-entities for checklist items, notes, open issues, and reusable templates.

### KnowledgeBase
Content for Whitney AI agent.
- category (enum) — check_in, check_out, treatments, property, policies, what_to_bring, faq
- title, content (string)
- video_url (string)
- is_active (boolean)

### CrmContact / CrmIdentity / CrmEvent / MarketingCRM
Master CRM for guests. Contacts with identity deduplication and event history.

### Testimonial
- author, quote (string)
- rating (number)
- source_name, source_url (string)
- sort_order (number)
- is_active (boolean)

### ReviewPlacement
- key (string) — e.g. home.hero
- testimonial_slug (string)
- is_active (boolean)

### PressItem
- title, publisher, url (string)
- thumbnail_url, pull_quote (string)
- sort_order (number)
- is_active (boolean)

### ImageAsset / MediaAsset
Image and media library.
- name, url, placement_key (string)
- type (enum) — photo, video
- tags (array[string])
- sort_order, is_active (number / boolean)

### SiteSettings / AppSetting
Key-value configuration store for dynamic settings (e.g. menu source toggle, PDF URL).
- key, value, description (string)

### ApiCache
Short-lived cache for external API responses.
- source_system (enum) — cloudbeds, square, simplybook
- cache_key (string) — source:endpoint:id
- payload (string) — JSON blob
- expires_at (datetime)

### BlockedDate
Dates blocked from public booking (per room or property-wide).
- room_id (string) — room ID or 'all'
- date (date)
- reason (string)

### StaffPin, StaffModuleSetting, DailyChecklist, OpsTask, FollowUpQueue
Staff operations entities — PIN auth, module toggles, daily task checklists, and follow-up queues.

### User (built-in)
- id, email, full_name (read-only)
- role (enum) — admin, user

---

## 2. AUTOMATED WORKFLOWS

1. Sync Cloudbeds Bookings — Scheduled every 1 hour
   Function: syncCloudbedsBookings
   Pulls reservations from Cloudbeds API and upserts into local Booking entity.

2. Cloudbeds Token Refresh — Scheduled every 30 minutes (from 6am)
   Function: refreshCloudbedsToken
   Refreshes Cloudbeds OAuth2 access token before expiry, stored in SiteSettings.

3. Generate Daily HK Tasks — Scheduled daily at 12:00 PM
   Function: hk_generate_checkout_tasks
   Auto-generates checkout and stayover housekeeping tasks based on Cloudbeds arrivals/departures.

4. Reset Daily Checklists — Scheduled daily at 11:00 PM
   Function: resetDailyChecklists
   Resets staff daily checklists for the next day.

---

## 3. BACKEND FUNCTIONS & API LOGIC

### Cloudbeds Integration
- cloudbedsGetAvailableRooms — Fetches live room availability by date range; caches in ApiCache
- cloudbedsCreateReservation — Creates a new reservation in Cloudbeds
- cloudbedsUpcomingReservations — Returns paginated upcoming reservations
- cloudbedsReservationsLookup — Lookup by guest name/date
- cloudbedsGuestActions — Check-in, check-out, and payment actions
- cloudbedsProcessPayment — Processes payment against a reservation
- cloudbedsOAuthStart / cloudbedsOAuthCallback — OAuth2 authorization flow
- refreshCloudbedsToken / _cloudbedsAuth — Token management helpers
- importCloudbedsReservations / importCloudbedsProfiles — Bulk import tools
- syncCloudbedsBookings — Scheduled hourly sync
- cloudbedsDebugAuth — Debug token state
- getCloudbeds — Generic proxy endpoint

### Square Integration
- intakeCreateInvoiceDraft — Creates a Square invoice draft from an intake form
- intakePublishInvoice — Publishes (sends) a Square invoice draft to guest email
- squareListInvoices — Lists Square invoices with filters
- squareInvoiceActions — Cancel, duplicate, or resend invoices
- squareCreateInvoice — Generic invoice creator
- importSquareCustomers — Imports Square customer list into CRM
- squareWebhook — Receives Square webhook events

### SimplyBook.me Integration
- simplybookGetAvailability — Fetches service availability via JSON-RPC; caches 2 min
- simplybookGetStaff — Fetches staff/provider list
- simplybookCallback — OAuth callback handler
- intakeBookTreatments — Books treatments in SimplyBook from intake form entries

### Toast POS Integration
- toastSyncMenu — Syncs menu items from Toast
- toastSyncTodaySummary — Syncs daily sales summary from Toast
- toastTestConnection / toastDebugEndpoints / toastProbeApi — Debug/test tools
- toastImportDailySpecials — Imports specials from Toast

### Intake / Invoicing Workflow
- intakeBookHotel — Books hotel stay in Cloudbeds from intake form
- intakeCreateInvoiceDraft — Creates Square invoice from intake
- intakePublishInvoice — Publishes Square invoice (sends email)
- intakeSendQuote — Generates branded PDF quote via jsPDF
- intakeCreateSquareQuote — Alternative Square quote flow
- getIntakeFormData — Fetches form dropdown data (room types, treatments)

### CRM
- crmUpsertContact — Creates or updates a contact in CrmContact
- crmAddEvent — Logs an event to a contact
- crmSyncAll — Bulk syncs all contacts from bookings + Square
- crmExportCsv — Exports CRM to CSV download

### Housekeeping
- hk_generate_checkout_tasks — Auto-generates daily HK tasks (scheduled)
- ops_build_daily_tasks — Builds ops task list for the day
- ops_mark_task_done — Marks an ops task complete

### Itinerary & Communications
- sendItineraryEmail — Sends formatted itinerary email to guest
- attachSpaToItinerary — Attaches spa appointments to guest itinerary
- exportSpaDayIcs — Exports spa schedule as .ics calendar file

### Misc
- resetDailyChecklists — Resets staff checklists nightly (scheduled)
- promoteUsersToAdmin — One-time utility to promote users
- inviteWhitney — Sets up Whitney AI agent
- seedHotelRitualContent — Seeds initial content data
- getGoogleCalendarEvents — Reads Google Calendar events

---

## 4. THIRD-PARTY INTEGRATIONS

- Cloudbeds — Hotel PMS (reservations, check-in/out, availability, payment) — OAuth2 tokens stored in SiteSettings
- Square — Invoicing, payment processing, customer records — API Key (SQUARE_ACCESS_TOKEN)
- SimplyBook.me — Spa appointment scheduling — JSON-RPC / API Key + credentials
- Toast POS — Restaurant POS (daily sales, menu, labor data) — OAuth2 Client Credentials (TOAST_CLIENT_ID/SECRET)
- Base44 LLM (Whitney) — AI concierge agent for guests — Built-in Base44 InvokeLLM
- Google Calendar — Follow-up reminders (deep-link only, no server auth)
- jsPDF — PDF quote generation (server-side npm package)

---

## 5. UI PAGES

### Public-Facing Pages
- Home — Landing page: hero, rooms preview, philosophy, testimonials, press, Whitney widget
- Hotel — Hotel overview: story, amenities, features
- Rooms — Browse all suites with details, images, and booking CTAs
- Treatments — Spa & wellness menu: treatment cards, booking modes, videos
- Packages — Curated stay packages with inquiry flow
- PackageDetail — Individual package detail page
- Amenities — Property amenities showcase
- Press — Press features and media coverage
- Restaurant — Restaurant overview
- RestaurantMenu — Public menu display (live from Toast or PDF fallback)
- RestaurantReservations — Guest reservation request form
- RestaurantEvents — Private event / large party inquiry form
- RestaurantContact — Restaurant contact form
- RestaurantOrder — Online ordering flow
- BookRooms — Room availability and booking flow
- BookingFlow — Multi-step booking wizard
- BookingConfirmation — Post-booking confirmation page
- booking — Booking detail/lookup by confirmation code
- afterBooking — Post-booking upsell / itinerary add-ons
- MyBooking — Guest self-service booking lookup
- concierge — Whitney AI concierge chat interface
- itinerary — Guest personal itinerary view
- AskRitual — AI Q&A interface for guests
- About — About Hotel RITUAL

### Admin Pages
- AdminDashboard — Command center: daily snapshot, quick links, section nav
- AdminIntake — Hotel + treatment intake CRM: create, manage, action (book hotel, send invoice, CRM)
- AdminBookings — View and manage Cloudbeds reservations
- AdminCreateReservation — Create a new Cloudbeds reservation
- AdminTodayItineraries — Print-ready itineraries for today's arrivals
- AdminSpaSchedule — Daily spa appointment schedule, tip requests, ICS export
- AdminHousekeeping — Housekeeping task board: assign, track, complete
- AdminHousekeepingTask — Individual task detail and checklist
- AdminHousekeepingIssues — Open housekeeping issues log
- AdminHousekeepingSetup — Room and template configuration
- AdminTreatments — Manage spa treatment catalog
- AdminRooms — Manage room/suite listings
- AdminPackages — Manage packages
- AdminPackageInquiries — Manage package inquiry leads
- AdminRestaurant — Restaurant reservations, event leads, contact leads
- AdminRestaurantSales — Weekly sales, labor, and metrics dashboard
- AdminCatering — Catering quote pipeline
- AdminCateringMenu — Catering menu item management with cost/margin
- AdminCateringQuote — Individual catering quote builder
- AdminInvoiceGenerator — Square invoice creator and manager
- AdminConciergeInbox — Concierge inbox: package inquiries + contact leads
- AdminMasterCRM — Master CRM: all contacts, events, marketing segments
- AdminKnowledge — Whitney knowledge base content management
- AdminImages — Image asset library
- AdminMedia — Media library (photos + videos)
- AdminCloudbeds — Cloudbeds OAuth connection and debug
- AdminCloudbedsImport — Bulk import Cloudbeds reservations
- AdminSquareImport — Import Square customer/transaction data
- AdminSquareBackup — Square transaction archive viewer
- AdminAcuityImport — Import Acuity Scheduling data
- AdminSimplybookImport — Import SimplyBook appointment data
- AdminSeedData — Seed initial content data
- AdminBase44 — Project technical specification (this page)

### Staff Pages
- StaffDashboard — Staff home: daily checklist, spa schedule, housekeeping, specials
- StaffLogin — PIN-based staff authentication
- StaffControls — Admin-facing staff module toggle controls

---

## 6. KEY ARCHITECTURAL PATTERNS

- Local data mirror: Cloudbeds reservations synced hourly into local Booking entity so all internal tools work without live API calls.
- Intake > Action pipeline: HotelTreatmentIntake records flow through: intake form > Square invoice > Cloudbeds booking > SimplyBook treatments > CRM.
- API caching: External API responses cached in ApiCache with TTL to reduce rate-limiting.
- Role-based access: All admin backend functions verify user.role === 'admin' before executing. Staff access is PIN-gated via StaffPin entity.
- Whitney AI Agent: Powered by Base44's built-in LLM with KnowledgeBase as context, available as in-app widget and via WhatsApp.
`;

export default function AdminBase44() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(SPEC);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("AdminDashboard")} className="p-2 rounded-xl hover:bg-[rgb(248,246,242)]">
              <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-[rgb(107,85,64)]">Project Technical Specification</h1>
              <p className="text-xs text-[rgb(150,150,150)]">Full architecture documentation — copy to use externally</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy All"}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <pre className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6 text-xs text-[rgb(45,45,45)] leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
          {SPEC}
        </pre>
      </div>
    </div>
  );
}