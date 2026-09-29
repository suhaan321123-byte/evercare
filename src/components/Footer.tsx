import { Link } from "react-router-dom";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Catalogue } from "@/services/catalogues";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Offers", to: "/offers" },
  { label: "About us", to: "/about-us" },
  { label: "Ayurvedic Tourism", to: "/ayurvedic-tourism" },
  { label: "Contact", to: "/contact" },
];

const policyLinks = [
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Refund & Return Policy", to: "/refund-return-policy" },
  { label: "Shipping & Delivery Policy", to: "/shipping-delivery-policy" },
  { label: "Terms & Conditions", to: "/terms-conditions" },
];

type FooterProps = {
  initialCatalogues?: Catalogue[];
};

const Footer = (_props: FooterProps) => {
  return (
    <footer className="mt-12 hidden border-t border-border bg-card md:block">
      <div className="site-container py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center">
              <img
                src="/evercaremed_logo.png"
                alt="EvercareMed"
                className="h-14 w-auto max-w-[180px] object-contain"
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Trusted Ayurvedic medicines, wellness products, and healthcare equipment delivered with care.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Quick Links</h2>
            <nav className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-sm text-muted-foreground transition-smooth hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Terms &amp; Policy</h2>
            <nav className="mt-4 space-y-2">
              {policyLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-sm text-muted-foreground transition-smooth hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Contact</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <a
                href="https://www.google.com/maps/search/Varthur+Kodi,+Whitefield+Main+Road+Bangalore+560066"
                className="flex items-start gap-2 transition-smooth hover:text-primary"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Suite1B, BusinezzBay, 4th Floor Gamma Block, Sigma Soft Tech Park, Varthur Kodi, Whitefield Main
                  Road, Bangalore 560066
                </span>
              </a>
              <a href="mailto:evercaremedmedgroup@gmail.com" className="flex items-center gap-2 transition-smooth hover:text-primary">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>evercaremedmedgroup@gmail.com</span>
              </a>
              <a href="tel:8951982743" className="flex items-center gap-2 transition-smooth hover:text-primary">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>8951982743</span>
              </a>
              <a
                href="https://evercare-two.vercel.app"
                className="flex items-center gap-2 transition-smooth hover:text-primary"
              >
                <Globe className="h-4 w-4 shrink-0 text-primary" />
                <span>evercare-two.vercel.app</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} EvercareMed. All rights reserved.</p>
          <p>Authentic Ayurvedic wellness, delivered with care.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
