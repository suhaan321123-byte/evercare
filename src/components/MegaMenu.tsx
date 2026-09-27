import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  useCatalogueGroups,
  useCatalogues,
  useProductBrands,
  type Catalogue,
  type CatalogueGroup,
} from "@/services/catalogues";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND_MENU = "brand-menu";
const CATALOGUE_MENU_PREFIX = "catalogue:";
const DROPDOWN_COLUMN_SIZE = 10;

const isEquipmentCatalogue = (catalogue?: Catalogue) =>
  Boolean(
    catalogue &&
      /equipment|medical device/i.test(
        `${catalogue.name} ${catalogue.route} ${catalogue.slug}`,
      ),
  );

const getCatalogueListingPath = (catalogue: Catalogue, params?: URLSearchParams) => {
  const query = params?.toString();
  const basePath = isEquipmentCatalogue(catalogue) ? "/equipment" : "/products";

  return query ? `${basePath}?${query}` : basePath;
};

const chunkItems = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  );

type MegaMenuProps = {
  initialCatalogues?: Catalogue[];
  initialGroups?: CatalogueGroup[];
  initialBrands?: string[];
};

const MegaMenu = ({ initialCatalogues, initialGroups, initialBrands }: MegaMenuProps) => {
  const shouldFetchCatalogues = initialCatalogues === undefined;
  const shouldFetchGroups = initialGroups === undefined;
  const shouldFetchBrands = initialBrands === undefined;
  const { data: fetchedCatalogues = [], isLoading: cataloguesLoading } = useCatalogues(shouldFetchCatalogues);
  const { data: fetchedGroups = [], isLoading: groupsLoading } = useCatalogueGroups(shouldFetchGroups);
  const { data: fetchedBrands = [], isLoading: brandsLoading } = useProductBrands(undefined, shouldFetchBrands);
  const catalogues = initialCatalogues ?? fetchedCatalogues;
  const groups = initialGroups ?? fetchedGroups;
  const brands = initialBrands ?? fetchedBrands;
  const resolvedCataloguesLoading = shouldFetchCatalogues && cataloguesLoading;
  const resolvedGroupsLoading = shouldFetchGroups && groupsLoading;
  const resolvedBrandsLoading = shouldFetchBrands && brandsLoading;
  const [open, setOpen] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const closeTimer = useRef<number | null>(null);
  const catalogueGroups = groups.slice(0, 5);

  const handleEnter = (name: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ left: rect.left, top: rect.bottom });
    setOpen(name);
  };

  const handleLeave = () => {
    closeTimer.current = window.setTimeout(() => setOpen(null), 120);
  };

  const activeGroup = catalogueGroups.find((group) => group._id === open);
  const activeCatalogue = catalogues.find(
    (catalogue) => `${CATALOGUE_MENU_PREFIX}${catalogue._id}` === open
  );
  const showingBrands = open === BRAND_MENU;
  const activeCategoryMenu = activeCatalogue ?? activeGroup;
  const menuItems = (
    showingBrands
      ? brands
      : activeCategoryMenu?.categories ?? []
  ) as Array<any>;
  const menuColumns = chunkItems(menuItems, DROPDOWN_COLUMN_SIZE);
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const dropdownWidth = Math.min(Math.max(menuColumns.length, 1) * 220 + 16, viewportWidth - 32);
  const getCatalogueForCategory = (category: { _id: string; name: string }) =>
    catalogues.find((catalogue) =>
      catalogue.categories.some((catalogueCategory) =>
        catalogueCategory._id === category._id || catalogueCategory.name === category.name
      )
    );

  return (
    <nav className="sticky top-[81px] z-40 w-full bg-card border-b border-border shadow-soft">
      <div className="site-container">
        <div className="flex items-center whitespace-nowrap">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {resolvedCataloguesLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`catalogue-nav-skeleton-${index}`}
                className="h-4 w-24 shrink-0 animate-pulse rounded-full bg-muted"
              />
            ))}
          {!resolvedCataloguesLoading && catalogues.map((catalogue) => {
            const catalogueMenuId = `${CATALOGUE_MENU_PREFIX}${catalogue._id}`;
            const isOpen = open === catalogueMenuId;
            const catalogueRoute = catalogue.route || catalogue.slug || catalogue.name;
            const catalogueParams = new URLSearchParams({ category: catalogueRoute });

            return (
              <div
                key={catalogueMenuId}
                className="relative shrink-0"
                onMouseEnter={(e) => handleEnter(catalogueMenuId, e)}
                onMouseLeave={handleLeave}
              >
                <Link
                  to={getCatalogueListingPath(catalogue, catalogueParams)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-3 text-sm font-medium whitespace-nowrap transition-smooth border-b-2 border-transparent",
                    isOpen ? "text-primary border-primary" : "text-foreground hover:text-primary"
                  )}
                >
                  {catalogue.name}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </Link>
              </div>
            );
          })}
          {resolvedGroupsLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={`group-menu-skeleton-${index}`} className="h-4 w-24 shrink-0 animate-pulse rounded-full bg-muted" />
            ))}
          {!resolvedGroupsLoading && catalogueGroups.map((group) => (
            <div
              key={group._id}
              className="relative shrink-0"
              onMouseEnter={(e) => handleEnter(group._id, e)}
              onMouseLeave={handleLeave}
            >
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-3 text-sm font-medium whitespace-nowrap transition-smooth border-b-2 border-transparent",
                  open === group._id ? "text-primary border-primary" : "text-foreground hover:text-primary"
                )}
              >
                {group.name}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === group._id && "rotate-180")} />
              </button>
            </div>
          ))}
          <div
            className="relative shrink-0"
            onMouseEnter={(e) => handleEnter(BRAND_MENU, e)}
            onMouseLeave={handleLeave}
          >
            <button
              className={cn(
                "flex items-center gap-1 px-3 py-3 text-sm font-medium whitespace-nowrap transition-smooth border-b-2 border-transparent",
                showingBrands ? "text-primary border-primary" : "text-foreground hover:text-primary"
              )}
            >
              Brand
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showingBrands && "rotate-180")} />
            </button>
          </div>
          <Link
            to="/about-us"
            className="shrink-0 px-3 py-3 text-sm font-medium whitespace-nowrap text-foreground transition-smooth hover:text-primary"
          >
            About us
          </Link>
          <Link
            to="/contact"
            className="shrink-0 px-3 py-3 text-sm font-medium whitespace-nowrap text-foreground transition-smooth hover:text-primary"
          >
            Contact
          </Link>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
            <Link
              to="/prenatal-postnatal-care"
              className="rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold whitespace-nowrap text-primary transition-smooth hover:bg-primary hover:text-primary-foreground"
            >
              Prenatal &amp; Postnatal Care
            </Link>
            <Link
              to="/ayurvedic-tourism"
              className="rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold whitespace-nowrap text-primary transition-smooth hover:bg-primary hover:text-primary-foreground"
            >
              Ayurvedic Tourism
            </Link>
          </div>
        </div>
      </div>

      {open && (activeCatalogue || activeGroup || showingBrands) && pos &&
        createPortal(
          <div
            style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 100, width: dropdownWidth }}
            onMouseEnter={() => {
              if (closeTimer.current) window.clearTimeout(closeTimer.current);
            }}
            onMouseLeave={handleLeave}
            className="max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-b-xl shadow-card animate-fade-in overflow-hidden"
          >
            <div className="p-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1 font-semibold">
                {showingBrands ? "Brands" : activeCategoryMenu?.name}
              </div>
              {activeCategoryMenu && activeCategoryMenu.categories.length > 0 &&
                <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-x-2">
                  {menuColumns.map((column, columnIndex) => (
                    <div key={`category-column-${columnIndex}`} className="space-y-0.5">
                      {column.map((category) => {
                        const catalogue = activeCatalogue ?? getCatalogueForCategory(category);
                        const catalogueRoute = catalogue?.route || catalogue?.slug || catalogue?.name;
                        const params = new URLSearchParams({
                          itemCategory: category._id || category.name,
                          // itemCategory: category.name,
                        });

                        if (catalogueRoute) {
                          params.set("category", catalogueRoute);
                        }

                        return (
                          <Link
                            key={category._id}
                            to={catalogue ? getCatalogueListingPath(catalogue, params) : `/products?${params.toString()}`}
                            className="block px-3 py-2 text-sm rounded-md hover:bg-muted hover:text-primary transition-smooth"
                          >
                            {category.name}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>}
              {activeCategoryMenu && activeCategoryMenu.categories.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No categories found</div>
              )}
              {showingBrands &&
                resolvedBrandsLoading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`brand-menu-skeleton-${index}`}
                    className="mx-3 my-2 h-4 animate-pulse rounded-full bg-muted"
                  />
                ))}
              {showingBrands &&
                !resolvedBrandsLoading &&
                <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-x-2">
                  {menuColumns.map((column, columnIndex) => (
                    <div key={`brand-column-${columnIndex}`} className="space-y-0.5">
                      {column.map((brand) => (
                        <Link
                          key={brand}
                          to={`/products?brand=${encodeURIComponent(brand)}`}
                          className="block px-3 py-2 text-sm rounded-md hover:bg-muted hover:text-primary transition-smooth"
                        >
                          {brand}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>}
              {showingBrands && !resolvedBrandsLoading && brands.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No brands found</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
};

export default MegaMenu;
