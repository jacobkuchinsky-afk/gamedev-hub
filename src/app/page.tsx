import type { Metadata } from "next";
import LandingPage from "./LandingPage";

export const metadata: Metadata = {
  title: "GameForge - Build Games Better",
  description:
    "The AI-powered productivity platform for game developers. 200+ AI features, 23 tools, free forever.",
  openGraph: {
    title: "GameForge - Build Games Better",
    description:
      "The AI-powered productivity platform for game developers. 200+ AI features, 23 tools, free forever.",
    type: "website",
    url: "https://gamedev-hub.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "GameForge - Build Games Better",
    description:
      "The AI-powered productivity platform for game developers. 200+ AI features, 23 tools, free forever.",
  },
};

export default function Home() {
  return <LandingPage />;
}
