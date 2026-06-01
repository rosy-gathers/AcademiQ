import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AcademiQ — Study smarter in Bengali & English",
  description: "AI academic copilot for South Asian university students",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-base text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
