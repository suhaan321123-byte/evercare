import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Filter, Home, LayoutGrid, Minus, Package, Plus, Search, ShoppingCart, SlidersHorizontal, Truck, Tag, Trash2, User } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MegaMenu from "@/components/MegaMenu";
import ProductCard from "@/components/ProductCard";
import AccountSheet from "@/components/accountSheet/AccountSheet";
import { sortOutOfStockLast } from "@/data/catalog";
import { useCatalogues, usePagedCatalogueProducts, useProductBrands } from "@/services/catalogues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import {
  getOrderQuantityBounds,
  money,
  taxIncludedPriceForProduct,
} from "@/lib/pricing";

type PriceFilter = {
  id: string;
  label: string;
  min?: number;
  max?: number;
};

const priceFilters: PriceFilter[] = [
  { id: "any", label: "Any Price" },
  { id: "under-1000", label: "Under ₹1,000", max: 1000 },
  { id: "1000-5000", label: "₹1,000 - ₹5,000", min: 1000, max: 5000 },
  { id: "5000-15000", label: "₹5,000 - ₹15,000", min: 5000, max: 15000 },
  { id: "15000-plus", label: "₹15,000+", min: 15000 },
];

const shippingFilters = ["All", "Free Shipping"] as const;
const CATEGORY_NAME_LIMIT = 14;
const BRAND_FILTER_STEP = 10;
const PRODUCTS_PER_PAGE = 24;

const shortenCategoryName = (name: string) =>
  name.length > CATEGORY_NAME_LIMIT ? `${name.slice(0, CATEGORY_NAME_LIMIT - 1)}...` : name;

const splitBrandNames = (value?: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitBrandNames);
  if (typeof value === "object") {
    const brand = value as { name?: unknown; title?: unknown; label?: unknown; brand?: unknown };
    return splitBrandNames(brand.name ?? brand.title ?? brand.label ?? brand.brand);
  }

  return String(value).split(",").map((brand) => brand.trim()).filter(Boolean);
};

const priceFilterToApiRange = (filter: PriceFilter) => `${filter.min ?? 0}-${filter.max ?? ""}`;

const splitParamList = (value?: string | null) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
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
);

const CategoryCircleSkeleton = () => (
  <div className="flex w-20 shrink-0 flex-col items-center gap-2">
    <div className="h-16 w-16 shimmer rounded-full" />
    <div className="h-3 w-14 shimmer rounded-full" />
  </div>
);

type ProductListingProps = {
  catalogueMode?: "all" | "equipment";
};

