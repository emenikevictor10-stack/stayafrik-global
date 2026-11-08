# Reconfirm Phase 5 (Settings and switches)

## Result of the review
Phase 5 is mostly done. Three things are missing or unchecked.

**Built and checked:**
- The Settings page, with every value from the spec and a separate Save for each section.
- Only admins can save; everyone else is refused.
- Every change goes into the audit log (12 entries so far).
- The service fee changes the checkout price (tested at 10%, then reset to 8%).
- The support email is shown on Help.

**Gaps:**
1. **Maps switch only half works.** It hides the map on the stay page, but not the Explore map.
2. **Switches never flipped in a test.** Report a problem, Home search bar and Maps were connected, but I never turned them off to watch them hide.
3. **Server side never run.** The payment step's fee and the new support reply targets read the settings, but no test has run them.

Items the spec lists that are deliberately out of scope here:
- "Moderators can view but not save": the app has no moderator role yet. That arrives with Team (Phase 19).
- Holds, card payments, ID required and similar switches are stored but take effect in their own phases. This was in the approved plan.

## Steps
1. Hide the Explore map (and the button that opens it) when the Maps switch is off.
2. Browser test: turn off Home search bar, Maps and Report a problem, confirm each disappears, then turn them back on.
3. Call the payment step with a test request to confirm it uses the saved fee. It is stopped before reaching Paystack, so no money moves.
4. Check the reply-target function directly in the database: an urgent problem is due 15 minutes after it's reported.
5. Mark Phase 5 confirmed in the roadmap.
