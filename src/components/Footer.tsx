import { Link } from "react-router-dom";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Catalogue } from "@/services/catalogues";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Offers", to: "/offers" },
  { label: "About us", to: "/about-us" },
  { label: "Medical Tourism", to: "/ayurvedic-tourism" },
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
  premium?: boolean;
};

const Footer = ({ premium = true }: FooterProps) => {
  return (
    <footer className={`mt-12 hidden border-t md:block ${premium ? "border-[#315f2a] bg-[linear-gradient(145deg,#143521_0%,#244f30_100%)] text-white" : "border-border bg-card"}`}>
      <div className="site-container py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center">
              <img
                src="/evercaremed_logo_footer.png"
                alt="EvercareMed"
                className="h-16 w-auto max-w-[210px] object-contain"
              />
            </Link>
            <p className={`mt-4 max-w-sm text-sm leading-6 ${premium ? "text-white/65" : "text-muted-foreground"}`}>
              Trusted Ayurvedic medicines, wellness products, and healthcare equipment delivered with care.
            </p>
          </div>

          <div>
            <h2 className={`text-sm font-extrabold uppercase tracking-wider ${premium ? "text-white" : "text-foreground"}`}>Quick Links</h2>
            <nav className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block text-sm transition-smooth ${premium ? "text-white/60 hover:text-[#cde5bd]" : "text-muted-foreground hover:text-primary"}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className={`text-sm font-extrabold uppercase tracking-wider ${premium ? "text-white" : "text-foreground"}`}>Terms &amp; Policy</h2>
            <nav className="mt-4 space-y-2">
              {policyLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block text-sm transition-smooth ${premium ? "text-white/60 hover:text-[#cde5bd]" : "text-muted-foreground hover:text-primary"}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className={`text-sm font-extrabold uppercase tracking-wider ${premium ? "text-white" : "text-foreground"}`}>Contact</h2>
            <div className={`mt-4 space-y-3 text-sm ${premium ? "text-white/60" : "text-muted-foreground"}`}>
              <a
                href="https://www.google.com/maps/search/Varthur+Kodi,+Whitefield+Main+Road+Bangalore+560066"
                className={`flex items-start gap-2 transition-smooth ${premium ? "hover:text-[#cde5bd]" : "hover:text-primary"}`}
              >
                <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${premium ? "text-[#cde5bd]" : "text-primary"}`} />
                <span>
                  Suite1B, BusinezzBay, 4th Floor Gamma Block, Sigma Soft Tech Park, Varthur Kodi, Whitefield Main
                  Road, Bangalore 560066
                </span>
              </a>
              <a href="mailto:evercaremedmedgroup@gmail.com" className={`flex items-center gap-2 transition-smooth ${premium ? "hover:text-[#cde5bd]" : "hover:text-primary"}`}>
                <Mail className={`h-4 w-4 shrink-0 ${premium ? "text-[#cde5bd]" : "text-primary"}`} />
                <span>evercaremedmedgroup@gmail.com</span>
              </a>
              <a href="tel:8951982743" className={`flex items-center gap-2 transition-smooth ${premium ? "hover:text-[#cde5bd]" : "hover:text-primary"}`}>
                <Phone className={`h-4 w-4 shrink-0 ${premium ? "text-[#cde5bd]" : "text-primary"}`} />
                <span>8951982743</span>
              </a>
              <a
                href="https://evercare-two.vercel.app"
                className={`flex items-center gap-2 transition-smooth ${premium ? "hover:text-[#cde5bd]" : "hover:text-primary"}`}
              >
                <Globe className={`h-4 w-4 shrink-0 ${premium ? "text-[#cde5bd]" : "text-primary"}`} />
                <span>evercare-two.vercel.app</span>
              </a>
            </div>
          </div>
        </div>

        <div className={`mt-8 flex flex-col gap-3 border-t pt-5 text-xs md:flex-row md:items-center md:justify-between ${premium ? "border-white/10 text-white/50" : "border-border text-muted-foreground"}`}>
          <p>© {new Date().getFullYear()} EvercareMed. All rights reserved.</p>
          <p>Authentic Ayurvedic wellness, delivered with care.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
