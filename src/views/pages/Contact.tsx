import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const contactItems = [
  {
    icon: MapPin,
    label: "Business address",
    value:
      "Suite1B, BusinezzBay, 4th Floor Gamma Block, Sigma Soft Tech Park, Varthur Kodi, Whitefield Main Road, Bangalore 560066",
    href: "https://www.google.com/maps/search/Varthur+Kodi,+Whitefield+Main+Road+Bangalore+560066",
  },
  {
    icon: Mail,
    label: "Email",
    value: "evercaremedmedgroup@gmail.com",
    href: "mailto:evercaremedmedgroup@gmail.com",
  },
  {
    icon: Phone,
    label: "Phone / WhatsApp",
    value: "8951982743",
    href: "tel:8951982743",
  },
  {
    icon: Globe,
    label: "Website",
    value: "evercare-two.vercel.app",
    href: "https://evercare-two.vercel.app",
  },
];

const Contact = () => {
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
            <h1 className="text-xl font-bold leading-none">Contact Us</h1>
          </div>
        </header>
      ) : (
        <>
          <Header />
          <MegaMenu />
        </>
      )}

      <main className="site-container py-10 md:py-14">
        <section className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">Contact Us</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            We&apos;re here to help! Whether you have questions about products, delivery, or your order, our team is
            always ready to assist you.
          </p>
        </section>

        <div className="mt-10 grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {contactItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-smooth hover:border-primary">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{item.value}</p>
                  </div>
                </div>
              );

              return item.href ? (
                <a key={item.label} href={item.href} className="block">
                  {content}
                </a>
              ) : (
                <div key={item.label}>{content}</div>
              );
            })}

            <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-foreground">Quick Support</h2>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">
                    For faster assistance, message us on WhatsApp with your order number and query. Our support team aims
                    to respond within a few hours during business hours.
                  </p>
                  <Button className="mt-5 rounded-full" asChild>
                    <a href="https://wa.me/918951982743">Message on WhatsApp</a>
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="shrink-0 border-b border-border p-5">
              <h2 className="text-2xl font-extrabold text-foreground">Store Location</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Suite1B, BusinezzBay, 4th Floor Gamma Block, Sigma Soft Tech Park, Varthur Kodi, Whitefield Main Road,
                Bangalore 560066
              </p>
            </div>
            <div className="min-h-[420px] flex-1">
              <iframe
                title="EvercareMed store location map"
                src="https://www.google.com/maps?q=Varthur%20Kodi%2C%20Whitefield%20Main%20Road%2C%20Bangalore%20560066&output=embed"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
