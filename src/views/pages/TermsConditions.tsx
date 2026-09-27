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

const TermsConditions = () => {
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
            <h1 className="text-xl font-bold leading-none">Terms & Conditions</h1>
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
          <h1 className="mt-3 text-4xl font-extrabold text-foreground md:text-5xl">Terms & Conditions</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            These Terms & Conditions govern your access to and use of the Evercare Med Group website, account, products,
            consultations and related services. By using our website or placing an order, you agree to these terms and
            the policies linked on this website. If you do not agree, please do not use our services.
          </p>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">1. Our Products & Services</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We offer Ayurvedic medicines and wellness products, postpartum-care products and support, and selected
              medical equipment. Availability, permitted sale, delivery method and professional-supervision requirements
              may differ by product and location.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">2. Health & Product Information</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Website content is provided for general information and does not replace diagnosis, treatment or advice
              from a qualified healthcare professional. Product results vary between individuals.
            </p>
            <PolicyList
              items={[
                "Use every medicine, supplement and device only as directed on its label and by an appropriately qualified professional.",
                "Tell your doctor about existing conditions, allergies and other medicines, particularly if you are pregnant, breastfeeding or postpartum.",
                "Prescription-only products are supplied only after a valid prescription and any legally required verification.",
                "Postpartum-care support is complementary wellness support and is not emergency, obstetric, paediatric or mental-health care.",
                "For a medical emergency, contact local emergency services or a qualified medical provider immediately.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">3. Accounts & Customer Responsibilities</h2>
            <PolicyList
              items={[
                "You must provide accurate, complete and current contact, delivery, billing and prescription information.",
                "You are responsible for keeping your login details confidential and for activity carried out through your account.",
                "You must not misuse the website, interfere with its operation, attempt unauthorised access or use our services for an unlawful purpose.",
                "You must inspect product labels and packaging before use and follow storage, maintenance, cleaning and safety instructions.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">4. Orders, Acceptance & Availability</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              An order acknowledgement confirms that we received your request; it does not guarantee acceptance. An
              order is accepted when we confirm dispatch, pickup or service booking. We may contact you for prescription,
              identity, address or availability checks before acceptance.
            </p>
            <PolicyList
              items={[
                "Product images are illustrative; packaging, colour or accessories may vary without changing the product’s essential characteristics.",
                "We may limit quantities or cancel an order affected by stock errors, pricing errors, legal restrictions, suspected fraud or an undeliverable address.",
                "If we cancel a paid order, we will refund the affected amount to the original payment method.",
                "Substitutions are made only with your approval where required.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">5. Prices, Taxes & Payment</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Prices are shown in Indian rupees and include applicable taxes unless stated otherwise. Delivery, handling
              or service charges are shown before payment. Promotions are subject to their stated period, eligibility and
              stock availability. Payment is processed by the methods offered at checkout through authorised providers.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">6. Delivery, Returns & Warranties</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Dispatch estimates and delivery options are governed by our Shipping & Delivery Policy. Cancellations,
              returns, replacements and refunds are governed by our Refund & Return Policy. Manufacturer warranties for
              medical equipment apply according to the warranty card or product listing and do not limit rights available
              under applicable consumer law.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">7. Intellectual Property</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The website’s text, graphics, branding, layout and original content belong to Evercare Med Group or its
              licensors. You may use the website for personal, non-commercial shopping only. Reproduction, resale,
              scraping or distribution without permission is prohibited.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">8. Limitation of Liability</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              To the extent permitted by law, Evercare Med Group is not responsible for indirect or consequential loss,
              or for loss caused by use contrary to instructions, undisclosed health information, improper storage,
              unauthorised repair, normal wear, third-party systems or events outside our reasonable control. Nothing in
              these terms excludes or restricts a right or remedy that cannot lawfully be excluded, including rights under
              applicable consumer-protection law.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">9. Privacy</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We handle personal information in accordance with our Privacy Policy. Where you provide a prescription,
              consultation response or other health-related information, you confirm that the information is accurate and
              that you are authorised to provide it.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">10. Changes, Governing Law & Disputes</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              We may update these terms to reflect changes to our services or applicable law. The version published when
              you place an order applies to that order. These terms are governed by the laws of India. Courts with
              jurisdiction in Bengaluru, Karnataka will have jurisdiction, subject to any forum or remedy available to
              you under applicable consumer law. Please contact us first so we can try to resolve any concern promptly.
            </p>
          </section>

          <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-2xl font-extrabold text-foreground">Contact Evercare Med Group</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Questions about these terms or an order can be sent to:
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

export default TermsConditions;
