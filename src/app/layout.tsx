import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eXsecute Status",
  description: "Service status and uptime monitoring for eXsecute",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "eXsecute Status",
    description: "Service status and uptime monitoring for eXsecute",
    siteName: "eXsecute Status",
    type: "website",
  },
  other: {
    "theme-color": "#003d7a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
