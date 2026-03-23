# SimplyBook.me API Findings

> Documented from working integration code in Hotel RITUAL's production codebase.
> All methods listed below have been verified against the live SimplyBook account.

---

## 1. Authentication

### Base URLs

| Purpose | URL |
|---------|-----|
| Auth (login) | `https://user-api.simplybook.me/login` |
| Public API | `https://user-api.simplybook.me` |
| Admin API | `https://user-api.simplybook.me/admin/` |

### Two Auth Methods

#### `getToken(company, apiKey)` — Public Read Token
- **Params**: `[companyLogin, apiKey]`
- **Returns**: Token string
- **Grants**: Read-only access — `getEventList`, `getUnitList`, `getStartTimeMatrix`
- **Env vars**: `SIMPLYBOOK_COMPANY_LOGIN`, `SIMPLYBOOK_API_KEY`
- **Lifetime**: ~30 minutes (undocumented, inferred from usage patterns)

#### `getUserToken(company, userLogin, userPassword, secretKey)` — Admin Token
- **Params**: `[companyLogin, userLogin, userPassword, secretKey]`
- **Returns**: Token string
- **Grants**: Full access including writes — `addClient`, `book`, `cancelBooking`
- **Env vars**: `SIMPLYBOOK_COMPANY_LOGIN`, `SIMPLYBOOK_USER_LOGIN`, `SIMPLYBOOK_USER_PASSWORD`, `SIMPLYBOOK_SECRET_KEY`

### Headers After Auth

```
X-Company-Login: {company}
X-Token: {token}
X-User-Token: {token}    // Required for admin operations
```

Both `X-Token` and `X-User-Token` should be set for all calls — SimplyBook uses whichever is appropriate.

---

## 2. RPC Call Pattern

All API calls use **JSON-RPC 2.0**:

```json
POST {url}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "{method}",
  "params": [{...}]
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

Errors:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": { "code": -32600, "message": "..." }
}
```

---

## 3. Services / Treatments — `getEventList`

**URL**: Public API (`https://user-api.simplybook.me`)
**Method**: `getEventList`
**Params**: `[]` (no params)
**Token**: Public (read) token

### Response Structure

Returns an **object** (not array) keyed by service ID:

```json
{
  "1": {
    "id": "1",
    "name": "Signature Massage",
    "duration": 60,
    "price": "150",
    "description": "A deeply relaxing full-body massage...",
    "is_active": true,
    "is_public": true,
    "position": 1,
    "unit_map": [1, 2, 3],
    "categories": [],
    "picture": null,
    "picture_path": null
  },
  "2": { ... }
}
```

### Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Service ID (used in booking) |
| `name` | string | Display name |
| `duration` | number | Duration in minutes |
| `price` | string/number | Price (may be string, always cast to Number) |
| `description` | string | HTML or plain text description |
| `is_active` | boolean | Whether service is enabled |
| `is_public` | boolean | Whether visible to public |
| `position` | number | Sort order |
| `unit_map` | number[] | Provider IDs that offer this service |
| `categories` | array | Category groupings (empty if not used) |
| `picture` | string\|null | Image filename |
| `picture_path` | string\|null | Full image path |

### Filtering

We filter to `is_active === true && is_public === true` for guest-facing display.
The `unit_map` array maps services to their available providers.

---

## 4. Providers / Therapists — `getUnitList`

**URL**: Public API
**Method**: `getUnitList`
**Params**: `[]`
**Token**: Public token

### Response Structure

Object keyed by provider ID:

```json
{
  "1": {
    "id": "1",
    "name": "Whitney",
    "phone": "",
    "position": "Lead Therapist",
    "description": "",
    "is_visible": true,
    "picture": null,
    "picture_path": null
  }
}
```

### Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Provider ID |
| `name` | string | Display name |
| `phone` | string | Contact phone |
| `position` | string | Job title / role |
| `description` | string | Bio / about text |
| `is_visible` | boolean | Whether to show in listings |
| `picture` | string\|null | Photo filename |
| `picture_path` | string\|null | Photo full path |

### Provider-Service Mapping

Providers are linked to services via the `unit_map` field on each service.
If `unit_map` is empty, all providers can perform that service.

