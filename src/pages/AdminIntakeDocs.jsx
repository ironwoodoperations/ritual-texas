import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";

const SPEC = `# Hotel RITUAL — Reservation Intake Page: Technical Documentation

Generated: March 2026
Page: AdminIntake (pages/AdminIntake.jsx)
Route: /AdminIntake

---

## 1. PURPOSE

The Reservation Intake page is the central booking pipeline for Hotel RITUAL admin staff. It manages all inbound hotel + spa inquiries from first contact through confirmed booking. It is NOT a guest-facing page — it is an internal operations tool.

Workflow: New Inquiry → Pending → Confirmed (→ Archived)

---

## 2. ENTITY: HotelTreatmentIntake

Primary entity powering this page. Each record represents one guest inquiry/booking.

### Fields

**Guest Info**
- guestName (string, required) — Primary guest full name
- phone (string) — Guest phone number
- email (string) — Guest email address
- preferredContactMethod (enum) — phone | text | email
- howDidYouHearAboutUs (string) — Marketing source / referral

**Hotel Reservation (Cloudbeds)**
- checkInDate (date) — YYYY-MM-DD
- checkOutDate (date) — YYYY-MM-DD
- numberOfGuests (number, default 1) — Adult count
- numberOfChildren (number, default 0) — Child count
- cloudbedsRoomTypeId (string) — Room type ID from Cloudbeds or manual override
- roomRequested (string) — Human-readable room name
- flexibleOnRoom (boolean, default false)
- hotelNotes (string) — Special hotel requests

**Additional Guests** (array[object]) — For multi-guest Cloudbeds reservations
- Each entry: { name, email, phone }

**Treatments (SimplyBook — Online Booking)**
- selectedTreatments (array[string]) — JSON-stringified entries
  - Each entry: { id, name, price, duration, date, time, staffId, staffName, guestName, serviceName }

**Treatments (Call-to-Book)**
- callToBookTreatments (array[string]) — JSON-stringified entries
  - Each entry: { id, name, price, duration, date, time, qty, guestName }
- treatmentsRequested (string) — Free-text treatment notes

**Therapist Pipeline**
- therapistAssigned (string) — Whitney / Bishop / Tanita / other
- therapistStatus (enum) — not_contacted | contacted | follow_up | approved | declined
- therapistFollowUpDate (date)
- therapistNotes (string)
- therapistContacted (boolean)
- therapistConfirmed (boolean)
- therapistResponseNotes (string)

**Booking Status & Follow-Up**
- bookingStatus (enum) — new_inquiry | pending | confirmed | declined | archived
- verificationStatus (enum) — pending | confirmed | declined
- followUpDate (date)
- internalNotes (string)

**Card on File**
- ccName (string) — Cardholder name
- ccNumber (string) — Full card number (stored server-side)
- ccLast4 (string) — Last 4 digits
- ccExpiry (string) — MM/YY
- ccCvc (string)
- ccType (string) — Visa | Mastercard | Amex | Discover
- ccNotes (string) — Auth amount, date, notes

**Taxes**
- taxes (object) — Key-value map of selected tax checkboxes
  - Sales taxes: sales_state (6.25%), sales_city (1%), sales_jedc (0.5%), sales_county (0.5%)
  - Hotel taxes: hotel_state (6%), hotel_city (7%), hotel_venue (2%)

**Built-in fields (auto)**
- id, created_date, updated_date, created_by

---

## 3. BACKEND FUNCTIONS CALLED

### cloudbedsGetAvailableRooms
- Trigger: Auto-called when both checkInDate and checkOutDate are set in the intake form
- Payload: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
- Returns: { success: boolean, rooms: [{ roomTypeID, name, price }] }
- Caches results in ApiCache entity (TTL: 2 min)
- Fallback: Manual room list (Suite 1–5, Carriage House) if Cloudbeds unavailable

### getIntakeFormData
- Trigger: On page load
- Payload: {}
- Returns: { cloudbeds: { roomTypes: [{ id, name, maxOccupancy }] }, treatments: [...] }
- Used to populate room type dropdowns

### intakeCreateInvoiceDraft
- Trigger: "View & Send Quote" action button
- Payload: { intake: HotelTreatmentIntake record + parsed treatment entries }
  - _sbEntries: parsed selectedTreatments array
  - _ctbEntries: parsed callToBookTreatments array
- Returns: { invoiceId, draftUrl, error? }
- Creates a Square invoice DRAFT with all line items (room nights + treatments)
- Line items include: room stay, each treatment, applicable taxes
- Requires: guest email, check-in date, check-out date

### intakePublishInvoice
- Trigger: Auto-called after intakeCreateInvoiceDraft succeeds, OR manually via "Send to Guest"
- Payload: { invoiceId: string }
- Returns: { success, message, error? }
- Publishes (sends) the Square invoice draft to the guest's email

### intakeBookHotel
- Trigger: "Book in Cloudbeds" action button
- Payload: { intake: HotelTreatmentIntake record }
- Returns: { success, message, confirmationCode?, error? }
- Creates a real reservation in Cloudbeds PMS
- Requires: guest email, check-in date, check-out date, cloudbedsRoomTypeId
- Uses Cloudbeds OAuth token stored in SiteSettings

### intakeBookTreatments
- Trigger: (Internal — not directly exposed in current UI)
- Payload: { intake: { ...record, selectedTreatments: parsed array } }
- Returns: { success, message, results?, error? }
- Books treatments in SimplyBook.me via JSON-RPC

### crmUpsertContact
- Trigger: "Add to CRM" action button
- Payload: { firstName, lastName, fullName, email, phone, tags: ["intake"] }
- Returns: { ok, contactId?, error? }
- Creates or updates a contact in CrmContact entity

---

## 4. TREATMENT DATA LOADING

On page load, the page loads from the Treatment entity:
- base44.entities.Treatment.list("sort_order", 100)
- Filters to is_available !== false
- Splits into:
  - bookOnlineTreatments: booking_mode === "book_online" or no booking_mode
  - callToBookTreatments: booking_mode === "call_to_book" or "call_and_info"

Treatment fields used: id, name, price, duration_minutes, booking_mode, is_available

---

## 5. COMPONENT ARCHITECTURE

### AdminIntake (main page)
- Loads all HotelTreatmentIntake records (max 100, sorted by -created_date)
- Manages filters: search (name/phone/email), statusFilter (active/all/new_inquiry/pending/confirmed/declined/archived)
- "Active" filter = all records where bookingStatus !== "archived" AND !== "declined"

### IntakeCard (per-record component)
- Collapsible card per record
- Expanded view shows: contact info, dates, treatments (parsed), notes, therapist, card on file
- Actions (per card):
  - View & Send Quote → opens InvoicePreviewModal → then runAction("SendQuote")
  - Book in Cloudbeds → runAction("BookHotel")
  - Book in SimplyBook → external link to https://simplybook.me
  - Add to CRM → runAction("AddToCRM")
  - Edit → switches card to IntakeForm editing mode
  - Archive → sets bookingStatus to "archived"
- Completed actions tracked in localStorage (key: intake_completed_{record.id})

### IntakeForm (create/edit form)
- All fields from HotelTreatmentIntake entity
- Room availability: live Cloudbeds lookup (cloudbedsGetAvailableRooms) with manual fallback
- Treatments: TreatmentSlotPicker component for SimplyBook + Call-to-book entries
- Therapist: TherapistSection component
- Taxes: Checkbox grid for sales + hotel occupancy taxes
- Google Calendar integration: "Add to Google Calendar" deep-link for follow-up dates
  - URL: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...
- Save actions: "Save Form" (save only) | "View Quote Before Sending" (save + trigger quote)

### InvoicePreviewModal (component/intake/InvoicePreviewModal)
- Shows itemized preview of what the Square invoice will contain
- Confirm button triggers intakeCreateInvoiceDraft + intakePublishInvoice

### TreatmentSlotPicker (component/intake/TreatmentSlotPicker)
- Add/remove SimplyBook treatment slots with date, time, provider, guest name, price
- Add/remove Call-to-Book treatment entries with quantity and guest name
- Each treatment stored as JSON string in selectedTreatments / callToBookTreatments arrays

### TherapistSection (component/intake/TherapistSection)
- Assign therapist (Whitney / Bishop / Tanita / Other)
- Set therapist outreach status (not_contacted → contacted → follow_up → approved/declined)
- Set follow-up date, therapist notes

---

## 6. RELATED ENTITIES (READ)

- Treatment — Spa services catalog (load treatment options)
- Suite — Room listing fallback if Cloudbeds unavailable
- SpaBooking — Referenced in spa schedule (not directly used in intake)
- CrmContact — Destination for "Add to CRM" action
- Booking — Separate entity for Cloudbeds-synced bookings (not same as intake)

---

## 7. EXTERNAL APIs & INTEGRATIONS

### Cloudbeds (Hotel PMS)
- Purpose: Check room availability, create hotel reservations
- Auth: OAuth2 access token stored in SiteSettings (key: cloudbeds_access_token)
- Token refreshed every 30 min by refreshCloudbedsToken scheduled function
- Property ID: stored in CLOUDBEDS_PROPERTY_ID env var

### Square (Invoicing)
- Purpose: Create and send invoice quotes to guests
- Auth: API Key — SQUARE_ACCESS_TOKEN env var
- Environment: SQUARE_ENV env var (production or sandbox)
- Flow: Create draft invoice → publish (sends email to guest)

### SimplyBook.me (Spa Scheduling)
- Purpose: Book spa treatments
- Auth: JSON-RPC API with company login + credentials
  - SIMPLYBOOK_COMPANY_LOGIN
  - SIMPLYBOOK_USER_LOGIN / SIMPLYBOOK_USER_PASSWORD
  - SIMPLYBOOK_ADMIN_LOGIN / SIMPLYBOOK_ADMIN_PASSWORD
  - SIMPLYBOOK_API_KEY / SIMPLYBOOK_SECRET_KEY

### Google Calendar
- Purpose: Follow-up date reminders
- Integration: Deep link only (no server auth required)
- No API keys needed

---

## 8. TAX RATES REFERENCE

### Sales Tax (Retail / Treatments) — Combined: 8.25%
| Key          | Name                                    | Rate  |
|------------- |-----------------------------------------|-------|
| sales_state  | State of Texas                          | 6.25% |
| sales_city   | City of Jacksonville                    | 1.00% |
| sales_jedc   | Jacksonville Economic Development (JEDC)| 0.50% |
| sales_county | Cherokee County                         | 0.50% |

### Hotel Occupancy Tax (Room Stay) — Combined: 15.00%
| Key         | Name                      | Rate  | Note                        |
|-------------|---------------------------|-------|-----------------------------|
| hotel_state | State of Texas            | 6.00% | Applies to stays $15+/day   |
| hotel_city  | City of Jacksonville      | 7.00% | General municipal hotel tax |
| hotel_venue | Jacksonville Venue Tax    | 2.00% | Voter-approved civic proj.  |

---

## 9. ENVIRONMENT VARIABLES REQUIRED

| Variable                    | Purpose                            |
|-----------------------------|------------------------------------|
| CLOUDBEDS_CLIENT_ID         | Cloudbeds OAuth client ID          |
| CLOUDBEDS_CLIENT_SECRET     | Cloudbeds OAuth client secret      |
| CLOUDBEDS_PROPERTY_ID       | Cloudbeds property identifier      |
| SQUARE_ACCESS_TOKEN         | Square API key                     |
| SQUARE_APP_ID               | Square application ID              |
| SQUARE_ENV                  | Square environment (production)    |
| SQUARE_WEBHOOK_SIGNATURE_KEY| Square webhook HMAC key            |
| SIMPLYBOOK_COMPANY_LOGIN    | SimplyBook company identifier      |
| SIMPLYBOOK_USER_LOGIN       | SimplyBook user login              |
| SIMPLYBOOK_USER_PASSWORD    | SimplyBook user password           |
| SIMPLYBOOK_ADMIN_LOGIN      | SimplyBook admin login             |
| SIMPLYBOOK_ADMIN_PASSWORD   | SimplyBook admin password          |
| SIMPLYBOOK_API_KEY          | SimplyBook API key                 |
| SIMPLYBOOK_SECRET_KEY       | SimplyBook secret key              |
| PUBLIC_BASE_URL             | App public URL (for links/emails)  |

---

## 10. ACTION FLOW: FULL BOOKING PIPELINE

1. Admin receives call/inquiry from guest
2. Admin opens AdminIntake → "+ New Intake"
3. Fills in guest info, dates, room, treatments, therapist, card on file
4. Saves form → HotelTreatmentIntake record created with bookingStatus: "new_inquiry"
5. Admin clicks "View & Send Quote":
   → InvoicePreviewModal shows itemized breakdown
   → Admin confirms → intakeCreateInvoiceDraft called
   → intakePublishInvoice called → email sent to guest
   → Status updated to "pending"
6. Guest reviews invoice, therapist confirms availability
7. Admin clicks "Book in Cloudbeds" → intakeBookHotel → reservation created in PMS
8. Admin opens simplybook.me to confirm spa slots manually
9. Admin clicks "Add to CRM" → guest added to Master CRM
10. Admin updates bookingStatus to "confirmed"
11. When complete, admin Archives the record

---

## 11. ERROR HANDLING PATTERNS

- Cloudbeds unavailable: Falls back to manual room list (MANUAL_ROOMS)
- Square invoice error: Shows error message + raw API response detail
- intakePublishInvoice fails: Shows draft URL + manual "Send to Guest" button
- Missing email: Disables "View Quote Before Sending" button with tooltip
- Missing dates: Disables "Book in Cloudbeds" and "Send Quote" with inline error
- Completed actions: Stored in localStorage per record; shown with green checkmark
`;

export default function AdminIntakeDocs() {
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
            <Link to={createPageUrl("AdminDocs")} className="p-2 rounded-xl hover:bg-[rgb(248,246,242)]">
              <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-[rgb(107,85,64)]">Intake Page — Technical Documentation</h1>
              <p className="text-xs text-[rgb(150,150,150)]">Full reference: entities, functions, APIs, workflows</p>
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