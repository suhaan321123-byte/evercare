import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import MegaMenu from "@/components/MegaMenu";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { usePagedOfferProducts } from "@/services/catalogues";
import { sortOutOfStockLast } from "@/data/catalog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Tag } from "lucide-react";

const PRODUCTS_PER_PAGE = 24;

const byNewestCreated = (a: { createdAt?: string }, b: { createdAt?: string }) =>
  new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

const isOfferProduct = (product: { mrp: number; price: number; hasBogoOffer?: boolean }) =>
  product.mrp > product.price || Boolean(product.hasBogoOffer);

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

const Offers = () => {
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const productPageQuery = usePagedOfferProducts({
    page: currentPage,
    limit: PRODUCTS_PER_PAGE,
    sortBy: "newest",
  });

  const productsLoading = productPageQuery.isLoading;
  const productsFetching = productPageQuery.isFetching;
  const offerProducts = useMemo(
    () => sortOutOfStockLast((productPageQuery.data?.products ?? []).filter(isOfferProduct).sort(byNewestCreated)),
    [productPageQuery.data?.products]
  );
  const pagination = productPageQuery.data?.pagination;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const totalItems = pagination?.totalItems ?? offerProducts.length;

  useEffect(() => {
    if (productsLoading) return;
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, productsLoading, totalPages]);

  const visiblePageNumbers = useMemo(() => {
    const windowSize = isMobile ? 3 : 5;
    const halfWindow = Math.floor(windowSize / 2);
    const start = Math.max(1, Math.min(safeCurrentPage - halfWindow, totalPages - windowSize + 1));
    const end = Math.min(totalPages, start + windowSize - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [isMobile, safeCurrentPage, totalPages]);

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
            <div>
              <h1 className="text-xl font-bold leading-none">Offers</h1>
              <p className="mt-1 text-xs text-muted-foreground">Sale and BOGO products</p>
            </div>
          </div>
        </header>
      ) : (
        <>
          <Header />
          <MegaMenu />
        </>
      )}

      <main className={isMobile ? "px-3 py-5" : "container py-8"}>
        <div className="mb-6 hidden items-center justify-between gap-4 md:flex">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Tag className="h-4 w-4 text-primary" />
              Sale price and BOGO offers
            </div>
            <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">Offers</h1>
          </div>
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>

        {!productsLoading && totalItems > 0 && (
          <div className="mb-4 text-sm text-muted-foreground">
            {totalItems} offer product{totalItems === 1 ? "" : "s"} found
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          {(productsLoading || productsFetching) &&
            Array.from({ length: 12 }).map((_, index) => (
              <ProductCardSkeleton key={`offers-skeleton-${index}`} />
            ))}
          {!productsLoading &&
            !productsFetching &&
            offerProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>

        {!productsLoading && !productsFetching && offerProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-lg font-bold text-foreground">No offers available</p>
            <p className="mt-2 text-sm text-muted-foreground">Sale and BOGO products will appear here when available.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent className="rounded-full border border-border bg-background/95 px-2 py-1 shadow-soft">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={safeCurrentPage <= 1}
                    className={safeCurrentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      if (safeCurrentPage <= 1) return;
                      setCurrentPage(safeCurrentPage - 1);
                    }}
                  />
                </PaginationItem>

                {visiblePageNumbers.map((pageNumber) => (
                  <PaginationItem key={`offers-page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === safeCurrentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={safeCurrentPage >= totalPages}
                    className={safeCurrentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      if (safeCurrentPage >= totalPages) return;
                      setCurrentPage(safeCurrentPage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Offers;