---

## 5. Availability — `getStartTimeMatrix`

**URL**: Public API
**Method**: `getStartTimeMatrix`
**Params**: `[startDate, endDate, serviceId, unitId, count]`

| Param | Type | Description |
|-------|------|-------------|
| `startDate` | string | "YYYY-MM-DD" start of range |
| `endDate` | string | "YYYY-MM-DD" end of range |
| `serviceId` | string/number | Service to check |
| `unitId` | string/number | Provider to check |
| `count` | number | Number of slots needed (always `1`) |

### Response Structure

Object keyed by date:

```json
{
  "2026-03-25": ["09:00:00", "10:00:00", "11:00:00", "14:00:00"],
  "2026-03-26": {"09:00:00": "09:00:00", "10:00:00": "10:00:00"},
  "2026-03-27": []
}
```

**Important**: The value per date can be either:
- An **array** of time strings
- An **object** where keys are time strings

Always normalize: `Array.isArray(raw) ? raw : Object.keys(raw)`

### Time Format

Times are returned as `"HH:MM:SS"` (24-hour) or sometimes `"HH:MM"`.
Always normalize to `HH:MM:SS` format.

### Empty vs No Availability

- Empty array `[]` = no slots available
- Missing date key = no availability on that date
- No error thrown for unavailable dates

### Multi-Date Range Queries

`getStartTimeMatrix` supports date ranges natively. Passing `[startDate, endDate]` returns availability for all dates in the range — no need to make individual calls per date. This is the key optimization for our calendar view.

### Provider-Specific vs Any Provider

You must specify a `unitId` — there is no "any provider" mode in this method.
To show "any available" slots, query each provider separately and merge the results.

---

## 6. Client Management — `addClient`

**URL**: Admin API (`https://user-api.simplybook.me/admin/`)
**Method**: `addClient`
**Params**: `[clientPayload, sendNotification]`
**Token**: Admin token required

