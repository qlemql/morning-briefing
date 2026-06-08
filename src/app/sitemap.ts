import type { MetadataRoute } from 'next';
import { ServerCache } from '@/lib/server-cache';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://morning-briefing-mocha.vercel.app';
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/?category=economy`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2026-03-25'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 동적 archive 날짜 페이지들 — SEO 자동 인덱싱용
  let archiveEntries: MetadataRoute.Sitemap = [];
  try {
    const econ = await ServerCache.listArchiveDates('economy', 365);
    const allDates = Array.from(new Set(econ))
      .sort((a, b) => b.localeCompare(a));

    archiveEntries = allDates.map((date) => ({
      url: `${baseUrl}/archive/${date}`,
      lastModified: new Date(`${date}T06:50:00+09:00`),
      changeFrequency: 'never' as const,
      priority: 0.6,
    }));
  } catch {
    // sitemap 생성 시 Redis 미연결이어도 정적 entries는 노출
  }

  return [...staticEntries, ...archiveEntries];
}
