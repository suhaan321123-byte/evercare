import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const LAST_UPDATED = "27 September 2026";

const PolicyList = ({ items }: { items: string[] }) => (
  <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
    {items.map((item) => (
      <li key={item} className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const PrivacyPolicy = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link to="/" aria-label="Back to home">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold leading-none">Privacy Policy</h1>
          </div>
        </header>
      ) : (
        <>
          <Header />
          <MegaMenu />
        </>
      )}

      <main className="site-container py-10 md:py-14">
        <article className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Evercare Med Group</p>
          <h1 className="mt-3 text-4xl font-extrabold text-foreground md:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            This Privacy Policy explains how Evercare Med Group collects, uses, shares, stores and protects personal data
            when you browse our website, create an account, buy products, request postpartum-care support, submit a
            prescription or contact us. We process personal data for lawful purposes and in accordance with applicable
            Indian data-protection law.
          </p>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">1. Personal Data We Collect</h2>
            <PolicyList
              items={[
                "Identity and contact details, such as your name, phone number, email address and account information.",
                "Billing, delivery and transaction details, including address, purchased items, invoice, payment status and refund history.",
                "Health-related information you choose to provide, such as prescriptions, allergies, consultation responses, pregnancy or postpartum details and product-support requests.",
                "Device and usage information, such as IP address, browser type, pages viewed, approximate location, cookie identifiers and diagnostic logs.",
                "Communications with us by website form, phone, email, SMS or WhatsApp, including attachments you send.",
                "Fraud-prevention, consent and preference records required to operate and protect our services.",
              ]}
            />
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Please provide only health information that is relevant to your request. If you provide another person’s
              data, you must be authorised to do so.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">2. How We Collect Data</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We collect data directly from you when you register, order, upload a prescription, complete a care form or
              contact us; automatically through cookies and website logs; and from service providers involved in payment,
              delivery, authentication, analytics or customer support.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">3. Why We Use Personal Data</h2>
            <PolicyList
              items={[
                "Create and manage your account, cart, orders, payments, deliveries, returns and refunds.",
                "Verify prescriptions or product eligibility and respond to consultation or postpartum-support requests.",
                "Provide service messages, delivery updates, safety notices and customer support.",
                "Prevent fraud, secure the website, troubleshoot errors and enforce our terms.",
                "Meet accounting, tax, record-keeping, consumer-protection and other legal obligations.",
                "Improve our catalogue, website and customer experience using aggregated or appropriately protected analytics.",
                "Send promotional messages where you have consented or where otherwise permitted; you can opt out at any time.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">4. Health Information</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Prescriptions and consultation or postpartum-care responses may reveal sensitive details. Access is limited
              to personnel and providers who need the information to review your request, supply permitted products,
              support your care enquiry or meet legal obligations. We do not use health information for unrelated
              advertising.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">5. When We Share Data</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We do not sell or rent personal data. We share only what is reasonably necessary with:
            </p>
            <PolicyList
              items={[
                "Payment providers, banks and fraud-prevention partners that process or verify transactions.",
                "Delivery, logistics, installation and service partners that fulfil your order.",
                "Healthcare professionals, pharmacies or authorised suppliers involved in a requested review or regulated product supply.",
                "Cloud hosting, communications, analytics and customer-support providers acting for us under appropriate safeguards.",
                "Government, regulatory, law-enforcement or professional advisers where disclosure is required or permitted by law.",
                "A successor organisation in connection with a merger, restructuring or transfer of the business, subject to applicable safeguards.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">6. Payments</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Payments are handled by the payment method and authorised provider shown at checkout. We receive payment
              status and transaction references but do not intentionally store complete card, UPI PIN or online-banking
              credentials. The payment provider processes those details under its own privacy and security terms.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">7. Cookies & Similar Technologies</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We use essential cookies for login, cart and security functions, and may use preference or analytics cookies
              to understand website performance. You can control non-essential cookies through available website controls
              or your browser. Blocking essential cookies may prevent parts of checkout or account services from working.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">8. Retention, Security & International Processing</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We retain personal data only as long as needed for the purposes described above, including legal,
              prescription, tax, warranty, dispute and fraud-prevention records. We use reasonable administrative,
              technical and organisational safeguards, but no online system is completely secure. Some providers may
              process data outside your state or country; where this occurs, we require appropriate contractual and legal
              safeguards.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">9. Your Choices & Rights</h2>
            <PolicyList
              items={[
                "Ask for information about the personal data we process about you.",
                "Request correction, completion or updating of inaccurate personal data.",
                "Request erasure of personal data that is no longer required, subject to legal retention duties.",
                "Withdraw consent for future processing where consent is the basis, without affecting earlier lawful processing.",
                "Opt out of promotional communications using the message instructions or by contacting us.",
                "Raise a grievance and, where applicable, nominate another person to exercise your rights.",
              ]}
            />
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              We may need to verify your identity before completing a request. Certain data may be retained where required
              for legal compliance, safety, fraud prevention or the establishment and defence of claims.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">10. Children’s Data</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Our online purchasing services are intended for adults. A parent or lawful guardian must place orders and
              provide any data relating to a child. We do not knowingly use children’s personal data for targeted
              advertising or behavioural monitoring.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">11. Policy Updates</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We may update this policy when our practices, services or legal obligations change. The current version and
              update date will be published on this page. We will provide additional notice where a material change
              requires it.
            </p>
          </section>

          <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-2xl font-extrabold text-foreground">Privacy & Grievance Contact</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Contact us to exercise a privacy right, withdraw consent or raise a grievance. Please use “Privacy Request”
              in the subject line and describe your request clearly.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>Email: evercaremedmedgroup@gmail.com</p>
              <p>Phone / WhatsApp: +91 89519 82743</p>
              <p>
                Address: Suite 1B, BusinezzBay, 4th Floor, Gamma Block, Sigma Soft Tech Park, Varthur Kodi,
                Whitefield Main Road, Bengaluru 560066, Karnataka, India
              </p>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
