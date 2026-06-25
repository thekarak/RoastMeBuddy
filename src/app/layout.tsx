// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoastMeBuddy! — AI Product Audit",
  description:
    "Drop in a URL or screenshot. Get a brutally honest AI teardown of your product or portfolio — scored, prioritised, and shareable.",
  openGraph: {
    title: "RoastMeBuddy! — AI Product Audit",
    description: "Your product, roasted before the market does it for free.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
