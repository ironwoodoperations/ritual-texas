# SimplyBook Booking Issues — Bug Report

## Scott Devore's Booking Error

The error message "Could not create client for 'Reiki Forgiveness Bowl': SimplyBook RPC error for 'addClient': {'code':-32066,'message':'Client with this email already exist'}" indicates a clear problem. When the system attempted to book the "Reiki Forgiveness Bowl" for Scott, it also tried to create a new client record for him in SimplyBook. However, a client with Scott's email address already exists in SimplyBook, and the SimplyBook API prevents the creation of duplicate clients. This is the cause of the error.

**Root Cause:** The `intakeBookTreatments` function requires an update. It should first verify if a client with the provided email already exists in SimplyBook. If an existing client is found, the function should use that client's ID instead of attempting to create a new one. A new client record should only be created if no existing client is found.

---

## Kelley Butler's Booking Issue (Shirodhara not booked)

From the screenshots, Kelley Butler's record lists four treatments: "The Royal Treatment Facial", "Shirodhara", and two "Swedish Massage (call-to-book)".

The "Swedish Massage" treatments are designated as "call-to-book" and will not be processed through the SimplyBook integration. They require manual scheduling. That part is working as intended.

The SimplyBook calendar only displays one booking for Kelley, which suggests that "The Royal Treatment Facial" was successfully booked, but the "Shirodhara" treatment was not.

**Root Cause:** It is highly probable that the "Shirodhara" booking failed for the same reason as Scott Devore's: the system attempted to create a duplicate client record for Kelley Butler in SimplyBook, but one already existed.

---

## Summary and Fix Required

The fundamental issue for both cases lies within the client creation logic of the `intakeBookTreatments` function. It consistently tries to create a new client, which results in failure if a client with that email already exists in SimplyBook.

**The fix:** Before calling `addClient`, the function should call SimplyBook's `getClientList` or equivalent endpoint to search by email. If a match is found, use that existing client ID. Only create a new client if no match exists.
