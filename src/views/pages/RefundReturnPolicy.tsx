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

const RefundReturnPolicy = () => {
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
            <h1 className="text-xl font-bold leading-none">Refund & Return Policy</h1>
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
          <h1 className="mt-3 text-4xl font-extrabold text-foreground md:text-5xl">Refund & Return Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Your safety matters to us. Because medicines, postpartum-care products and medical equipment have different
            hygiene, storage and warranty requirements, return eligibility depends on the product and the reason for the
            request. This policy does not limit any right available under applicable consumer law.
          </p>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">1. If Your Order Arrives With a Problem</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Contact us within 48 hours of delivery if an item is damaged, leaking, expired, defective, counterfeit or
              different from what you ordered, or if an item is missing. Depending on the verified issue and available
              stock, we will offer a replacement, refund or another remedy required by law.
            </p>
            <PolicyList
              items={[
                "Keep the product, invoice, labels, accessories and original packaging until the review is complete.",
                "Share clear photographs of the product, batch or serial number, outer packaging and shipping label.",
                "An unboxing video is helpful for transit damage or missing-item claims where reasonably available, but we will assess all evidence provided.",
                "Do not use a product that appears damaged, tampered with, expired or unsafe.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">2. Ayurvedic Medicines & Wellness Products</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              For health, safety and quality-control reasons, medicines, supplements, ingestible products and
              temperature-sensitive goods cannot be returned after delivery merely because you changed your mind.
              Eligible claims for an incorrect, damaged, tampered, expired or defective item remain covered by this policy.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">3. Postpartum-Care Products</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Opened or used personal-care, hygiene, intimate-care, food, oil and consumable products are not returnable
              for change of mind. A sealed, unused and non-perishable item may be eligible for return if you contact us
              within 7 calendar days of delivery and the product page does not mark it as non-returnable. Return shipping
              for an approved change-of-mind return is paid by the customer.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">4. Medical Equipment</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Unused medical equipment may be returned within 7 calendar days of delivery when it is complete, undamaged
              and in its original sealed packaging, unless the listing states that it is non-returnable. For installed,
              calibrated, hygiene-sensitive or made-to-order equipment, returns are accepted only for a verified defect,
              transit damage, incorrect supply or another remedy required by law.
            </p>
            <PolicyList
              items={[
                "Do not remove hygiene seals or use equipment you may wish to return.",
                "Faults reported after the return window may be handled under the manufacturer’s warranty or service process.",
                "Consumables, opened sterile items and single-use accessories cannot be returned after their seal is broken unless defective.",
                "Unauthorised repair, modification, misuse or damage from incorrect installation may void return or warranty eligibility.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">5. Items We Cannot Accept</h2>
            <PolicyList
              items={[
                "Opened, used or partly consumed medicines, supplements, food or personal-hygiene products, unless defective.",
                "Products damaged after delivery through misuse, poor storage, accidental damage or failure to follow instructions.",
                "Items without their serial number, batch label, included accessories or original packaging where these are needed to verify the claim.",
                "Clearance, customised or made-to-order items marked non-returnable, except where faulty, damaged or incorrectly supplied.",
                "A product rejected only because its packaging design changed while its identity, quantity and essential characteristics remain correct.",
              ]}
            />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">6. Cancellations</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              You may request cancellation before dispatch. We will try to stop the order, but cancellation is not
              guaranteed once packing, prescription processing, customisation or dispatch has begun. If we cancel a paid
              order because an item is unavailable, restricted or cannot be delivered, we will refund the affected amount.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">7. Return Review & Collection</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Do not send an item until our support team confirms the return instructions. We may arrange collection or
              ask you to send the item to the specified address. Approval is completed after inspection. We may decline a
              return if the item does not match the request, has been used, is incomplete, or is damaged for a reason not
              covered by this policy. We pay reasonable return-delivery costs for verified wrong, damaged or defective
              items; otherwise, any approved change-of-mind return cost is the customer’s responsibility.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-extrabold text-foreground">8. Refunds</h2>
            <PolicyList
              items={[
                "Approved refunds are sent to the original payment method wherever possible.",
                "We initiate an approved refund within 7 business days after cancellation confirmation or successful return inspection.",
                "Your bank or payment provider may take additional time to show the credit in your account.",
                "Original delivery charges are refunded when the complete order was wrong, damaged, defective or cancelled by us; otherwise they are non-refundable.",
                "Any promotional discount, coupon, gift or bundled benefit will be adjusted when calculating the refund.",
              ]}
            />
          </section>

          <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-2xl font-extrabold text-foreground">Request a Return, Replacement or Refund</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Send your name, order number, affected item, reason for the request and supporting photographs or video.
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

export default RefundReturnPolicy;
