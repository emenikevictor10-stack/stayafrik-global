# Bring Aria, the stay assistant, up to date

## What I found
Aria opens and replies, but it is out of date and misses stays:
- **Wrong story about the business.** It still describes Stay as a place to buy homes, land and offices, with title checks at the Land Registry and escrow released after handing over title documents. None of that matches StayGlobal today.
- **Misses stays that exist.** When asked for "2 bedroom shortlet in Lekki under 100k a night", it said there were none. There is one at ₦70,000 on the Lekki-Epe expressway, but it only looked at stays whose city is exactly "Lekki".
- **Never sees partner (RayProp) stays.** It only searches your own stays, so most of the catalogue (about 1,350 stays) is invisible to it.
- **No links or dates.** It can't send the guest to a stay page, and it doesn't know about availability, the 8% service fee or the cancellation rules.
- **No protection against abuse.** Anyone can call it without limits, which can burn AI credits.

## What I'll change
1. **New introduction for Aria:** StayGlobal, shortlet stays in Nigeria, the 8% service fee, payment held safely until check-in, refunds (full refund 48 hours or more before check-in, 50% within 48 hours, none after check-in), split payments, add-ons, and support at support@stayglobal.app. Values are read from Admin Settings, not typed in.
2. **Better search:** use the same place list as the search bar (state, city, neighbourhood and other names for the same place), so "Lekki" also finds Ikate, Chevron and stays along Lekki-Epe expressway. Include RayProp stays too. Search by budget, bedrooms, guests and dates, and leave out stays already booked for those dates.
3. **Stay cards in the chat:** each suggestion shows the photo, name, area, nightly price and a button that opens the stay page.
4. **Stay details and price for dates:** Aria can tell the guest the full price for chosen dates, using the same price calculation as checkout.
5. **Help with your own trip:** a signed-in guest can ask about their upcoming bookings. Aria never shows anyone else's bookings and never shows exact addresses before payment.
6. **Limits:** up to 30 messages per hour for each person or device, with a friendly message when they hit the limit.
7. **Check:** ask Aria several real questions (Lekki budget, Abuja with dates, a refund question, "my next trip") and check each answer against what the stays list shows.

## Technical details
- Rewrite `supabase/functions/aria-chat`: system prompt built from `_shared/settings.ts`; tools `search_stays` (via the `search_stays`/`search_locations` database functions plus the `rayprop-api` saved catalogue), `get_stay`, `quote_stay` (`quoteLocalStay`, RayProp quote), `my_trips` (only with a verified signed-in user). Uses `@lovable.dev/ai-gateway`.
- Rate limit using the existing repeat-action limit helper. Validate input with zod. Cap message history.
- `AIAssistant.tsx`: draw stay cards from the tool results the function returns, and link them to `/property/:id`.
- Add tests for the place matching and for the rule that guests only see their own trips.
