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

const ShippingDeliveryPolicy = () => {
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
            <h1 className="text-xl font-bold leading-none">Shipping & Delivery Policy</h1>
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
          <h1 className="mt-3 text-4xl font-extrabold text-foreground md:text-5xl">Shipping & Delivery Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            We carefully dispatch Ayurvedic medicines, postpartum-care products and medical equipment to serviceable
            locations in India. The options, charges and estimated timeline shown at checkout are based on the products
            in your cart, your delivery postcode and available delivery partners.
          </p>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">1. Serviceability</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Delivery is available only to postcodes accepted at checkout. Some medicines, liquids, temperature-sensitive
              goods, oversized equipment and installation-based products may have a smaller delivery area. If we cannot
              service your address after an order is placed, we will contact you and refund the affected item or order.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">2. Order Processing</h2>
            <PolicyList
              items={[
                "Processing begins after payment confirmation and completion of any required prescription or order verification.",
                "In-stock items are normally prepared on business days; weekends and public holidays may extend processing.",
                "Orders containing products from different dispatch points may arrive in separate shipments.",
                "We may contact you if an item needs special handling, installation scheduling or professional verification.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">3. Delivery Estimates</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The estimated delivery date shown at checkout or in your order update is an estimate, not a guaranteed
              appointment. Timing may change because of postcode coverage, stock location, prescription review, weather,
              public holidays, transport disruption or other events outside our reasonable control. We will share
              tracking details when the delivery partner makes them available.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">4. Shipping Charges</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The applicable delivery charge is displayed before you confirm payment. Charges may vary by postcode,
              order value, weight, dimensions, handling requirements and delivery speed. Any free-delivery promotion
              applies only when the eligibility conditions displayed at checkout are met.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">5. Category-Specific Delivery</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Ayurvedic medicines",
                  body: "Products are packed to protect seals and labels. Prescription or restricted items are dispatched only after required verification.",
                },
                {
                  title: "Postpartum care",
                  body: "Oils, foods and personal-care products are packed to reduce leakage and contamination. Check seals before first use.",
                },
                {
                  title: "Medical equipment",
                  body: "Bulky or fragile equipment may require specialised delivery, an appointment or separate installation. Details are shared before dispatch where applicable.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card p-5 shadow-soft">
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">6. Receiving Your Order</h2>
            <PolicyList
              items={[
                "Provide a complete address, correct postcode and reachable phone number at checkout.",
                "Ensure that you or an authorised adult is available to receive medicines or high-value equipment where a handover or signature is required.",
                "Before accepting visibly damaged equipment or a tampered parcel, record the condition and, where possible, refuse delivery.",
                "After delivery, store medicines and postpartum-care products according to their labels and keep equipment in a safe, dry location.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">7. Missed, Delayed or Lost Deliveries</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              A delivery partner may attempt redelivery, hold the parcel at a local facility or return it to us if no one
              is available. Additional delivery charges may apply where an address is incorrect or repeated delivery is
              requested. If tracking has not moved for an unusual period, or an order is marked delivered but cannot be
              found, contact us promptly so we can investigate with the delivery partner.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">8. Damage, Shortage or Wrong Item</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Inspect your order as soon as it arrives. Report damage, leakage, tampering, missing items or an incorrect
              product within 48 hours of delivery. Keep the product, invoice and packaging, and provide clear photographs
              or an unboxing video where reasonably available. Resolution is handled under our Refund & Return Policy.
            </p>
          </section>

          <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-2xl font-extrabold text-foreground">Delivery Support</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Include your order number when contacting us about a shipment.
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

export default ShippingDeliveryPolicy;
