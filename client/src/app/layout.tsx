import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Only Cards — Play Online & Practice Offline",
  description: "Experience premium modern multiplayer card match with glassmorphic layouts, immersive sound synthesis, and clever AIs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#050508" }}>
        {children}
      </body>
    </html>
  );
}
