# SimplyBook Custom Booking Engine — Hotel RITUAL

> A complete custom booking engine that replaces SimplyBook's embedded widget.
> SimplyBook.me is used as the backend scheduling engine only — guests never see SimplyBook's UI or branding.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  Guest Browser                              │
│                                             │
│  SimplyBookEngine.jsx (React component)     │
│       ↓                                     │
│  src/lib/simplybook/*.ts (frontend wrappers)│
│       ↓                                     │
│  base44.functions.invoke(...)               │
└──────────────┬──────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────┐
│  Deno Edge Functions (functions/)           │
│                                             │
│  guestGetServices.ts      (read services)   │
│  guestGetMultiDayAvailability.ts (slots)    │
│  guestGetAvailability.ts  (single-day)      │
│  guestCreateBooking.ts    (book treatment)  │
│  guestCancelBooking.ts    (cancel booking)  │
│       ↓                                     │
│  SimplyBook JSON-RPC 2.0 API               │
└─────────────────────────────────────────────┘
```

All SimplyBook API calls go through our backend. The browser never contacts SimplyBook directly.

---

## Files

### Backend (Edge Functions)

| File | Auth | Purpose |
|------|------|---------|
| `functions/guestGetServices.ts` | None (guest-safe) | List all active, public treatments with providers |
| `functions/guestGetMultiDayAvailability.ts` | None (guest-safe) | Multi-date availability for a service |
| `functions/guestGetAvailability.ts` | None (guest-safe) | Single-date availability (existing) |
| `functions/guestCreateBooking.ts` | None (guest-safe) | Create booking (uses admin token internally) |
| `functions/guestCancelBooking.ts` | None (guest-safe) | Cancel booking |
| `functions/intakeBookTreatments.ts` | Admin | Bulk booking for staff intake flow |
| `functions/simplybookGetAvailability.ts` | Admin | Admin availability view |
| `functions/simplybookGetStaff.ts` | Admin | Admin staff list |
| `functions/simplybookCallback.ts` | None | Webhook handler for SimplyBook events |

### Frontend Lib (`src/lib/simplybook/`)

| File | Exports |
|------|---------|
| `index.ts` | Re-exports everything |
| `auth.ts` | Documentation only (auth is server-side) |
| `services.ts` | `getServices()`, `getStaff(serviceId?)` |
| `availability.ts` | `getAvailability(serviceId, dates[], providerId?)`, `getDateRange(start, end)` |
| `booking.ts` | `createBooking(data)`, `cancelBooking(id)`, `getBooking(id)` |
| `client.ts` | Documentation only (client mgmt is within booking flow) |

### UI Component

| File | Purpose |
|------|---------|
| `src/components/SimplyBookEngine.jsx` | Self-contained booking flow |

---

## UI Component — `SimplyBookEngine`

### Props

```jsx
<SimplyBookEngine
  stayDates={['2026-03-25', '2026-03-26', '2026-03-27']}
  guestName="John Doe"
  guestEmail="john@example.com"
  guestPhone="(903) 555-1234"
  onBookingComplete={(bookings) => {
    // bookings: BookingResult[]
    console.log('Booked:', bookings);
  }}
  onSkip={() => {
    console.log('Guest skipped treatments');
  }}
  brandColors={{
    primary: '#3B4831',
    accent: '#C57C5D',
    background: '#F0E8DD',
    card: '#FCF9F4',
  }}
/>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `stayDates` | `string[]` | Yes | Array of YYYY-MM-DD dates (guest's stay) |
| `guestName` | `string` | Yes | Pre-filled guest name |
| `guestEmail` | `string` | Yes | Pre-filled guest email |
| `guestPhone` | `string` | No | Pre-filled guest phone |
| `onBookingComplete` | `(bookings: BookingResult[]) => void` | Yes | Called when guest finishes |
| `onSkip` | `() => void` | No | Called when guest skips treatments |
| `brandColors` | `object` | No | Brand color overrides |

### Booking Flow

1. **Service Selection** — Shows all active treatments with name, duration, price
2. **Provider Selection** — Shows therapists for the selected treatment (skipped if only one)
3. **Date Selection** — Calendar grid showing stay dates, grayed out if unavailable
4. **Time Selection** — Pill buttons for available time slots
5. **Confirmation** — Summary card with all details, confirm button
6. **Done** — Success screen with option to add another treatment

### Multiple Bookings

Guests can book multiple treatments in one session. After each booking:
- A summary of booked treatments is shown
- "Add Another Treatment" returns to step 1
- "Continue" calls `onBookingComplete` with all bookings

### Error Handling

- **Slot taken**: "That time was just taken — please select another time." Returns to time picker.
- **API error**: Friendly message with phone number fallback
- **No availability**: Grayed-out dates with "Unavailable" label

---

## Integration Points

### 1. GuestBookNow.jsx (Step 3)

Replace the current treatment selection at Step 3 with `SimplyBookEngine`:

```jsx
import SimplyBookEngine from '@/components/SimplyBookEngine';

// In GuestBookNow Step 3:
{step === 3 && (
  <SimplyBookEngine
    stayDates={getDatesBetween(checkIn, checkOut)}
    guestName={guestName}
    guestEmail={email}
    guestPhone={phone}
    onBookingComplete={(bookings) => {
      // Store bookings, advance to step 4
      setSelectedOnline(bookings.map(b => ({
        treatment: { id: b.serviceId, name: b.serviceName, price: b.price, duration_minutes: b.durationMinutes },
        date: b.date,
        time: b.startTime,
        staffId: b.providerId,
        staffName: b.providerName,
        simplybookBookingId: b.bookingId,
      })));
      setStep(4);
    }}
    onSkip={() => setStep(4)}
    brandColors={{
      primary: DESIGN_TOKENS.primaryGreen,
      accent: DESIGN_TOKENS.accentTerracotta,
      background: DESIGN_TOKENS.bg,
      card: DESIGN_TOKENS.cardBg,
    }}
  />
)}
```

**Note**: Since `SimplyBookEngine` creates the SimplyBook booking immediately during the flow, the `guestSubmitBooking` function should skip the `intakeBookTreatments` step for treatments that already have a `simplybookBookingId`.

### 2. guestSubmitBooking.ts (Backend)

Update to detect already-booked treatments:

```typescript
// In guestSubmitBooking.ts, modify the SimplyBook booking step:
const alreadyBooked = payload.selectedTreatments?.filter(t => {
  const parsed = typeof t === 'string' ? JSON.parse(t) : t;
  return parsed.simplybookBookingId;
});
const needsBooking = payload.selectedTreatments?.filter(t => {
  const parsed = typeof t === 'string' ? JSON.parse(t) : t;
  return !parsed.simplybookBookingId;
});

// Only send needsBooking to intakeBookTreatments
if (needsBooking.length > 0) {
  const sbResult = await bookTreatmentsInSimplyBook(base44, intakeId, {
    ...payload,
    selectedTreatments: needsBooking,
  });
}
```

### 3. AdminIntake.jsx (Staff-facing)

The same `SimplyBookEngine` component can be embedded in the admin side panel:

```jsx
<SimplyBookEngine
  stayDates={getDatesBetween(intake.checkInDate, intake.checkOutDate)}
  guestName={intake.guestName}
  guestEmail={intake.email}
  guestPhone={intake.phone}
  onBookingComplete={(bookings) => {
    // Update intake record with new bookings
    updateIntake({ selectedTreatments: [...existing, ...bookings] });
  }}
  onSkip={() => {}}
/>
```

---

## API Methods

### `getServices()`

```typescript
import { getServices } from '@/lib/simplybook';

const { services, providers } = await getServices();
// services: SimplyBookService[]
// providers: SimplyBookProvider[]
```

Returns all active, public treatments with full details. Cached server-side for 5 minutes.

### `getAvailability(serviceId, dates, providerId?)`

```typescript
import { getAvailability, getDateRange } from '@/lib/simplybook';

const dates = getDateRange('2026-03-25', '2026-03-28');
const result = await getAvailability('1', dates);

// result.availability['2026-03-25'].hasAvailability → true/false
// result.availability['2026-03-25'].allSlots → ['09:00:00', '10:00:00', ...]
// result.availability['2026-03-25'].providers → [{ id, name, slots }]
// result.summary.datesWithAvailability → ['2026-03-25', '2026-03-26']
```

### `createBooking(data)`

```typescript
import { createBooking } from '@/lib/simplybook';

try {
  const { success, booking } = await createBooking({
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '(903) 555-1234',
    serviceId: '1',
    providerId: '2',    // optional: omit for "any available"
    date: '2026-03-25',
    time: '10:00',
  });
  // booking.bookingId, booking.serviceName, etc.
} catch (err) {
  if (err.code === 'SLOT_TAKEN') {
    // Show "slot taken" UI
  }
}
```

### `cancelBooking(bookingId)`

```typescript
import { cancelBooking } from '@/lib/simplybook';

const result = await cancelBooking('12345');
// result.success, result.message
```

---

## Environment Variables

All set in Base44 dashboard (edge function environment):

| Variable | Purpose | Required For |
|----------|---------|-------------|
| `SIMPLYBOOK_COMPANY_LOGIN` | Company identifier | All calls |
| `SIMPLYBOOK_API_KEY` | Public API key | Read operations |
| `SIMPLYBOOK_SECRET_KEY` | Secret key for admin auth | Write operations |
| `SIMPLYBOOK_USER_LOGIN` | Admin user login | Write operations |
| `SIMPLYBOOK_USER_PASSWORD` | Admin user password | Write operations |
| `SIMPLYBOOK_ADMIN_LOGIN` | Fallback admin login | Callback handler |
| `SIMPLYBOOK_ADMIN_PASSWORD` | Fallback admin password | Callback handler |

---

## Testing

### Test Checklist

To verify against the live SimplyBook account:

1. **Auth** — Both `getToken` and `getUserToken` succeed
   - Call `guestGetServices` — should return services without error
   - The `intakeBookTreatments._debugAuth` endpoint tests both tokens

2. **Services** — `guestGetServices` returns the actual treatment list
   - Verify service names match SimplyBook admin panel
   - Verify prices and durations are correct

3. **Availability** — `guestGetMultiDayAvailability` returns real slots
   - Test with a known-available date
   - Verify that past dates return no slots
   - Test date ranges spanning weekdays and weekends

4. **Booking** — `guestCreateBooking` creates a test booking
   - Use guest name "CLAUDE_TEST" for easy identification
   - Verify the booking appears in SimplyBook's admin panel
   - Check that `SpaBooking` entity was created locally

5. **Cancellation** — `guestCancelBooking` cancels the test booking
   - Verify the booking status updates in SimplyBook
   - Check that local `SpaBooking` status is "cancelled"

6. **UI** — `SimplyBookEngine` renders and completes the full flow
   - Services load and display correctly
   - Provider selection works (or auto-skips with single provider)
   - Date calendar shows correct availability states
   - Time pills display and are selectable
   - Confirmation shows correct details
   - Booking creates successfully

### Known Behaviors

- SimplyBook sends its own confirmation email — guests may receive two emails
- `addClient` with an existing email returns the existing client ID (no duplicates)
- `getStartTimeMatrix` date values can be arrays or objects — always normalize
- Provider name matching is case-insensitive and supports partial matches
- Booking `unitId` can be null — SimplyBook auto-assigns a provider

---

## Constraints

- No SimplyBook widget, iframe, or external script tags in the UI
- No SimplyBook branding visible to guests
- All API calls through our backend — never from the browser
- Token management handles expiry (fresh token per function call)
- Phone number format: SimplyBook accepts any string
- Booking operations handle slot conflicts gracefully (409 → retry UI)
