/** Starter guides (placeholder copy — owner to review/replace; admin editor arrives in P19). */
export type Guide = { slug: string; title: string; summary: string; body: string[] };

export const GUIDES: Guide[] = [
  {
    slug: "booking-a-shortlet-in-lagos",
    title: "Booking a shortlet in Lagos: what to check",
    summary: "Power, water, security and the area — the four things that make or break a Lagos stay.",
    body: [
      "Check the power setup first. Look for 24-hour power, a generator, inverter or solar on the stay page under Power, water and security.",
      "Ask about water. Borehole or treated water matters for longer stays.",
      "Security: gated estates, guards and CCTV are listed when the host has told us.",
      "Pick the area for your trip — Lekki and Victoria Island for business and nightlife, Ikeja for the airport.",
      "Pay only through Stay. Your money is held until you check in, and you get the exact address once payment is confirmed.",
    ],
  },
  {
    slug: "how-stay-protects-your-payment",
    title: "How Stay protects your payment",
    summary: "Your money is held safely and released to the host only after you check in.",
    body: [
      "When you pay, the money is held by Stay — not sent straight to the host.",
      "The host is paid after your check-in. If something is wrong, report a problem from your trip and our team steps in.",
      "Local stays: full refund 48 hours or more before check-in, 50% within 48 hours, none after check-in.",
    ],
  },
  {
    slug: "abuja-areas-for-short-stays",
    title: "Abuja areas for short stays",
    summary: "Maitama, Wuse, Garki and Gwarinpa compared for visitors.",
    body: [
      "Maitama and Asokoro are quiet, premium and close to embassies.",
      "Wuse 2 has restaurants and is central for meetings.",
      "Gwarinpa and Jabi offer more space for the money, good for families and longer stays.",
    ],
  },
];
