import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted so production builds never need network access to Google Fonts
// (turbopack Docker builds fail resolving the internal google-font module offline).
const outfit = localFont({
  src: "./fonts/Outfit-Variable-latin.woff2",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beer Game Sprint: The Retailer Challenge",
  description:
    "Single-player supply-chain decision challenge — manage a retailer, balance inventory and backlog, beat the heat.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eff2f4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full min-h-dvh flex flex-col overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
