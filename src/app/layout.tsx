import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iceland — Ring Road",
  description: "2–10 October 2026. Route, stops and what's near the road.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf1f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1114" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
          <main className="flex-1 pb-13">{children}</main>
          <Nav />
          <ServiceWorker />
        </div>
      </body>
    </html>
  );
}
