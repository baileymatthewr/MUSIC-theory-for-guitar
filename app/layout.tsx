import type { Metadata } from "next";
import SiteNav from "@/components/site/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fretboard Tools", template: "%s · Fretboard Tools" },
  description: "Guitar tools: a chord box maker and Barry Harris's diminished scales on the fretboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
