import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "./ProductCard";
import { sortOutOfStockLast, type Product } from "@/data/catalog";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  products: Product[];
  accent?: "primary" | "secondary" | "accent";
  loading?: boolean;
  viewAllTo?: string;
  titleClassName?: string;
};

const ProductSection = ({ title, subtitle, products, accent = "primary", loading = false, viewAllTo = "/products", titleClassName }: Props) => {
  const sortedProducts = sortOutOfStockLast(products);
  const dotColor = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    accent: "bg-accent",
  }[accent];

  return (
    <section className="site-container py-10">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          {subtitle && (
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">{subtitle}</span>
            </div>
          )}
          <h2 className={cn("text-3xl font-extrabold text-foreground md:text-4xl", titleClassName)}>{title}</h2>
        </div>
        <Button variant="ghost" className="hidden sm:flex group" asChild>
          <Link to={viewAllTo}>
          View All <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={`product-section-skeleton-${index}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="aspect-square shimmer" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-1/2 shimmer rounded-full" />
                <div className="h-4 w-full shimmer rounded-full" />
                <div className="h-4 w-3/4 shimmer rounded-full" />
                <div className="flex items-center justify-between pt-1">
                  <div className="h-5 w-16 shimmer rounded-full" />
                  <div className="h-9 w-9 shimmer rounded-full" />
                </div>
              </div>
            </div>
          ))}
        {!loading && sortedProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};

export default ProductSection;
