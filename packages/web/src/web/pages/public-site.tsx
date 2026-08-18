import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteRenderer } from "../site/renderer";
import { DEFAULT_THEME, BUSINESS_CATEGORIES } from "../../shared/site-model";
import { trackView, trackEvent } from "../lib/track";
import { applySiteSeo } from "../lib/seo";

export default function PublicSite() {
  const params = useParams<{ slug: string; kind?: string }>();
  const [, navigate] = useLocation();
  const slug = params.slug;
  const kind = params.kind ?? "home";

  const { data, isLoading, error } = useQuery({
    queryKey: ["site", slug],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${slug}`);
      if (!res.ok) throw new Error("not found");
      return (await res.json()) as any;
    },
  });

  useEffect(() => {
    if (data?.site) trackView(slug, kind);
  }, [data?.site, slug, kind]);

  useEffect(() => {
    const site = data?.site;
    if (!site) return;
    const pageTitle = (data.pages ?? []).find((p: any) => p.kind === kind)?.title ?? null;
    applySiteSeo({
      slug,
      businessName: site.businessName,
      categoryLabel: BUSINESS_CATEGORIES.find((c) => c.value === site.businessCategory)?.label ?? "店舗",
      tagline: site.tagline,
      about: site.about,
      address: site.address,
      phone: site.phone,
      hours: site.hours,
      heroImageKey: site.heroImageKey,
      pageTitle,
      rating: site.placeData?.rating,
      userRatingCount: site.placeData?.userRatingCount,
    });
  }, [data, slug, kind]);

  if (isLoading) return <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-400 text-sm">読み込み中…</div>;
  if (error || !data?.site) return <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-400 text-sm">サイトが見つかりません</div>;

  const { site, pages } = data;
  const page = pages.find((p: any) => p.kind === kind) ?? pages[0];
  if (!page) return <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-400 text-sm">まだ生成が完了していません</div>;

  return (
    <SiteRenderer
      theme={site.theme ?? DEFAULT_THEME}
      blocks={page.blocks}
      businessName={site.businessName}
      phone={site.phone}
      instagramUrl={site.instagramUrl}
      facebookUrl={site.facebookUrl}
      tiktokUrl={site.tiktokUrl}
      place={site.placeData ?? null}
      pages={pages.map((p: any) => ({ kind: p.kind, title: p.title }))}
      activeKind={page.kind}
      slug={slug}
      onNavigate={(k) => navigate(k === "home" ? `/s/${slug}` : `/s/${slug}/${k}`)}
      onTrack={(type) => trackEvent(slug, type)}
    />
  );
}
