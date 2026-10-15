import { Seo } from "@/components/seo/Seo";
import { Link } from "react-router-dom";
import { ChevronLeft, Mail, Phone, MapPin } from "lucide-react";

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <p>
        StayGlobal ("we", "us", or "our") operates the StayGlobal platform (the "Platform") at stayglobal.app. 
        This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our services. 
        By using the Platform, you consent to the practices described in this policy.
      </p>
    ),
  },
  {
    id: "data-collected",
    title: "2. Information We Collect",
    content: (
      <ul className="space-y-3 list-disc pl-5">
        <li>
          <strong className="text-foreground">Personal Identification:</strong> Full name, email address, phone number, and government-issued ID (for verification purposes).
        </li>
        <li>
          <strong className="text-foreground">Location Data:</strong> Property addresses, GPS coordinates for property listings, and approximate location for search relevance.
        </li>
        <li>
          <strong className="text-foreground">Payment Information:</strong> Bank account details, card information (processed securely via Paystack), and transaction history.
        </li>
        <li>
          <strong className="text-foreground">Photos & Media:</strong> Property images, profile photos, and verification documents uploaded by hosts or guests.
        </li>
        <li>
          <strong className="text-foreground">Usage Data:</strong> Pages visited, search queries, booking history, device type, browser, and IP address.
        </li>
        <li>
          <strong className="text-foreground">Communication Data:</strong> Messages exchanged between guests and hosts through our in-app messaging system.
        </li>
      </ul>
    ),
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Data",
    content: (
      <ul className="space-y-3 list-disc pl-5">
        <li>To facilitate bookings, reservations, and property listings on the Platform.</li>
        <li>To verify identities and maintain trust through our verification program.</li>
        <li>To process payments, hold escrow funds, and manage refunds securely.</li>
        <li>To communicate booking confirmations, updates, and support responses.</li>
        <li>To improve search relevance, personalise recommendations, and enhance user experience.</li>
        <li>To detect and prevent fraud, abuse, or illegal activities on the Platform.</li>
        <li>To comply with legal obligations, including tax and regulatory requirements in Nigeria.</li>
      </ul>
    ),
  },
  {
    id: "third-party",
    title: "4. Third-Party Services",
    content: (
      <div className="space-y-4">
        <p>We integrate with the following third-party services to operate the Platform:</p>
        <div className="grid gap-3">
          <div className="rounded-2xl bg-card border border-border p-4">
            <h4 className="font-bold text-sm text-foreground mb-1">Supabase</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our backend database and authentication provider. User accounts, profiles, and listing data are stored on Supabase infrastructure. 
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">View Supabase Privacy Policy</a>.
            </p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <h4 className="font-bold text-sm text-foreground mb-1">Paystack</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our payment processing partner. Card and bank details are processed directly by Paystack; we do not store raw card numbers on our servers. 
              <a href="https://paystack.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">View Paystack Privacy Policy</a>.
            </p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <h4 className="font-bold text-sm text-foreground mb-1">Google Maps</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use Google Maps for property location display and geocoding. Your approximate location may be shared with Google to render maps. 
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">View Google Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "user-rights",
    title: "5. Your Rights & Data Deletion",
    content: (
      <div className="space-y-4">
        <p>Under the Nigeria Data Protection Regulation (NDPR) and applicable laws, you have the following rights:</p>
        <ul className="space-y-3 list-disc pl-5">
          <li><strong className="text-foreground">Access:</strong> Request a copy of all personal data we hold about you.</li>
          <li><strong className="text-foreground">Correction:</strong> Update or correct inaccurate information via Profile settings.</li>
          <li><strong className="text-foreground">Deletion:</strong> Request account deletion. Upon confirmation, we will erase your personal data within 30 days, except where retention is required by law.</li>
          <li><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format.</li>
          <li><strong className="text-foreground">Objection:</strong> Opt out of non-essential communications and data processing.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          To exercise any of these rights, contact us using the details in Section 8 below.
        </p>
      </div>
    ),
  },
  {
    id: "cookies",
    title: "6. Cookie Policy",
    content: (
      <div className="space-y-4">
        <p>StayGlobal uses cookies and similar technologies to enhance your browsing experience:</p>
        <ul className="space-y-3 list-disc pl-5">
          <li><strong className="text-foreground">Essential cookies:</strong> Required for authentication, security, and core Platform functionality.</li>
          <li><strong className="text-foreground">Analytics cookies:</strong> Help us understand how visitors interact with the Platform so we can improve it.</li>
          <li><strong className="text-foreground">Preference cookies:</strong> Remember your settings such as language and currency preferences.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          You can manage or disable cookies through your browser settings. Note that disabling essential cookies may prevent you from using certain features of the Platform.
        </p>
      </div>
    ),
  },
  {
    id: "security",
    title: "7. Data Security",
    content: (
      <p>
        We implement industry-standard security measures including encryption in transit (TLS/SSL), 
        encrypted storage, Row-Level Security (RLS) on our database, and regular security audits. 
        Payments are protected by PropertyEscrow™, which holds funds until both parties confirm a successful transaction. 
        Despite our efforts, no internet transmission is completely secure, and we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    id: "contact",
    title: "8. Contact Us",
    content: (
      <div className="space-y-4">
        <p>If you have questions about this Privacy Policy or how we handle your data, please reach out:</p>
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

const PrivacyPolicy = () => {
  return (
    <>
      <Seo
        title="Privacy Policy — StayGlobal"
        description="StayGlobal Privacy Policy. Learn how we collect, use, and protect your personal data on Africa's verified property platform."
        noindex
      />
      <main className="min-h-screen bg-background text-foreground">
        <div className="max-w-md md:max-w-2xl mx-auto px-5 pt-6 pb-28">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight">Privacy Policy</h1>
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
                <h2 className="text-lg font-extrabold mb-3">{s.title}</h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  {s.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              StayGlobal operates in compliance with the Nigeria Data Protection Regulation (NDPR). 
              We may update this Privacy Policy from time to time. Continued use of the Platform constitutes acceptance of the revised policy.
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default PrivacyPolicy;
