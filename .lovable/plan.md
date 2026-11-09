# Browse first, sign in only at payment

Goal: like Airbnb, anyone lands straight on stays, browses and builds a booking freely, and is asked to sign in only when they press Pay.

## What changes for guests
1. **No welcome screens.** The three swipe screens shown on first visit are removed for everyone (phone and PC). Nobody is pushed to the sign-in page on arrival.
2. **Home = stays.** `/` and `/home` open the stays list with the search bar on top (the same view as `/results`). Old home extras (popular areas, recently viewed, upcoming trip) move under the search bar as small rows when they have content, so nothing is lost. Hosts signed in as hosts still land on their Hosting home.
3. **Booking without an account.** "Reserve / Book" on a stay opens checkout straight away for everyone: dates, guests, price breakdown and guest details are all filled in signed out.
4. **Sign in at Pay.** Pressing Pay while signed out opens a small sign-in sheet ("Continue with Google") over checkout. After Google returns, the guest comes back to the same checkout with dates, guests and details still filled in, and payment starts. Signed-in guests go straight to payment as today.
5. **PIN only when it matters.** The Login PIN no longer blocks browsing when the app opens; it's asked at Pay (and for Account/Trips) for guests who set one.
6. **Other actions stay as they are:** messaging a host, asking for a viewing, Trips, Account and hosting still ask for sign-in when tapped. Saving a stay (heart) works signed out on the device.
7. New Google sign-ups from checkout skip the "choose your experience" step and go back to checkout as guests; they can become a host later from the menu.

## Checks
- Signed out on phone and PC: open `/`, see stays, search, open a stay, fill checkout, press Pay → sign-in sheet appears; no redirect earlier.
- Return after sign-in restores checkout (dates/guests/details) — checked with a test session.
- Signed in: no splash, no PIN on open, PIN asked at Pay when set; Paystack opens.
- Trips/Account still require sign-in; tests and `check:ui` pass.

## Technical notes
- Remove `SplashGate`/`SplashSequence` from `App.tsx` (keep file unused or delete).
- `Index` renders `Explore` for guests (Home extras folded in as optional rows); `/property/:id/book` moves to the public route group.
- `PropertyDetail.handleBook` navigates directly; `BookProperty` keeps the draft (dates, guests, name, email, phone) in the URL + sessionStorage, and on Pay without a session opens a `SignInSheet` that calls Google sign-in with `redirect_uri = window.location.origin + "/auth/callback"`, storing `next=/property/:id/book?...`; after session hydrates, navigate back and auto-resume.
- `PinGate` moved off the public shell to wrap the protected group and the Pay action; `Auth.tsx` honours `next` and skips role choice when coming from checkout.
- Server side unchanged: `paystack-init` still requires a signed-in user, so no unauthenticated payments.
- Update `AGENTS.md` with the "auth only at payment/protected actions" rule.
