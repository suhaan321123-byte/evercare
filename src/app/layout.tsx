import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./index.css";
import { AppProviders } from "@/app/providers";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
} from "@/app/seo";
import { UnderConstruction } from "@/app/UnderConstruction";
import { GA_ALLOWED_HOSTS, GA_MEASUREMENT_ID } from "@/lib/analytics";
import { isMobileDevice } from "@/utils/userAgent/userAgent";
import { headers } from "next/headers";
import { getCachedPublishedWebsitePage } from "@/lib/cache/websitePageServerCache";
import CatalogueItemDetailsChatWidget from "@/components/website/widget/chatWidget/defaultChatWidgetUi/catalogueItemDetailsChatWidget";
import { ACCOUNT_TYPE_ID } from "@/services/catalogues";

const underConstructionEnabled =
  process.env.UNDER_CONSTRUCTION === "true" ||
  process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === "true";
const analyticsEnabledForBuild =
  process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID);

const GTM_ID = "GTM-5CGXJ69B";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Ayurvedic medicines online",
    "Ayurvedic wellness products",
    "Ayurvedic healthcare equipment",
    "Ayurvedic therapy essentials",
    "natural wellness products",
    "authentic Ayurveda products",
    "EvercareMed",
  ],
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/evercaremed_logo.png",
  },
  robots: underConstructionEnabled
    ? {
        index: false,
        follow: false,
      }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#7e2529",
  width: "device-width",
  initialScale: 1,
};

async function getHomePageData() {
  try {
    const response = await getCachedPublishedWebsitePage({
      params: {
        customRoute: "/",
        callingPage: "home",
      },
    });

    if (response?.message === "success") {
      return { ...response };
    }
    return null;
  } catch (error) {
    console.error("Error fetching home page data:", error);
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isMobile = isMobileDevice(userAgent);

  const pageDetailsData = await getHomePageData();
  const { websitePage, installedWidgets } = pageDetailsData || {};

  const pageDetails = websitePage || {};
  const baseUrl = ``;
  const chatWidget = installedWidgets?.find((w) => w.type === "chatWidget");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
        {/* End Google Tag Manager */}
      </head>
      <body className={`antialiased`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        {/* Google Analytics */}
        {analyticsEnabledForBuild ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                (function () {
                  var measurementId = ${JSON.stringify(GA_MEASUREMENT_ID)};
                  var allowedHosts = ${JSON.stringify(GA_ALLOWED_HOSTS)};
                  var hostname = window.location.hostname.toLowerCase();

                  if (!measurementId || allowedHosts.indexOf(hostname) === -1) {
                    return;
                  }

                  window.dataLayer = window.dataLayer || [];
                  window.gtag = function gtag(){window.dataLayer.push(arguments);};
                  window.gtag('js', new Date());
                  window.gtag('config', measurementId, { send_page_view: false });
                })();
              `}
            </Script>
          </>
        ) : null}

        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xriibeoh71");
          `}
        </Script>

        {underConstructionEnabled ? (
          <UnderConstruction />
        ) : (
          <AppProviders>
            {children}

            {chatWidget && (
              <CatalogueItemDetailsChatWidget
                viewMode={isMobile ? "mobile" : "desktop"}
                widgetData={chatWidget}
                allowedAllActions={true}
                defaultWidgetOpen={false}
                userId={pageDetails?.userId || chatWidget?.userId}
                accountTypeId={ACCOUNT_TYPE_ID}
                baseUrl={baseUrl}
              />
            )}
          </AppProviders>
        )}
      </body>
    </html>
  );
}
