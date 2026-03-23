/**
 * SimplyBook Client Management
 *
 * Client creation is handled automatically by the booking flow:
 * - guestCreateBooking calls addClient() internally before booking
 * - intakeBookTreatments also calls addClient() per treatment
 *
 * SimplyBook's addClient behavior:
 * - Creates a new client record with { name, email, phone }
 * - Returns the client ID (number)
 * - If a client with the same email already exists, SimplyBook returns the existing client ID
 *   (it does NOT create duplicates — email is the unique key)
 * - The second parameter `false` means "don't send notification to client"
 *
 * Client fields supported:
 * - name (string, required)
 * - email (string, optional but recommended for dedup)
 * - phone (string, optional — no specific format enforced by API, but E.164 recommended)
 *
 * There is no public-facing findClient or getClientByEmail method exposed.
 * The addClient method handles dedup automatically.
 *
 * Phone number notes:
 * - SimplyBook accepts any string for phone
 * - For consistency, we normalize to digits-only or E.164 format
 * - US numbers: (903) 810-6695 → +19038106695
 */

// Client management is handled server-side within the booking edge functions.
// This file documents the behavior for reference.
export {};
