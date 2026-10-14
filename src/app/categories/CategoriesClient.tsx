"use client";

import { ClientRoute } from "@/app/ClientRoute";
import CatalogueDirectory from "@/views/pages/CatalogueDirectory";
import type { Catalogue } from "@/services/catalogues";

export function CategoriesClient({
  catalogues,
  visibleCatalogues,
}: {
  catalogues: Catalogue[];
  visibleCatalogues: Catalogue[];
}) {
  return (
    <ClientRoute>
      <CatalogueDirectory
        type="categories"
        catalogues={catalogues}
        visibleCatalogues={visibleCatalogues}
      />
    </ClientRoute>
  );
}
