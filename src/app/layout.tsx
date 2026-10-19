import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// PLACEHOLDER fonts until Oblique's brand fonts arrive.
const sans = Geist({ variable: "--font-sans-brand", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono-brand", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://play.obliqueconsult.com"),
  title: "UAE Tax Learning Game · by Oblique",
  description: "Spot what's right or off on UAE tax documents, one shift at a time. A free learning game by Oblique.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
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