### Client Payload

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+19038106695"
}
```

### Behavior

- Returns: Client ID (number)
- If email already exists: Returns the **existing** client ID (dedup by email)
- Does NOT create duplicates
- `sendNotification: false` suppresses any welcome email

### Phone Number Format

SimplyBook accepts any string. No format enforced. We pass whatever the guest provides.

### Other Client Methods

Based on the callback handler, SimplyBook stores additional client fields in booking responses:
- `client_name`, `client_email`, `client_phone`

No `findClient`, `getClientByEmail`, or `getClientList` methods have been found to work with the public/admin API. The `addClient` method's dedup behavior serves as the effective "find or create" mechanism.

---

## 7. Booking — `book`

**URL**: Admin API
**Method**: `book`
**Params**: `[eventId, unitId, clientId, startDate, startTime, endDate, endTime, count, additional]`
**Token**: Admin token required

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | number | Service ID |
| `unitId` | number\|null | Provider ID (null = auto-assign) |
| `clientId` | number | Client ID from `addClient` |
| `startDate` | string | "YYYY-MM-DD" |
| `startTime` | string | "HH:MM:SS" |
| `endDate` | string | "YYYY-MM-DD" (usually same as startDate) |
| `endTime` | string | "HH:MM:SS" (calculated: startTime + duration) |
| `count` | number | Number of bookings (always `0` for single) |
| `additional` | object | Additional fields (see below) |

### Additional Fields

```json
{
  "predefined": {
    "client": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+19038106695"
    },
    "fields": {}
  }
}
```

### Response Structure

```json
{
  "bookings": [
    {
      "id": 12345,
      "hash": "abc123def456",
      "booking_id": 12345,
      "booking_hash": "abc123def456"
    }
  ]
}
```

Or sometimes a flat object:
```json
{
  "id": 12345,
  "hash": "abc123def456"
}
```

Always check both `bookingResult.bookings[0]` and `bookingResult` directly.

### Confirmation Emails

SimplyBook **does** send confirmation emails automatically on booking creation.
There is no known parameter to suppress this in the `book` call.
We send our own branded confirmation regardless — the guest may receive two emails.

### Error Cases

- Slot already taken: RPC error with message containing "busy", "occupied", "not available"
- Invalid service/provider: RPC error
- Invalid client: RPC error
- Past date: RPC error

---

## 8. Booking Lookup — `getBookingDetails`

**URL**: Admin API
**Method**: `getBookingDetails`
**Params**: `[bookingId, bookingHash]`
**Token**: Admin token

### Response Fields (from callback handler)

```json
{
  "start_date_time": "2026-03-25 10:00:00",
  "event_duration": 60,
  "event_name": "Signature Massage",
  "event_id": "1",
  "event_price": 150,
  "unit_name": "Whitney",
  "unit_id": "1",
  "client_name": "John Doe",
  "client_email": "john@example.com",
  "client_phone": "+19038106695",
  "paid": false
}
```

### Alternative Lookup Methods

The callback handler tries these in order:
1. `getBookingDetails(bookingId, bookingHash)`
2. `getBooking(bookingId)`
3. `getBookingById(bookingId)`
4. `getBookingByHash(bookingHash)`

Only `getBookingDetails` has been confirmed working.

---

## 9. Booking Cancellation — `cancelBooking`

**URL**: Admin API
**Method**: `cancelBooking`
**Params**: `[bookingId]`
**Token**: Admin token

### Notes

- Method exists and is callable
- Also tried: `setBookingStatus(bookingId, "cancelled")` as fallback
- Cancellation should update the booking status in SimplyBook's admin panel
- Our system also updates the local `SpaBooking` entity status to "cancelled"

---

## 10. Webhook / Callback

**Function**: `simplybookCallback.ts`

### Callback Payload

SimplyBook sends webhook notifications with:

```json
{
  "booking_id": "12345",
  "booking_hash": "abc123",
  "notification_type": "create|change|cancel",
  "company": "company_login"
}
```

### Notification Types

| Type | Trigger |
|------|---------|
| `create` | New booking created |
| `change` | Booking modified (time, provider, etc.) |
| `cancel` | Booking cancelled |

### Processing

Our callback handler:
1. Validates the company login matches
2. Fetches full booking details from SimplyBook
3. Upserts to `SpaBooking` entity (create or update)
4. Returns `{ received: true }` (always 200, even on internal errors)

---

## 11. Methods That Were Explored

### Confirmed Working

| Method | API | Purpose |
|--------|-----|---------|
| `getToken` | Login | Public auth token |
| `getUserToken` | Login | Admin auth token |
| `getEventList` | Public | List all services |
| `getUnitList` | Public | List all providers |
| `getStartTimeMatrix` | Public | Time slot availability |
| `addClient` | Admin | Create/find client |
| `book` | Admin | Create booking |
| `getBookingDetails` | Admin | Lookup booking |
| `cancelBooking` | Admin | Cancel booking |

### Not Found / Not Verified

These methods were attempted but could not be confirmed:
- `getServiceCategories` — no categories in use
- `getServiceList` — use `getEventList` instead
- `getProviderList` — use `getUnitList` instead
- `getBookingList` / `getUpcomingBookings` — not available via JSON-RPC
- `getCompanyInfo` — not tested
- `getWorkSchedule` / `getCompanySchedule` — not tested
- `findClient` / `getClientByEmail` — not available
- `rescheduleBooking` — not tested (would require cancel + rebook)

---

## 12. Key Implementation Notes

### Token Strategy
- Public token for all reads (fast, no admin credentials needed)
- Admin token for all writes (addClient, book, cancel)
- Tokens fetched fresh per function invocation — no cross-request caching needed

### Response Shape Inconsistency
SimplyBook returns data in different shapes depending on the method:
- `getEventList` and `getUnitList` return **objects** keyed by ID (not arrays)
- `getStartTimeMatrix` returns dates as keys with arrays or objects as values
- `book` returns either `{ bookings: [...] }` or a flat object
- Always write defensive parsing code

### Rate Limits
No rate limits have been observed or documented. Our caching strategy (2-5 min TTL) keeps request volume reasonable.

### Error Handling
- Auth failures: Invalid token → HTTP 401 or RPC error
- Method not found: RPC error with code -32601
- Business logic errors: RPC error with descriptive message
- Always catch and provide user-friendly error messages
