import type { Metadata, Viewport } from "next";
import FeedbackWidget from "../components/FeedbackWidget";
import "./globals.css";

export const metadata: Metadata = {
  title: "Only Cards — Play Online & Practice Offline",
  description: "Experience premium modern multiplayer card match with glassmorphic layouts, immersive sound synthesis, and clever AIs.",
  icons: {
    icon: "/icon.svg?v=20260824",
    shortcut: "/icon.svg?v=20260824",
    apple: "/icon.svg?v=20260824",
  },
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
        <FeedbackWidget />
      </body>
    </html>
  );
}