const ProductListing = ({ catalogueMode = "all" }: ProductListingProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const catalogueScrollerRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLElement>(null);
  const { count, items, add, remove, total } = useCart();
  const { hydrated: authHydrated, isLoggedIn } = useCustomerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: catalogues = [],
    isLoading: cataloguesLoading,
    isFetching: cataloguesFetching,
    isPlaceholderData: cataloguesPlaceholder,
  } = useCatalogues();
  const cataloguesPending =
    cataloguesLoading || cataloguesPlaceholder || (catalogues.length === 0 && cataloguesFetching);
  const lockedCatalogue = useMemo(
    () =>
      catalogueMode === "equipment"
        ? catalogues.find((catalogue) =>
            [catalogue.name, catalogue.route, catalogue.slug].some((value) =>
              /equipment|medical device/i.test(value),
            ),
          )
        : undefined,
    [catalogueMode, catalogues],
  );
  const isCatalogueLocked = catalogueMode !== "all";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [visibleBrandCount, setVisibleBrandCount] = useState(BRAND_FILTER_STEP);
  const [selectedPriceIds, setSelectedPriceIds] = useState<string[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<(typeof shippingFilters)[number]>("All");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const debouncedModalSearchQuery = useDebouncedValue(modalSearchQuery, 300);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [catalogueScrollState, setCatalogueScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const effectiveCatalogueId = lockedCatalogue?._id || selectedCatalogueId;
  const catalogueReady = !isCatalogueLocked || Boolean(lockedCatalogue);
  const { data: apiBrands = [], isLoading: brandsLoading } = useProductBrands(
    effectiveCatalogueId || undefined,
    catalogueReady && catalogueMode !== "equipment",
  );
  const showingAllCategories = selectedCategoryIds.length === 0;
  const selectedPriceRanges = useMemo(
    () =>
      selectedPriceIds
        .map((priceId) => priceFilters.find((filter) => filter.id === priceId))
        .filter((filter): filter is PriceFilter => Boolean(filter && filter.id !== "any"))
        .map(priceFilterToApiRange),
    [selectedPriceIds],
  );
  const productPageQuery = usePagedCatalogueProducts({
    catalogueId: effectiveCatalogueId || undefined,
    category: selectedCategoryIds.length > 0 ? selectedCategoryIds.join(",") : undefined,
    search: debouncedQuery.trim() || undefined,
    brands: selectedBrands,
    priceRange: selectedPriceRanges.length > 0 ? selectedPriceRanges.join(",") : undefined,
    freeShipping: selectedShipping === "Free Shipping" ? true : undefined,
    page: currentPage,
    limit: PRODUCTS_PER_PAGE,
    sortBy: searchParams.get("sortBy") || null,
    enabled: catalogueReady,
  });
  const categoryImagePageQuery = usePagedCatalogueProducts({
    catalogueId: lockedCatalogue?._id,
    page: 1,
    limit: 100,
    enabled: catalogueReady,
  });
  const productPagination = productPageQuery.data?.pagination;
  const productsLoading = cataloguesPending || productPageQuery.isLoading;
  const productsFetching = productPageQuery.isFetching;
  const modalNormalizedSearch = debouncedModalSearchQuery.trim().toLowerCase();
  const modalSearchPage = usePagedCatalogueProducts({
    catalogueId: lockedCatalogue?._id,
    search: debouncedModalSearchQuery.trim() || undefined,
    page: 1,
    limit: 50,
    enabled: searchOpen && catalogueReady,
  });
  const modalProducts = modalSearchPage.data?.products ?? [];
  const modalSearchResults = modalNormalizedSearch
    ? modalProducts
        .filter((product) =>
          [product.name, product.category, product.weight, product.badge]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(modalNormalizedSearch))
        )
        .slice(0, 50)
    : modalProducts.slice(0, 50);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const pageParam = Number(searchParams.get("page") || "1");
    setCurrentPage(Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1);
  }, [searchParams]);

  useEffect(() => {
    if (catalogues.length === 0) return;

    const categoryParam = searchParams.get("category");
    const itemCategoryParam = searchParams.get("itemCategory");
    const itemCategoriesParam = searchParams.get("itemCategories");
    const brandParam = searchParams.get("brand");
    const brandsParam = searchParams.get("brands");
    const priceParam = searchParams.get("prices");
    const brandFilters = splitBrandNames(brandsParam ?? brandParam);
    const priceFiltersFromParams = splitParamList(priceParam).filter((priceId) =>
      priceFilters.some((filter) => filter.id === priceId && filter.id !== "any")
    );
    const itemCategoryFilters = splitParamList(itemCategoriesParam ?? itemCategoryParam);
    const matchedCatalogue = lockedCatalogue ?? (categoryParam
      ? catalogues.find((catalogue) =>
          [catalogue._id, catalogue.route, catalogue.slug, catalogue.name].includes(categoryParam)
        )
      : itemCategoryFilters.length > 0
        ? catalogues.find((catalogue) =>
            catalogue.categories.some((category) =>
              itemCategoryFilters.some((itemCategory) => category._id === itemCategory || category.name === itemCategory)
            )
          )
      : undefined);
    const matchedItemCategoryIds = matchedCatalogue
      ? itemCategoryFilters
          .map((itemCategory) =>
            matchedCatalogue.categories.find((category) => category._id === itemCategory || category.name === itemCategory)?._id
          )
          .filter((categoryId): categoryId is string => Boolean(categoryId))
      : [];

    if (matchedCatalogue) {
      setSelectedCatalogueId(matchedCatalogue._id);
      setSelectedCategoryIds(matchedItemCategoryIds);
      setSelectedBrands(brandFilters);
      setSelectedPriceIds(priceFiltersFromParams);
      return;
    }

    if (itemCategoryFilters.length > 0) {
      setSelectedCatalogueId("");
      setSelectedCategoryIds(itemCategoryFilters);
      setSelectedBrands(brandFilters);
      setSelectedPriceIds(priceFiltersFromParams);
      return;
    }

    if (brandFilters.length > 0 || priceFiltersFromParams.length > 0) {
      setSelectedCatalogueId("");
      setSelectedCategoryIds([]);
      setSelectedBrands(brandFilters);
      setSelectedPriceIds(priceFiltersFromParams);
      return;
    }

    setSelectedCatalogueId("");
    setSelectedCategoryIds([]);
    setSelectedBrands([]);
    setSelectedPriceIds([]);
  }, [catalogues, lockedCatalogue, searchParams]);

  const resetProductPage = (params: URLSearchParams) => {
    params.delete("page");
    setCurrentPage(1);
  };

  const setProductPage = (page: number) => {
    const nextPage = Math.max(1, Math.floor(page));
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage > 1) {
      nextParams.set("page", String(nextPage));
    } else {
      nextParams.delete("page");
    }

    setCurrentPage(nextPage);
    setSearchParams(nextParams);
    setIsPageChanging(true);
    window.setTimeout(() => setIsPageChanging(false), 180);
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectCatalogue = (catalogueId: string, route: string) => {
    setSelectedCatalogueId(catalogueId);
    setSelectedCategoryIds([]);
    setSelectedBrands([]);
    setSelectedPriceIds([]);
    setQuery("");
    setVisibleBrandCount(BRAND_FILTER_STEP);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("category", route);
    nextParams.delete("itemCategory");
    nextParams.delete("itemCategories");
    nextParams.delete("search");
    nextParams.delete("prices");
    resetProductPage(nextParams);
    setSearchParams(nextParams);
  };

  const selectAllCatalogues = () => {
    setSelectedCatalogueId(lockedCatalogue?._id ?? "");
    setSelectedCategoryIds([]);
    setSelectedBrands([]);
    setSelectedPriceIds([]);
    setQuery("");
    setVisibleBrandCount(BRAND_FILTER_STEP);
    const nextParams = new URLSearchParams(searchParams);
    if (lockedCatalogue) {
      nextParams.set(
        "category",
        lockedCatalogue.route || lockedCatalogue.slug || lockedCatalogue.name,
      );
    } else {
      nextParams.delete("category");
    }
    nextParams.delete("itemCategory");
    nextParams.delete("itemCategories");
    nextParams.delete("brand");
    nextParams.delete("brands");
    nextParams.delete("prices");
    nextParams.delete("priceRange");
    nextParams.delete("search");
    resetProductPage(nextParams);
    setSearchParams(nextParams);
  };

  const updateSearchQuery = (value: string) => {
    setQuery(value);

    const nextParams = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      nextParams.set("search", trimmed);
    } else {
      nextParams.delete("search");
    }

    resetProductPage(nextParams);
    setSearchParams(nextParams);
  };

  const updateCategoryFilters = (nextCategoryIds: string[]) => {
    setSelectedCategoryIds(nextCategoryIds);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("itemCategory");
    nextParams.delete("itemCategories");

    if (nextCategoryIds.length > 0) {
      nextParams.set("itemCategories", nextCategoryIds.join(","));
    }

    resetProductPage(nextParams);
    setSearchParams(nextParams);
  };

  const updateBrandFilters = (nextBrands: string[]) => {
    setSelectedBrands(nextBrands);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("brand");
    nextParams.delete("brands");

    if (nextBrands.length > 0) {
      nextParams.set("brands", nextBrands.join(","));
    }

    resetProductPage(nextParams);
    setSearchParams(nextParams);
  };

  const updatePriceFilters = (nextPriceIds: string[]) => {
    setSelectedPriceIds(nextPriceIds);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("prices");

    if (nextPriceIds.length > 0) {
      nextParams.set("prices", nextPriceIds.join(","));
    }

    resetProductPage(nextParams);
    setSearchParams(nextParams);
  };

  const updateCatalogueScrollState = () => {
    const scroller = catalogueScrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCatalogueScrollState({
      canScrollLeft: scroller.scrollLeft > 1,
      canScrollRight: scroller.scrollLeft < maxScrollLeft - 1,
    });
  };

  const scrollCatalogues = (direction: "left" | "right") => {
    catalogueScrollerRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  const handleCatalogueWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    event.currentTarget.scrollLeft += event.deltaY;
  };

  useEffect(() => {
    const scroller = catalogueScrollerRef.current;
    if (!scroller) return;

    const animationFrame = window.requestAnimationFrame(updateCatalogueScrollState);
    const resizeObserver = new ResizeObserver(updateCatalogueScrollState);
    resizeObserver.observe(scroller);

    window.addEventListener("resize", updateCatalogueScrollState);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateCatalogueScrollState);
    };
  }, [catalogues.length, cataloguesPending, categoryImagePageQuery.isLoading, lockedCatalogue?._id]);

  useEffect(() => {
    setVisibleBrandCount(BRAND_FILTER_STEP);
  }, [selectedCatalogueId]);

  const visibleProducts = useMemo(
    () => sortOutOfStockLast(productPageQuery.data?.products ?? []),
    [productPageQuery.data?.products]
  );
  const totalItems = productPagination?.totalItems ?? visibleProducts.length;
  const totalPages = Math.max(1, productPagination?.totalPages ?? 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageSize = productPagination?.pageSize ?? PRODUCTS_PER_PAGE;
  const pageStart = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(pageStart + visibleProducts.length - 1, totalItems);
  const visiblePageNumbers = useMemo(() => {
    const windowSize = isMobile ? 3 : 5;
    const halfWindow = Math.floor(windowSize / 2);
    const start = Math.max(1, Math.min(safeCurrentPage - halfWindow, totalPages - windowSize + 1));
    const end = Math.min(totalPages, start + windowSize - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [isMobile, safeCurrentPage, totalPages]);

  useEffect(() => {
    if (productsLoading) return;
    if (currentPage <= totalPages) return;

    const nextParams = new URLSearchParams(searchParams);
    if (totalPages > 1) {
      nextParams.set("page", String(totalPages));
    } else {
      nextParams.delete("page");
    }

    setCurrentPage(totalPages);
    setSearchParams(nextParams);
  }, [currentPage, productsLoading, searchParams, setSearchParams, totalPages]);

  const selectedCatalogue = lockedCatalogue ?? catalogues.find((catalogue) => catalogue._id === selectedCatalogueId);
  const categoryImages = useMemo(() => {
    const images = new Map<string, string>();

    (categoryImagePageQuery.data?.products ?? []).forEach((product) => {
      if (!product.categoryId || images.has(product.categoryId)) return;

      const image = product.categoryImage || product.image;
      if (image) images.set(product.categoryId, image);
    });

    return images;
  }, [categoryImagePageQuery.data?.products]);
  const medicineCatalogue = catalogues.find((catalogue) =>
    [catalogue.name, catalogue.route, catalogue.slug].some((value) => /medicine/i.test(value)),
  );
  const filterCategories = selectedCatalogue
    ? selectedCatalogue.categories ?? []
    : medicineCatalogue?.categories ?? [];
  const activeCategoryCount = selectedCategoryIds.length;
  const filterBrands = apiBrands;
  const visibleBrands = filterBrands.slice(0, visibleBrandCount);
  const hiddenBrandCount = Math.max(filterBrands.length - visibleBrands.length, 0);
  const isBrandActive = (brand: string) => {
    const brandNames = splitBrandNames(brand);
    return brandNames.length > 0 && brandNames.every((brandName) => selectedBrands.includes(brandName));
  };
  const sliderCatalogue = lockedCatalogue ?? medicineCatalogue;
  const categorySliderItems = (sliderCatalogue?.categories ?? []).map((category) => ({
    id: category._id,
    name: category.name,
    image: category.image || categoryImages.get(category._id),
    catalogueId: sliderCatalogue!._id,
    catalogueRoute: sliderCatalogue!.route || sliderCatalogue!.slug || sliderCatalogue!.name,
  }));

  const selectCategory = (categoryId: string, catalogueId: string, catalogueRoute: string) => {
    setSelectedCatalogueId(catalogueId);
    setSelectedCategoryIds([categoryId]);
    setSelectedBrands([]);
    setSelectedPriceIds([]);
    setQuery("");
    setVisibleBrandCount(BRAND_FILTER_STEP);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("category", catalogueRoute);
    nextParams.delete("itemCategory");
    nextParams.set("itemCategories", categoryId);
    nextParams.delete("brand");
    nextParams.delete("brands");
    nextParams.delete("prices");
    nextParams.delete("priceRange");
    nextParams.delete("search");
    resetProductPage(nextParams);
    setSearchParams(nextParams);
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4 text-muted-foreground" />
          Search
        </label>
        <Input
          value={query}
          onChange={(e) => updateSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="rounded-xl"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Tag className="h-4 w-4 text-muted-foreground" />
          Categories
          {activeCategoryCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activeCategoryCount}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={() => updateCategoryFilters([])}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-smooth ${
              selectedCategoryIds.length === 0
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary"
            }`}
          >
            <span className="min-w-0 flex-1 text-left">All Categories</span>
            {selectedCategoryIds.length === 0 && <Check className="h-4 w-4" />}
          </button>
          {cataloguesPending &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`category-filter-skeleton-${index}`} className="h-9 rounded-xl shimmer" />
            ))}
          {!cataloguesPending && filterCategories.map((category) => {
            const active = selectedCategoryIds.includes(category._id);
            return (
              <button
                key={category._id}
                onClick={() => {
                  const nextCategoryIds = active
                    ? selectedCategoryIds.filter((categoryId) => categoryId !== category._id)
                    : [...selectedCategoryIds, category._id];
                  updateCategoryFilters(nextCategoryIds);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-smooth ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                <span className="min-w-0 flex-1 text-left">{category.name}</span>
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
          {!cataloguesPending && filterCategories.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              No categories found.
            </p>
          )}
        </div>
      </div>

      {catalogueMode !== "equipment" && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Brands
            {selectedBrands.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {selectedBrands.length}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => updateBrandFilters([])}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-smooth ${
                selectedBrands.length === 0
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary"
              }`}
            >
              <span>All Brands</span>
              {selectedBrands.length === 0 && <Check className="h-4 w-4" />}
            </button>

          {brandsLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={`brand-filter-skeleton-${index}`} className="h-9 shimmer rounded-xl" />
            ))}

          {!brandsLoading &&
            visibleBrands.map((brand) => {
              const active = isBrandActive(brand);

              return (
                <button
                  key={brand}
                  onClick={() => {
                    const brandNames = splitBrandNames(brand);
                    const nextBrands = active
                      ? selectedBrands.filter((selectedBrand) => !brandNames.includes(selectedBrand))
                      : Array.from(new Set([...selectedBrands, ...brandNames]));
                    updateBrandFilters(nextBrands);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-smooth ${
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                >
                  <span className="line-clamp-1">{brand}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}

          {!brandsLoading && hiddenBrandCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full rounded-xl text-sm font-semibold"
              onClick={() => setVisibleBrandCount((count) => count + BRAND_FILTER_STEP)}
            >
              Show {Math.min(BRAND_FILTER_STEP, hiddenBrandCount)} more
            </Button>
          )}

          {!brandsLoading && filterBrands.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              No brands found.
            </p>
          )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Pricing
          {selectedPriceIds.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {selectedPriceIds.length}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {priceFilters.map((filter) => {
            const active = filter.id === "any" ? selectedPriceIds.length === 0 : selectedPriceIds.includes(filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => {
                  if (filter.id === "any") {
                    updatePriceFilters([]);
                    return;
                  }

                  const nextPriceIds = active
                    ? selectedPriceIds.filter((priceId) => priceId !== filter.id)
                    : [...selectedPriceIds, filter.id];
                  updatePriceFilters(nextPriceIds);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-smooth ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{filter.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Truck className="h-4 w-4 text-muted-foreground" />
          Shipping
        </div>
        <div className="space-y-2">
          {shippingFilters.map((option) => {
            const active = selectedShipping === option;
            return (
              <button
                key={option}
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  setSelectedShipping(option);
                  resetProductPage(nextParams);
                  setSearchParams(nextParams);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-smooth ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const handleQuantityChange = (productId: string, newQty: number) => {
    const item = items.find((cartItem) => cartItem.id === productId);
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
    <div className={`min-h-screen bg-background ${isMobile ? "pb-16" : ""}`}>
      {isMobile ? (
        <header className="border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/evercaremed_logo.png"
                alt="Store"
                className="block h-10 w-auto max-w-[120px] object-contain"
              />
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="h-10 w-10 rounded-full bg-muted"
                aria-label="Search products"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFiltersOpen(true)}
                className="h-10 w-10 rounded-full bg-muted"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
      ) : (
        <>
          <Header />
          <MegaMenu />
        </>
      )}

      <main className={isMobile ? "w-full px-2 py-4" : "container py-8"}>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
          {!isMobile && (
            <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold">Filters</h2>
              </div>
              {filterPanel}
            </aside>
          )}

          <section ref={resultsSectionRef}>
            <div
              className={
                isMobile
                  ? "sticky top-0 z-40 -mx-2 mb-4 border-b border-border bg-background/95 px-2 pt-2 shadow-soft backdrop-blur"
                  : "relative mb-4"
              }
            >
              {catalogueScrollState.canScrollLeft && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => scrollCatalogues("left")}
                  className="absolute left-0 top-6 z-10 flex h-9 w-9 rounded-full bg-background/95 shadow-soft"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div
                ref={catalogueScrollerRef}
                onWheel={handleCatalogueWheel}
                onScroll={updateCatalogueScrollState}
                className={`no-scrollbar overflow-x-auto scroll-smooth pb-2 ${
                  catalogueScrollState.canScrollLeft ? "md:pl-11" : "md:pl-0"
                } ${catalogueScrollState.canScrollRight ? "md:pr-11" : "md:pr-0"}`}
              >
                <div className="flex gap-3 pb-1">
                {(cataloguesPending || categoryImagePageQuery.isLoading) &&
                  Array.from({ length: 8 }).map((_, index) => (
                    <CategoryCircleSkeleton key={`category-circle-skeleton-${index}`} />
                  ))}

                {!cataloguesPending && !categoryImagePageQuery.isLoading &&
                  <>
                    <button
                      onClick={selectAllCatalogues}
                      className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
                      aria-label="Show all products"
                    >
                      <span
                        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-muted transition-smooth ${
                          showingAllCategories ? "border-primary shadow-card text-primary" : "border-border text-foreground"
                        }`}
                      >
                        <Package className="h-7 w-7" />
                      </span>
                      <span
                        className={`w-full text-[11px] font-semibold leading-tight ${
                          showingAllCategories ? "text-primary" : "text-foreground"
                        }`}
                      >
                        All
                      </span>
                    </button>
                    {categorySliderItems.map((category) => {
                  const active = selectedCatalogueId === category.catalogueId && selectedCategoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => selectCategory(category.id, category.catalogueId, category.catalogueRoute)}
                      className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
                      aria-label={`Show ${category.name}`}
                    >
                      <span
                        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-muted transition-smooth ${
                          active ? "border-primary shadow-card" : "border-border"
                        }`}
                      >
                        {category.image ? (
                          <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-7 w-7 text-primary" />
                        )}
                      </span>
                      <span
                        className={`w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold leading-tight ${
                          active ? "text-primary" : "text-foreground"
                        }`}
                        title={category.name}
                      >
                        {shortenCategoryName(category.name)}
                      </span>
                    </button>
                  );
                })}
                  </>
                }
                </div>
              </div>
              {catalogueScrollState.canScrollRight && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => scrollCatalogues("right")}
                  className="absolute right-0 top-6 z-10 flex h-9 w-9 rounded-full bg-background/95 shadow-soft"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {productsLoading
                  ? "Loading products..."
                  : totalItems > 0
                    ? `Showing ${pageStart}-${pageEnd} of ${totalItems} products`
                    : "No products found"}
                {!productsLoading && productsFetching ? " · Updating..." : ""}
              </span>
              {!productsLoading && totalPages > 1 ? (
                <span className="shrink-0 font-semibold text-foreground">
                  Page {safeCurrentPage} of {totalPages}
                </span>
              ) : null}
            </div>

            <div
              className={`grid grid-cols-2 gap-2 transition-opacity duration-200 md:grid-cols-3 md:gap-4 xl:grid-cols-4 ${
                isPageChanging || (productsFetching && !productsLoading) ? "opacity-60" : "opacity-100"
              }`}
            >
              {productsLoading &&
                Array.from({ length: 8 }).map((_, index) => (
                  <ProductCardSkeleton key={`product-card-skeleton-${index}`} />
                ))}

              {!productsLoading && visibleProducts.map((product, index) => (
                <ProductCard key={product?.id || product?._id || index} product={product} />
              ))}
            </div>

            {!productsLoading && totalPages > 1 ? (
              <Pagination className="mt-8">
                <PaginationContent className="rounded-full border border-border bg-background/95 px-2 py-1 shadow-soft">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (safeCurrentPage > 1) setProductPage(safeCurrentPage - 1);
                      }}
                      className={safeCurrentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {visiblePageNumbers.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === safeCurrentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          if (pageNumber !== safeCurrentPage) setProductPage(pageNumber);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (safeCurrentPage < totalPages) setProductPage(safeCurrentPage + 1);
                      }}
                      className={safeCurrentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </section>
        </div>
      </main>

      <Footer />

      {isMobile && (
        <>
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-card">
            <div className="grid grid-cols-5">
              {[
                { icon: Home, label: "Home", action: () => navigate("/") },
                { icon: LayoutGrid, label: "Categories", action: () => setCategoriesOpen(true), active: true },
                { icon: ShoppingCart, label: "Cart", badge: count, action: () => setCartOpen(true) },
                { icon: Tag, label: "Offers", action: () => navigate("/offers") },
                { icon: User, label: "Account", action: () => setAccountOpen(true) },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-smooth ${
                      item.active ? "text-primary" : "text-foreground hover:text-primary"
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

          <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 flex flex-col">
              <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Shop by Category
                </SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-4 overflow-y-auto px-4 py-5">
                <button
                  onClick={() => {
                    selectAllCatalogues();
                    setCategoriesOpen(false);
                  }}
                  className="flex flex-col items-center gap-3 rounded-xl bg-muted/50 p-4 text-center transition-colors hover:bg-muted"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <Package className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">All</h3>
                </button>
                {categorySliderItems.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      selectCategory(category.id, category.catalogueId, category.catalogueRoute);
                      setCategoriesOpen(false);
                    }}
                    className="flex flex-col items-center gap-3 rounded-xl bg-muted/50 p-4 text-center transition-colors hover:bg-muted"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-full bg-white shadow-sm">
                      {category.image ? (
                        <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary">
                          <Package className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{category.name}</h3>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl p-0">
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b border-border px-4 py-4 text-left">
                  <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                    Filters
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 py-5">
                  {filterPanel}
                </div>
                <div className="border-t border-border px-4 py-4">
                  <Button className="w-full h-12 rounded-full" onClick={() => setFiltersOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
            <SheetContent
              side="right"
              className="w-full p-0 flex flex-col"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <SheetHeader className="border-b border-border px-4 pb-4 pt-5 text-left">
                <SheetTitle className="text-xl font-bold">Search</SheetTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={modalSearchQuery}
                    onChange={(event) => setModalSearchQuery(event.target.value)}
                    placeholder="Search Ayurvedic products..."
                    className="h-11 rounded-full pl-10"
                  />
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 py-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      {modalNormalizedSearch ? "Search Results" : "All Products"}
                    </h3>
                    <span className="text-xs text-muted-foreground">{modalSearchResults.length} shown</span>
                  </div>

                  {modalSearchPage.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={`listing-search-skeleton-${index}`} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                          <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-4 w-4/5 rounded-full" />
                            <Skeleton className="h-3 w-1/2 rounded-full" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : modalSearchResults.length > 0 ? (
                    modalSearchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSearchOpen(false);
                          setModalSearchQuery("");
                          navigate(`/product/${product.slug ?? product.id}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-soft"
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-16 w-16 rounded-lg object-cover" />
                        ) : (
                          <ImagePlaceholder
                            label={`${product.name} image unavailable`}
                            className="h-16 w-16 shrink-0 rounded-lg"
                            iconClassName="h-6 w-6"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-bold">{product.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{product.category}</p>
                          <p className="mt-1 text-sm font-extrabold text-primary">
                            {money(taxIncludedPriceForProduct(product, product.price))}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
                      <p className="text-sm font-semibold">No products found</p>
                      <p className="mt-1 text-xs text-muted-foreground">Try searching medicines, oils, supplements, or therapy equipment.</p>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent side="bottom" className="h-[90dvh] rounded-t-xl p-0 flex flex-col">
              <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCartOpen(false)}
                  className="h-8 w-8 p-0"
                  aria-label="Close cart"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-bold text-foreground">Shopping Cart</h2>
              </div>

              <ScrollArea className="flex-1 px-3 sm:px-4">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">Your cart is empty</p>
                      <p className="text-sm text-muted-foreground mt-2">Add some delicious items to get started!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-3 sm:space-y-4 sm:py-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-2.5 p-2.5 bg-muted/30 rounded-lg sm:gap-3 sm:p-3">
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
                          <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug">{item.name}</h3>
                          <p className="text-xs text-muted-foreground">{item.weight}</p>
                          {item.shippingAvailable !== true ? (
                            <p className="mt-1 text-xs font-semibold text-destructive">Shipping not available</p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, item.qty - 1)}
                                className="h-6 w-6 p-0"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-7 text-center text-sm font-medium sm:w-8">{item.qty}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, item.qty + 1)}
                                className="h-6 w-6 p-0"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="min-w-fit text-right">
                              <p className="font-semibold text-sm">{money(item.price * item.qty)}</p>
                              {item.mrp > item.price && (
                                <p className="text-xs text-muted-foreground line-through">
                                  {money(item.mrp * item.qty)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(item.id)}
                          className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {items.length > 0 && (
                <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-foreground">{money(total)}</p>
                  </div>
                  <Button
                  onClick={() => {
                    setCartOpen(false);
                    navigate(authHydrated && isLoggedIn ? "/checkout" : "/checkout-login");
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
        </>
      )}
    </div>
  );
};

export default ProductListing;
