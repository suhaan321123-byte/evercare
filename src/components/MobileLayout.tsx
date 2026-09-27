import { Fragment, useMemo, useState } from "react";
import {
  Search,
  Home,
  LayoutGrid,
  ShoppingCart,
  Tag,
  User,
  X,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Package,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import HeroSlider from "./HeroSlider";
import OfferBar from "./OfferBar";
import BrandShowcase from "./BrandShowcase";
import CarePackages from "./CarePackages";
import ProductCard from "./ProductCard";
import { sortOutOfStockLast, type Product } from "@/data/catalog";
import type { HomePageServerData } from "@/app/HomeClient";
import type { Catalogue } from "@/services/catalogues";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useNavigate } from "react-router-dom";
import ProductSearchBox from "./ProductSearchBox";
import ImagePlaceholder from "./ImagePlaceholder";
import allCataloguesImage from "@/assets/indian_grocery_items_under_1mb.jpg";
import offersImage from "@/assets/indiverse offers.png";
import {
  getOrderQuantityBounds,
  money,
  taxIncludedPricesForProduct,
  toTaxIncludedProduct,
} from "@/lib/pricing";
import AccountSheet from "@/components/accountSheet/AccountSheet";
import Link from "next/link";

type MobileScreen = "home" | "offers";

const byNewestCreated = (a: Product, b: Product) =>
  new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

const isOfferProduct = (product: Product) =>
  product.mrp > product.price || Boolean(product.hasBogoOffer);
const normalizeCatalogueName = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
const findCatalogueByName = (
  catalogues: Catalogue[],
  catalogueName: string,
) => {
  const normalizedName = normalizeCatalogueName(catalogueName);

  return catalogues.find((catalogue) =>
    [catalogue.name, catalogue.route, catalogue.slug].some((value) =>
      normalizeCatalogueName(value).includes(normalizedName),
    ),
  );
};

