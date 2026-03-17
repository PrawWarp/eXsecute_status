import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eXsecute Status",
  description: "Service status and uptime monitoring for eXsecute",
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
