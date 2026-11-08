# Finish Phase 4 (Admin console layout)

Already done: grouped sidebar that collapses to an icon rail, queue counts, the phone ☰ menu, and next-step boxes on Listings, Viewings and Support.

## What's left
1. **Next-step box on the remaining detail views.** Each shows the status as a dot plus words, one plain sentence, and the one button that does the job, tinted only when staff must act.
   - **Payouts:** "Payout of ₦92,000 to Ada is due. Send it, then mark it paid." → Mark paid. Failed → "Check the bank details and try again."
   - **ID review:** "Ada sent an ID today. Check it matches their name." → Approve ID.
   - **Bookings:**
     - Paid and in escrow → "The money is held. It goes to the host after check-out."
     - Needs attention → "Something went wrong after payment. Check it now."
     - Cancelled or refunded → the outcome only, no button.
   - **Partner bookings:**
     - Needs attention → "Ada paid, but RayProp didn't confirm. Retry or refund." → Retry
     - Confirmed → "RayProp confirmed this stay."
   - **User detail:**
     - ID waiting → Review ID
     - Profile incomplete → "This person hasn't finished their profile."
     - Blocked → why they were blocked
     - Otherwise → "Nothing to do."
2. **Underlined tabs** replace the round filter buttons on Bookings, Partner bookings, Payouts, ID review and Listings (Pending / Approved), the same as Support.
3. **"Try again"** when admin Listings or Support fails to load.
4. **Check** at 390px and 1280px, signed in as admin, that every detail view shows its next step and tabs switch correctly. Then run the tests and check:ui, and mark Phase 4 done in the roadmap.

## Technical notes
- New pure helpers in `src/lib/next-step.ts` (`bookingNextStep`, `partnerNextStep`, `userNextStep`), plus tests asserting the button choice per status. The existing `payoutNextStep` and `kycNextStep` are wired in.
- Buttons call the same actions the rows already use, so nothing new happens on the backend.
- Tabs use the existing `Tabs` (UnderlineTabs) from `src/ui/kit.tsx`.
