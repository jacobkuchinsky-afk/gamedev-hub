import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GameForge - Game Development Productivity Platform",
  description:
    "Build games better with GameForge. Sprite editor, sound generator, dialogue builder, project management, and 13+ game dev tools in one place.",
  keywords: [
    "game development",
    "gamedev tools",
    "sprite editor",
    "game design",
    "project management",
  ],
  openGraph: {
    title: "GameForge",
    description: "The productivity platform built for game developers.",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
