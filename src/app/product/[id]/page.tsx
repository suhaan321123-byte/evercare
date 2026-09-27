import { buildPageMetadata, SITE_NAME, SITE_URL, stripHtml } from "@/app/seo";
import { getCatalogueProductDetails } from "@/services/catalogues";
import { ProductDetailsClient } from "./ProductDetailsClient";

type ProductDetailsPageProps = {
  params: {
    id: string;
  };
};

const absoluteUrl = (value?: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed, SITE_URL).toString();
  } catch {
    return undefined;
  }
};

const getProductUrl = (slug: string) => {
  return new URL(
    `/product/${encodeURIComponent(slug)}`,
    SITE_URL
  ).toString();
};

async function getProductJsonLd(productSlug: string) {
  try {
    const { product } = await getCatalogueProductDetails(productSlug);

    const productUrl = getProductUrl(productSlug);

    const images = (
      product.images && product.images.length > 0
        ? product.images
        : [product.image]
    )
      .map(absoluteUrl)
      .filter(Boolean);

    const description =
      stripHtml(product.description) ||
      `Buy ${product.name} online from EvercareMed. View price, availability, delivery, and pickup options.`;

    return {
      "@context": "https://schema.org",
      "@type": "Product",

      // IMPORTANT: this must be the product URL
      "@id": `${productUrl}#product`,

      name: product.name,
      description,
      image: images,

      sku: product.id,

      brand: {
        "@type": "Brand",
        name: product.brand || SITE_NAME,
      },

      category: product.category,

      offers: {
        "@type": "Offer",

        // IMPORTANT: same URL as canonical
        url: productUrl,

        priceCurrency: "INR",
        price: product.price,

        availability:
          product.stockStatus === "Out of Stock"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",

        itemCondition: "https://schema.org/NewCondition",
      },
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: ProductDetailsPageProps) {
  const productSlug = decodeURIComponent(params.id);

  try {
    const { product } =
      await getCatalogueProductDetails(productSlug);

    const description =
      stripHtml(product.description) ||
      `Buy ${product.name} online from EvercareMed. View price, availability, delivery, and pickup options.`;

    // IMPORTANT: build the canonical from the product slug
    const canonicalUrl = getProductUrl(productSlug);

    return {
      ...buildPageMetadata({
        title: product.name,
        description: description.slice(0, 160),
        image: product.image,
        path: `/product/${productSlug}`,
      }),

      // EXPLICIT canonical
      alternates: {
        canonical: canonicalUrl,
      },

      // Optional but useful
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    return {
      ...buildPageMetadata({
        title: "Product Details",
        description:
          "View Ayurvedic medicine, wellness product, and equipment details, prices, stock, delivery, and pickup options from EvercareMed.",
        path: `/product/${productSlug}`,
      }),

      // Don't accidentally canonicalize an invalid product
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function ProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const productSlug = decodeURIComponent(params.id);

  const productJsonLd = await getProductJsonLd(productSlug);

  return (
    <>
      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd),
          }}
        />
      ) : null}

      <ProductDetailsClient />
    </>
  );
}
