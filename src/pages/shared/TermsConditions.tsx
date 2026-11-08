import { Seo } from "@/components/seo/Seo";
import { Link } from "react-router-dom";
import { ChevronLeft, Mail, Phone, MapPin } from "lucide-react";

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <p>
        These Terms and Conditions ("Terms") govern your access to and use of the StayGlobal platform (the "Platform") at stayglobal.app,
        operated by StayGlobal ("we", "us", or "our"). By registering, browsing, booking, or listing a property on the Platform,
        you agree to be bound by these Terms. If you do not agree, you must not use the Platform.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "2. User Eligibility",
    content: (
      <div className="space-y-3">
        <p>To use StayGlobal, you must:</p>
        <ul className="space-y-3 list-disc pl-5">
          <li>Be at least 18 years of age or the age of majority in your jurisdiction.</li>
          <li>Have the legal capacity to enter into binding contracts.</li>
          <li>Provide accurate, complete, and truthful information during registration and KYC verification.</li>
          <li>Not be barred from using the Platform under applicable Nigerian or international law.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          We reserve the right to suspend or terminate accounts that provide false information or are found to be operated by minors.
        </p>
      </div>
    ),
  },
  {
    id: "host-responsibilities",
    title: "3. Host Responsibilities",
    content: (
      <div className="space-y-3">
        <p>As a host listing a property on StayGlobal, you agree to:</p>
        <ul className="space-y-3 list-disc pl-5">
          <li>Ensure all listing details — including photos, descriptions, amenities, and pricing — are accurate and up to date.</li>
          <li>Maintain the property in a safe, clean, and habitable condition that matches the listing.</li>
          <li>Honor confirmed bookings and be available for guest check-in as agreed.</li>
          <li>Comply with all applicable local laws, including zoning, tax, and short-term rental regulations in Nigeria.</li>
          <li>Disclose any known hazards, ongoing construction, or recurring issues that may affect a guest's stay.</li>
          <li>Hold adequate insurance coverage for the property and guest liability.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Hosts who repeatedly receive negative reviews, complaints, or policy violations may have their listings removed and accounts suspended.
        </p>
      </div>
    ),
  },
  {
    id: "guest-responsibilities",
    title: "4. Guest Responsibilities",
    content: (
      <div className="space-y-3">
        <p>As a guest booking a stay on StayGlobal, you agree to:</p>
        <ul className="space-y-3 list-disc pl-5">
          <li>Provide accurate personal information and a valid payment method.</li>
          <li>Use the property solely for the purpose stated in the booking and respect all house rules set by the host.</li>
          <li>Treat the property, its contents, and neighbors with care and respect.</li>
          <li>Report any damage, malfunction, or safety issue to the host and StayGlobal support promptly.</li>
          <li>Not engage in illegal activity, unauthorised subletting, or excessive noise that disturbs neighbors.</li>
          <li>Vacate the property by the agreed checkout time unless an extension has been confirmed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "booking-cancellation",
    title: "5. Booking & Cancellation Policy",
    content: (
      <div className="space-y-3">
        <p><strong className="text-foreground">Confirmations:</strong> A booking is only confirmed once payment is successfully processed through our payment partner and both parties receive a confirmation notice.</p>
        <p><strong className="text-foreground">Cancellations by Guests:</strong></p>
        <ul className="space-y-3 list-disc pl-5">
          <li>Full refund if cancelled within 24 hours of booking and at least 48 hours before check-in.</li>
          <li>50% refund if cancelled more than 48 hours before check-in.</li>
          <li>No refund for cancellations within 48 hours of check-in, except in cases of Force Majeure or extenuating circumstances reviewed by StayGlobal support.</li>
        </ul>
        <p><strong className="text-foreground">Cancellations by Hosts:</strong> Hosts must not cancel confirmed bookings except in emergencies. Repeated host cancellations will result in penalties, including listing delisting and account review.</p>
        <p><strong className="text-foreground">No-Shows:</strong> If a guest does not arrive within 24 hours of the scheduled check-in without notice, the booking may be cancelled with no refund at the host's discretion, subject to StayGlobal review.</p>
      </div>
    ),
  },
  {
    id: "payment-terms",
    title: "6. Payment Terms",
    content: (
      <div className="space-y-3">
        <p>All payments on StayGlobal are processed securely through <strong className="text-foreground">Paystack</strong>, our authorised payment processor.</p>
        <ul className="space-y-3 list-disc pl-5">
          <li>Guests are charged the full booking amount (including any service fees and applicable taxes) at the time of confirmation.</li>
          <li>Funds are held in escrow via PropertyEscrow™ and released to the host 24 hours after successful check-in, or earlier upon mutual agreement.</li>
          <li>Refunds are processed to the original payment method and may take 5–10 business days to reflect, depending on the issuing bank.</li>
          <li>StayGlobal service fees are non-refundable except where the Platform itself cancels a booking.</li>
          <li>Hosts are responsible for declaring and remitting all applicable taxes on income earned through the Platform.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Paystack's terms of service and privacy policy apply to all payment transactions. StayGlobal does not store raw card numbers on its servers.
        </p>
      </div>
    ),
  },
  {
    id: "prohibited-content",
    title: "7. Prohibited Content & Conduct",
    content: (
      <div className="space-y-3">
        <p>The following are strictly prohibited on the Platform:</p>
        <ul className="space-y-3 list-disc pl-5">
          <li>Listings for properties that are illegal, unsafe, or non-existent (fraudulent listings).</li>
          <li>Discriminatory language or practices based on race, ethnicity, religion, gender, disability, or nationality.</li>
          <li>Uploading false, misleading, or photoshopped property images.</li>
          <li>Attempting to transact outside the Platform to avoid service fees (fee avoidance).</li>
          <li>Harassment, threats, or abusive behaviour toward other users or StayGlobal staff.</li>
          <li>Using the Platform for illegal activities including money laundering, fraud, or drug-related conduct.</li>
          <li>Distributing malware, spam, or unauthorised promotional content.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Violations may result in immediate account suspension, listing removal, forfeiture of escrow funds, and referral to law enforcement where appropriate.
        </p>
      </div>
    ),
  },
  {
    id: "liability",
    title: "8. Limitation of Liability",
    content: (
      <div className="space-y-3">
        <p>StayGlobal acts as a marketplace connecting hosts and guests. To the fullest extent permitted by Nigerian law:</p>
        <ul className="space-y-3 list-disc pl-5">
          <li>We do not own, control, or manage any listed properties and are not liable for the condition, safety, or legality of any accommodation.</li>
          <li>We are not liable for personal injury, loss of property, theft, or damage occurring during a stay, except where directly caused by our gross negligence or wilful misconduct.</li>
          <li>Our total liability for any claim arising from your use of the Platform shall not exceed the total amount paid by you for the specific booking giving rise to the claim.</li>
          <li>We are not responsible for delays or failures caused by events beyond our reasonable control, including but not limited to power outages, internet failures, strikes, or Force Majeure.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Guests are strongly encouraged to obtain travel and personal property insurance for added protection.
        </p>
      </div>
    ),
  },
  {
    id: "dispute-resolution",
    title: "9. Dispute Resolution",
    content: (
      <div className="space-y-3">
        <p><strong className="text-foreground">Internal Resolution:</strong> In the event of a dispute between a guest and host, both parties agree to first attempt resolution through StayGlobal's in-app messaging and support mediation. Most disputes are resolved within 7 business days.</p>
        <p><strong className="text-foreground">Escalation:</strong> If internal mediation fails, either party may escalate the matter to binding arbitration under the Arbitration and Conciliation Act, Cap A18, Laws of the Federation of Nigeria 2004.</p>
        <p><strong className="text-foreground">Class Action Waiver:</strong> You agree to resolve disputes on an individual basis and waive any right to participate in class or representative proceedings.</p>
        <p className="text-sm text-muted-foreground">
          For emergency disputes involving fraud, safety, or escrow issues, contact our escalation team immediately via the Help & Support page.
        </p>
      </div>
    ),
  },
  {
    id: "governing-law",
    title: "10. Governing Law",
    content: (
      <div className="space-y-3">
        <p>These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.</p>
        <p>Any legal action or proceeding arising out of or relating to these Terms shall be brought exclusively in the courts of Lagos State, Nigeria, and you consent to the jurisdiction of such courts.</p>
        <p className="text-sm text-muted-foreground">
          If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
        </p>
      </div>
    ),
  },
  {
    id: "contact",
    title: "11. Contact Us",
    content: (
      <div className="space-y-4">
        <p>If you have questions about these Terms, please reach out:</p>
        <div className="grid gap-3">
          <a
            href="mailto:support@stayglobal.app"
            className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold">Email</div>
              <div className="text-xs text-muted-foreground">support@stayglobal.app</div>
            </div>
          </a>
          <a
            href="tel:+234800STAYGLOBAL"
            className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:border-primary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold">Phone</div>
              <div className="text-xs text-muted-foreground">+234 800 782 9465</div>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4">
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold">Address</div>
              <div className="text-xs text-muted-foreground">Lagos, Nigeria · Accra, Ghana · Nairobi, Kenya</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

const TermsConditions = () => {
  return (
    <>
      <Seo
        title="Terms & Conditions — StayGlobal"
        description="StayGlobal Terms and Conditions. Read our user agreement, booking policy, and liability provisions for hosts and guests."
        noindex
      />
      <main className="min-h-screen bg-background text-foreground">
        <div className="max-w-md md:max-w-2xl mx-auto px-5 pt-6 pb-28">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/account"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight">Terms & Conditions</h1>
            <p className="text-sm text-muted-foreground mt-1">Last updated: 23 May 2026</p>
          </div>

          {/* Table of contents */}
          <nav className="rounded-2xl bg-card border border-border p-4 mb-6">
            <h2 className="text-sm font-bold mb-3">Contents</h2>
            <ul className="space-y-1.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-base font-extrabold mb-3">{s.title}</h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              StayGlobal reserves the right to modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms.
              For questions, contact support@stayglobal.app.
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default TermsConditions;
