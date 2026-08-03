import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  // Fewer weights = faster first paint (especially over tunnel / mobile)
  weight: ["400", "500", "600", "700"],
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