const getCatalogueListingPath = (catalogue: Catalogue) => {
  const isEquipment = /equipment|medical device/i.test(
    `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
  );
  if (isEquipment) return "/equipment";

  const catalogueRoute = catalogue.route || catalogue.slug || catalogue.name;
  return `/products?category=${encodeURIComponent(catalogueRoute)}`;
};

const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
    <div className="aspect-square shimmer" />
    <div className="space-y-2 p-3">
      <div className="h-3 w-1/2 shimmer rounded-full" />
      <div className="h-4 w-full shimmer rounded-full" />
      <div className="h-4 w-3/4 shimmer rounded-full" />
      <div className="flex items-center justify-between pt-1">
        <div className="h-5 w-14 shimmer rounded-full" />
        <div className="h-8 w-8 shimmer rounded-full" />
      </div>
    </div>
  </div>
);

const MobileLayout = ({ homeData }: { homeData: HomePageServerData }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [screen, setScreen] = useState<MobileScreen>("home");
  const { count, items, add, remove, total } = useCart();
  const { hydrated: authHydrated, isLoggedIn } = useCustomerAuth();
  const navigate = useNavigate();
  const catalogues = homeData.catalogues;
  const riceCatalogue = findCatalogueByName(catalogues, "Rice & Rice Products");
  const frozenCatalogue = findCatalogueByName(catalogues, "Frozen Items");
  const medicineCatalogue = catalogues.find((catalogue) =>
    /medicine|pharma|ayurveda/i.test(
      `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
    ),
  );
  const riceCatalogueRoute =
    riceCatalogue?.route || riceCatalogue?.slug || riceCatalogue?.name || "";
  const frozenCatalogueRoute =
    frozenCatalogue?.route ||
    frozenCatalogue?.slug ||
    frozenCatalogue?.name ||
    "";
  const medicineCatalogueRoute =
    medicineCatalogue?.route ||
    medicineCatalogue?.slug ||
    medicineCatalogue?.name ||
    "";
  const cataloguesLoading = false;
  const medicineSectionProducts = useMemo(
    () =>
      sortOutOfStockLast(homeData.medicineSectionProducts ?? []).slice(0, 6),
    [homeData.medicineSectionProducts],
  );
  const offerProducts = useMemo(
    () =>
      sortOutOfStockLast(
        (homeData.offerProducts ?? [])
          .filter(isOfferProduct)
          .sort(byNewestCreated),
      ).slice(0, 6),
    [homeData.offerProducts],
  );
  const riceSectionProducts = useMemo(
    () => sortOutOfStockLast(homeData.riceSectionProducts ?? []).slice(0, 6),
    [homeData.riceSectionProducts],
  );
  const frozenSectionProducts = useMemo(
    () => sortOutOfStockLast(homeData.frozenSectionProducts ?? []).slice(0, 6),
    [homeData.frozenSectionProducts],
  );
  const mobileCataloguePreview = useMemo(
    () => catalogues.slice(0, 9),
    [catalogues],
  );
  const allCataloguesImageSrc =
    typeof allCataloguesImage === "string"
      ? allCataloguesImage
      : allCataloguesImage.src;
  const offersImageSrc =
    typeof offersImage === "string" ? offersImage : offersImage.src;

  const handleQuantityChange = (productId: string, newQty: number) => {
    const item = items.find((i) => i.id === productId);
    if (!item) return;

    const orderBounds = getOrderQuantityBounds(item as any);
    const minQuantity = Math.max(1, Number(orderBounds?.minQuantity || 1) || 1);

    if (newQty < minQuantity) {
      remove(productId);
      return;
    }

    const qtyDiff = newQty - item.qty;
    if (qtyDiff === 0) return;

    add(item, qtyDiff);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border shadow-soft">
        <div className="flex items-center justify-between px-4 py-2">
          {screen === "offers" ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScreen("home")}
                className="h-10 w-10 rounded-full bg-muted"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 px-0">
                <h1 className="text-lg font-extrabold leading-none text-foreground">
                  Offers
                </h1>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Best deals and add-to-cart savings
                </p>
              </div>
              <div className="h-10 w-10" />
            </>
          ) : (
            <>
              <a href="/" className="flex items-center gap-2">
                <img
                  src="/evercaremed_logo.png"
                  alt="Store"
                  className="block h-11 w-auto max-w-[132px] object-contain"
                />
              </a>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchOpen((s) => !s)}
                  className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Search"
                >
                  {searchOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
                <Link
                  className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
                  href={"/?chat=open"}
                  // href={"/chat"}
                >
                  <MessageCircle className="h-6 w-6" />
                </Link>
              </div>
            </>
          )}
        </div>
        {screen === "home" && searchOpen && (
          <div className="px-4 pb-3 animate-fade-in">
            <ProductSearchBox onSearch={() => setSearchOpen(false)} />
          </div>
        )}
        {!searchOpen && (
          <OfferBar
            initialItems={homeData.scrollingItems.map((item) => item.text)}
          />
        )}
      </header>

      {screen === "home" ? (
        <>
          {/* Hero */}
          <HeroSlider
            initialDesktopSlides={homeData.desktopBanners}
            initialMobileSlides={homeData.mobileBanners}
          />

          {/* Products in 2 columns */}
          <main className="space-y-3 px-4 pt-0 pb-4">
            {(cataloguesLoading || mobileCataloguePreview.length > 0) && (
              <section className="-mx-4 -mt-2 bg-slate-50/80 px-4 py-4">
                <div className="grid grid-cols-4 gap-3">
                  {cataloguesLoading &&
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={`catalogue-preview-skeleton-${index}`}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="h-14 w-14 shimmer rounded-full" />
                        <div className="h-3 w-12 shimmer rounded-full" />
                      </div>
                    ))}
                  {!cataloguesLoading && (
                    <button
                      type="button"
                      onClick={() => navigate("/products")}
                      className="flex min-w-0 flex-col items-center gap-2"
                    >
                      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted shadow-soft">
                        <img
                          src={allCataloguesImageSrc}
                          alt="All catalogues"
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="line-clamp-2 min-h-[2rem] text-center text-[11px] font-semibold leading-tight text-foreground">
                        All
                      </span>
                    </button>
                  )}
                  {!cataloguesLoading && (
                    <button
                      type="button"
                      onClick={() => navigate("/offers")}
                      className="flex min-w-0 flex-col items-center gap-2"
                    >
                      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted shadow-soft">
                        <img
                          src={offersImageSrc}
                          alt="Offers"
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="line-clamp-2 min-h-[2rem] text-center text-[11px] font-semibold leading-tight text-foreground">
                        Offers
                      </span>
                    </button>
                  )}
                  {!cataloguesLoading &&
                    mobileCataloguePreview.map((catalogue) => {
                      return (
                        <button
                          key={catalogue._id}
                          type="button"
                          onClick={() =>
                            navigate(getCatalogueListingPath(catalogue))
                          }
                          className="flex min-w-0 flex-col items-center gap-2"
                        >
                          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted shadow-soft">
                            {catalogue.image ? (
                              <img
                                src={catalogue.image}
                                alt={catalogue.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-primary" />
                            )}
                          </span>
                          <span className="line-clamp-2 min-h-[2rem] text-center text-[11px] font-semibold leading-tight text-foreground">
                            {catalogue.name}
                          </span>
                        </button>
                      );
                    })}
                  {!cataloguesLoading && (
                    <button
                      type="button"
                      onClick={() => setCategoriesOpen(true)}
                      className="flex min-w-0 flex-col items-center gap-2"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft">
                        <LayoutGrid className="h-6 w-6" />
                      </span>
                      <span className="line-clamp-2 min-h-[2rem] text-center text-[11px] font-semibold leading-tight text-foreground">
                        View More
                      </span>
                    </button>
                  )}
                </div>
              </section>
            )}

            <BrandShowcase brands={homeData.featuredBrands} />

            {[
              {
                title: "Medicines",
                items: medicineSectionProducts,
                loading: false,
                viewAllTo: medicineCatalogueRoute
                  ? `/products?category=${encodeURIComponent(medicineCatalogueRoute)}`
                  : "/products",
              },
              {
                title: "Ayurvedic Medicines",
                items: riceSectionProducts,
                loading: false,
                viewAllTo: riceCatalogueRoute
                  ? `/products?category=${encodeURIComponent(riceCatalogueRoute)}`
                  : "/products",
              },
              {
                title: "Frozen Items",
                items: frozenSectionProducts,
                loading: false,
                viewAllTo: frozenCatalogueRoute
                  ? `/products?category=${encodeURIComponent(frozenCatalogueRoute)}`
                  : "/products",
              },
            ]
              .filter((section) => section.loading || section.items.length > 0)
              .map((s) => (
                <Fragment key={s.title}>
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-foreground">
                      {s.title}
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          s.viewAllTo ??
                            (s.title === "Offers" ? "/offers" : "/products"),
                        )
                      }
                      className="text-xs font-semibold text-primary"
                    >
                      View All
                    </button>
                  </div>
                  <div className="mobile-product-scroller -mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3">
                    {s.loading &&
                      Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={`${s.title}-skeleton-${index}`}
                          className="w-[44vw] max-w-[180px] shrink-0"
                        >
                          <ProductCardSkeleton />
                        </div>
                      ))}
                    {!s.loading &&
                      s.items.map((p) => (
                        <div
                          key={p.id}
                          className="w-[44vw] max-w-[180px] shrink-0"
                        >
                          <ProductCard product={p} />
                        </div>
                      ))}
                  </div>
                </section>
                {s.title === "Medicines" ? <CarePackages compactMobile /> : null}
                </Fragment>
              ))}
          </main>
        </>
      ) : (
        <main className="flex-1 px-0 py-4 space-y-4 overflow-hidden">
          <div className="rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-80">
                  Special Offers
                </p>
                <h2 className="text-2xl font-extrabold mt-1">
                  Deals worth grabbing
                </h2>
                <p className="text-sm opacity-90 mt-2">
                  Handpicked savings on Ayurvedic medicines, wellness products,
                  and healthcare equipment.
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Tag className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="space-y-3 pb-4">
            {offerProducts.map((product) => {
              const discount = Math.round(
                ((product.mrp - product.price) / product.mrp) * 100,
              );
              const displayPrices = taxIncludedPricesForProduct(product);

              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft"
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlaceholder
                          label={`${product.name} image unavailable`}
                        />
                      )}
                      {product.badge && (
                        <Badge
                          className={`absolute top-2 left-2 text-[10px] ${
                            product.badge === "Selling Fast"
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {product.badge}
                        </Badge>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            {product.category}
                          </p>
                          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mt-1">
                            {product.name}
                          </h3>
                        </div>
                        {discount > 0 && (
                          <Badge className="bg-primary text-primary-foreground shrink-0">
                            {discount}% OFF
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-extrabold text-foreground">
                              {money(displayPrices.price)}
                            </span>
                            {displayPrices.mrp > displayPrices.price ? (
                              <span className="text-xs text-muted-foreground line-through">
                                {money(displayPrices.mrp)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="rounded-full px-4 h-9"
                          onClick={() => add(toTaxIncludedProduct(product))}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Sticky footer nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-card">
        <div className="grid grid-cols-5">
          {[
            { icon: Home, label: "Home", action: () => setScreen("home") },
            {
              icon: LayoutGrid,
              label: "Categories",
              action: () => setCategoriesOpen(true),
            },
            {
              icon: ShoppingCart,
              label: "Cart",
              badge: count,
              action: () => setCartOpen(true),
            },
            { icon: Tag, label: "Offers", action: () => navigate("/offers") },
            {
              icon: User,
              label: "Account",
              action: () => setAccountOpen(true),
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.action}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-smooth ${
                  (item.label === "Home" && screen === "home") ||
                  (item.label === "Offers" && screen === "offers")
                    ? "text-primary"
                    : "text-foreground hover:text-primary"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <Badge className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[10px] bg-accent hover:bg-accent">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Categories Modal */}
      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent
          side="bottom"
          className="h-[80vh] rounded-t-xl p-0 flex flex-col"
        >
          <SheetHeader className="shrink-0 px-4 pt-6 pb-4">
            <SheetTitle className="text-center text-xl font-bold">
              Shop by Category
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-4 overflow-y-auto px-4 pb-6">
            {catalogues.map((catalogue) => {
              return (
                <button
                  key={catalogue._id}
                  onClick={() => {
                    navigate(getCatalogueListingPath(catalogue));
                    setCategoriesOpen(false);
                  }}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-sm">
                    {catalogue.image ? (
                      <img
                        src={catalogue.image}
                        alt={catalogue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Package className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                      {catalogue.name}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cart Modal */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="bottom"
          className="h-[90dvh] rounded-t-xl p-0 flex flex-col"
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCartOpen(false)}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-bold text-foreground">Shopping Cart</h2>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 px-3 sm:px-4">
            {items.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">
                    Your cart is empty
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add some delicious items to get started!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-3 sm:space-y-4 sm:py-4">
                {items.map((item) => {
                  const isBogoOfferItem = Boolean(item.isBogoOfferItem);

                  return (
                    <div
                      key={item.id}
                      className="flex gap-2.5 p-2.5 bg-muted/30 rounded-lg sm:gap-3 sm:p-3"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
                        />
                      ) : (
                        <ImagePlaceholder
                          label={`${item.name} image unavailable`}
                          className="h-14 w-14 shrink-0 rounded-lg sm:h-16 sm:w-16"
                          iconClassName="h-6 w-6"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {item.weight}
                        </p>
                        {isBogoOfferItem ? (
                          <Badge className="mt-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                            BOGO offer
                            {/* {item.bogoPromotionCode ? ` · ${item.bogoPromotionCode}` : ""} */}
                          </Badge>
                        ) : null}
                        {item.shippingAvailable !== true ? (
                          <p className="mt-1 text-xs font-semibold text-destructive">
                            Shipping not available
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleQuantityChange(item.id, item.qty - 1)
                              }
                              className="h-6 w-6 p-0"
                              disabled={isBogoOfferItem}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-7 text-center text-sm font-medium sm:w-8">
                              {item.qty}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleQuantityChange(item.id, item.qty + 1)
                              }
                              className="h-6 w-6 p-0"
                              disabled={isBogoOfferItem}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="min-w-fit text-right">
                            {isBogoOfferItem ? (
                              <>
                                <p className="font-semibold text-sm">
                                  {money(
                                    taxIncludedPricesForProduct(item as any, {
                                      salePrice: item.price,
                                    }).price * item.qty,
                                  )}
                                </p>
                                {item.mrp > item.price && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {money(
                                      taxIncludedPricesForProduct(item as any, {
                                        basePrice: item.mrp,
                                      }).mrp * item.qty,
                                    )}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-sm">
                                  {money(item.price * item.qty)}
                                </p>
                                {item.mrp > item.price && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {money(item.mrp * item.qty)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(item.id)}
                        className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isBogoOfferItem}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Sticky Footer */}
          {items.length > 0 && (
            <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">
                  {money(total)}
                </p>
              </div>
              <Button
                onClick={() => {
                  setCartOpen(false);
                  navigate(
                    authHydrated && isLoggedIn
                      ? "/checkout"
                      : "/checkout-login",
                  );
                }}
                className="px-6 py-2 h-auto font-semibold"
              >
                Proceed
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
};

export default MobileLayout;
