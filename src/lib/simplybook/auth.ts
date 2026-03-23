/**
 * SimplyBook Auth — Token Management
 *
 * All SimplyBook API calls go through our backend edge functions.
 * Token management is handled server-side — this module documents the auth flow.
 *
 * Two authentication methods:
 *
 * 1. Public Token (getToken)
 *    - Uses: SIMPLYBOOK_COMPANY_LOGIN + SIMPLYBOOK_API_KEY
 *    - Grants: Read access (getEventList, getUnitList, getStartTimeMatrix)
 *    - Used by: guestGetServices, guestGetAvailability, guestGetMultiDayAvailability
 *
 * 2. Admin Token (getUserToken)
 *    - Uses: SIMPLYBOOK_COMPANY_LOGIN + SIMPLYBOOK_USER_LOGIN + SIMPLYBOOK_USER_PASSWORD + SIMPLYBOOK_SECRET_KEY
 *    - Grants: Full access (addClient, book, cancelBooking)
 *    - Used by: guestCreateBooking, guestCancelBooking, intakeBookTreatments
 *
 * Token lifetime: Tokens expire after ~30 minutes (not officially documented).
 * Our edge functions request a fresh token per invocation — no caching needed
 * since edge function cold starts are infrequent and token fetch is fast (~200ms).
 *
 * Headers after auth:
 *   X-Company-Login: {company}
 *   X-Token: {token}
 *   X-User-Token: {token}   (admin operations)
 *
 * Base URLs:
 *   Auth:    https://user-api.simplybook.me/login
 *   Public:  https://user-api.simplybook.me
 *   Admin:   https://user-api.simplybook.me/admin/
 */

// This file is documentation-only. Auth is handled by edge functions.
// Frontend code never touches SimplyBook tokens directly.
export {};
