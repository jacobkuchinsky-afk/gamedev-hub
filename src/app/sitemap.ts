import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://gamedev-hub.vercel.app";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/forgot-password`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/dashboard/tools`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/dashboard/projects`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/dashboard/devlog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/dashboard/settings`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
}
