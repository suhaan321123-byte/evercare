import { type FormEvent, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePagedCatalogueProducts } from "@/services/catalogues";
import { money, taxIncludedPriceForProduct } from "@/lib/pricing";
import ImagePlaceholder from "./ImagePlaceholder";

type ProductSearchBoxProps = {
  compact?: boolean;
  showButton?: boolean;
  placeholder?: string;
  onSearch?: () => void;
};

const ProductSearchBox = ({
  compact = false,
  showButton = false,
  placeholder = "Search Ayurvedic products...",
  onSearch,
}: ProductSearchBoxProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedDebouncedQuery = debouncedQuery.trim().toLowerCase();
  const { data: searchPage } = usePagedCatalogueProducts({
    search: debouncedQuery.trim() || undefined,
    page: 1,
    limit: 6,
    enabled: focused && Boolean(normalizedDebouncedQuery),
  });
  const suggestions = useMemo(() => {
    if (!normalizedDebouncedQuery) return [];

    return (searchPage?.products ?? []).slice(0, 6);
  }, [normalizedDebouncedQuery, searchPage?.products]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/products?search=${encodeURIComponent(value)}` : "/products");
    setFocused(false);
    onSearch?.();
  };

  const openProduct = (slugOrId: string) => {
    setFocused(false);
    setQuery("");
    navigate(`/product/${slugOrId}`);
    onSearch?.();
  };

  return (
    <form className="relative z-[70] focus-within:z-[120]" onSubmit={submitSearch}>
      <Search
        className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
          compact ? "left-3 h-4 w-4" : "left-4 h-4 w-4"
        }`}
      />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder={placeholder}
        className={
          compact
            ? "h-10 rounded-xl pl-10"
            : showButton
              ? "h-11 rounded-xl border-2 pl-11 pr-24 focus-visible:ring-primary"
              : "h-11 rounded-xl pl-10"
        }
      />
      {showButton ? (
        <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-md">
          Search
        </Button>
      ) : null}

      {focused && normalizedQuery ? (
        <div className="absolute left-0 right-0 top-full z-[120] mt-2 overflow-hidden rounded-xl border border-border bg-background shadow-card">
          {suggestions.length > 0 ? (
            suggestions.map((product) => (
              <button
                key={product.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openProduct(product.slug ?? product.id)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-smooth hover:bg-muted"
              >
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <ImagePlaceholder
                    label={`${product.name} image unavailable`}
                    className="h-10 w-10 shrink-0 rounded-lg"
                    iconClassName="h-5 w-5"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{product.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{product.category}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-primary">
                  {money(taxIncludedPriceForProduct(product, product.price))}
                </span>
              </button>
            ))
          ) : normalizedDebouncedQuery ? (
            <button
              type="submit"
              className="block w-full px-3 py-3 text-left text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Search for "{query.trim()}"
            </button>
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground">Searching...</div>
          )}
        </div>
      ) : null}
    </form>
  );
};

export default ProductSearchBox;
