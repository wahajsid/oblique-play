import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/supabase/config";
import "./globals.css";

// Satoshi is Oblique's typeface (free under the ITF Free Font License, from Fontshare).
const sans = localFont({
  variable: "--font-sans-brand",
  display: "swap",
  src: [
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
});
// Used for TRNs and invoice numbers on documents.
const mono = Geist_Mono({ variable: "--font-mono-brand", subsets: ["latin"] });

export const metadata: Metadata = {
  // Link previews use the address the game is served from (the live site or a test copy).
  metadataBase: new URL(siteUrl),
  title: "UAE Tax Learning Game · by Oblique",
  description: "Think you know UAE tax? 20 new Corporate Tax and VAT questions every day, plus one document to check. Free, by Oblique.",
  // What LinkedIn and WhatsApp show for the main link. Pages with their own
  // preview (challenges, certificates, spot the error) replace this.
  openGraph: {
    title: "Think you know UAE tax? Prove it in 3 minutes.",
    description: "20 new Corporate Tax and VAT questions every day, plus one document to check. Free, by Oblique.",
    siteName: "Oblique",
    type: "website",
    images: [{ url: "/card", width: 1200, height: 630, alt: "UAE Tax Learning Game by Oblique" }],
  },
  twitter: { card: "summary_large_image", images: ["/card"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">{children}</div>
      </body>
    </html>
  );
}
