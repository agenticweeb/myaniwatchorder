import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// AI Optimization (AIO) Schema Graph
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myaniwatchorder-zeta.vercel.app";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": "MyAniWatchOrder",
      "url": siteUrl,
      "logo": `${siteUrl}/logo.png`,
      "sameAs": [
        "https://x.com/agenticweeb",
        "https://github.com/agenticweeb/chronoflow"
      ]
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "MyAniWatchOrder",
      "publisher": { "@id": `${siteUrl}/#organization` },
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${siteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      "url": siteUrl,
      "name": "MyAniWatchOrder Anime Watch Order Generator",
      "applicationCategory": "EntertainmentApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": `${siteUrl}/#organization` }
    }
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MyAniWatchOrder — Anime Watch Order Engine",
    template: "%s · MyAniWatchOrder",
  },
  description:
    "Generate spoiler-safe, AI-curated anime watch orders for any franchise. Skip filler, calculate exact finish dates, and map complex timelines like Fate, Monogatari, and Gundam in seconds.",
  applicationName: "MyAniWatchOrder",
  authors: [{ name: "agenticweeb", url: "https://x.com/agenticweeb" }],
  keywords: [
    "anime watch order",
    "Fate watch order",
    "Monogatari order",
    "filler skip guide",
    "anime timeline",
    "MyAniWatchOrder",
  ],
  openGraph: {
    type: "website",
    title: "MyAniWatchOrder — Never Watch Anime In The Wrong Order Again",
    description:
      "The ultimate grounded watch-order engine. AI-powered pathfinding, relation graph mapping, and smart skip for any anime franchise.",
    siteName: "MyAniWatchOrder",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    creator: "@agenticweeb",
    title: "MyAniWatchOrder — Anime Watch Order Engine",
    description:
      "Spoiler-safe paths, smart skip, and real finish dates for any franchise.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030306" },
    { media: "(prefers-color-scheme: light)", color: "#030306" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`}>
      <body className="bg-background text-foreground min-h-dvh relative overflow-x-hidden font-sans selection:bg-chrono-primary/30 selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="fixed inset-0 kinetic-grid pointer-events-none z-0" aria-hidden="true" />
        <div className="fixed top-[-15%] left-[-10%] w-[55vw] h-[55vw] max-w-[640px] rounded-full bg-chrono-primary/10 blur-[120px] pointer-events-none z-0" aria-hidden="true" />
        <div className="fixed bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] max-w-[560px] rounded-full bg-chrono-accent/5 blur-[110px] pointer-events-none z-0" aria-hidden="true" />
        
        <div className="relative z-10">
          <NuqsAdapter>
            <Providers>{children}</Providers>
          </NuqsAdapter>
        </div>
        
        {/* Microsoft Clarity (Free Heatmaps & Traffic) */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "ym5c0vm1qc");
            `
          }}
        />
      </body>
    </html>
  );
}
