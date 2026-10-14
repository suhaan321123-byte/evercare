"use client";

import { ClientRoute } from "@/app/ClientRoute";
import CatalogueDirectory, { type BrandDirectoryGroup } from "@/views/pages/CatalogueDirectory";
import type { Catalogue } from "@/services/catalogues";

export function BrandsClient({
  catalogues,
  brandGroups,
}: {
  catalogues: Catalogue[];
  brandGroups: BrandDirectoryGroup[];
}) {
  return (
    <ClientRoute>
      <CatalogueDirectory type="brands" catalogues={catalogues} brandGroups={brandGroups} />
    </ClientRoute>
  );
}
