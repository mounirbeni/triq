import type { MetadataRoute } from "next";
import { TOP_CITIES } from "@/lib/cities";
import { GUIDES } from "@/lib/data/guides";
import { brandsOf } from "@/lib/slug";
import { siteUrl } from "@/lib/site";
import { DEFAULT_LOCALE, LOCALES, localePath } from "@/lib/i18n/config";
import { getDealers, getSitemapEntries } from "@/lib/source";

const BASE = siteUrl();

/* كل صفحة عندها نسخة بكل لغة (/ar/... و/fr/...) — بلا هادشي كانت
   الخريطة كتصرّح بروابط بلا بادئة لغة (BASE + المسار) اللي كتحوّل
   (307) لنسخة اللغة عند أول زيارة: Google كيهدر crawl budget فردّيات
   التحويل، والنسخة الفرنسية ماكانتش موجودة فالخريطة أصلاً. دابا كل
   مسار كيعطي رابطين نهائيين (بلا تحويل) مع alternates.languages
   (hreflang) كتربطهم ببعضهم. */
function localized(
  path: string,
  entry: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    LOCALES.map((l) => [l, `${BASE}${localePath(path, l)}`]),
  ) as Record<string, string>;
  languages["x-default"] = `${BASE}${localePath(path, DEFAULT_LOCALE)}`;

  return LOCALES.map((locale) => ({
    ...entry,
    url: `${BASE}${localePath(path, locale)}`,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();

  /* صفحات الماركات كتجي من الكتالوج ماشي من الإعلانات: الصفحة
     موجودة وخدّامة حتى إلا ماكانش فيها إعلان دابا، وGoogle خاصو
     يعرفها من الأول باش تكون مفهرسة ملي تجي السلعة. */
  const carBrandRows = brandsOf("car");
  const motoBrandRows = brandsOf("moto");

  const staticPages = [
    { p: "/", pr: 1 },
    { p: "/cars", pr: 0.95 },
    { p: "/motorcycles", pr: 0.95 },
    { p: "/search", pr: 0.85 },
    { p: "/dealers", pr: 0.8 },
    { p: "/valuation", pr: 0.8 },
    { p: "/cost", pr: 0.75 },
    { p: "/compare", pr: 0.7 },
    { p: "/sell", pr: 0.85 },
    { p: "/promote", pr: 0.7 },
    { p: "/assistant", pr: 0.8 },
    { p: "/inspection", pr: 0.7 },
    { p: "/safety", pr: 0.7 },
    { p: "/guides", pr: 0.8 },
    { p: "/about", pr: 0.5 },
    { p: "/contact", pr: 0.5 },
    { p: "/help", pr: 0.5 },
    { p: "/terms", pr: 0.3 },
    { p: "/privacy", pr: 0.3 },
  ].flatMap(({ p, pr }) => localized(p, { changeFrequency: "daily", priority: pr }));

  const vehicles = entries.flatMap((v) =>
    localized(`/vehicle/${v.slug}`, {
      lastModified: v.lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const carBrands = carBrandRows.flatMap((b) =>
    localized(`/cars/${b.slug}`, { changeFrequency: "daily", priority: 0.65 }),
  );
  const motoBrands = motoBrandRows.flatMap((b) =>
    localized(`/motorcycles/${b.slug}`, { changeFrequency: "daily", priority: 0.65 }),
  );

  const dealers = (await getDealers()).flatMap((d) =>
    localized(`/dealer/${d.slug}`, { changeFrequency: "weekly", priority: 0.6 }),
  );

  const guides = GUIDES.flatMap((g) =>
    localized(`/guides/${g.slug}`, {
      lastModified: new Date(g.updated),
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  /* روابط المدن كتتبنى بمعامل بحث (?city=) وكيبقى canonical
     ديال /cars كيشاور غيرها — ماخاصهاش hreflang ديال صفحة مستقلة،
     غير رابط وحد لكل لغة باش Google يعرف بلي كاينة. */
  const cities = TOP_CITIES.flatMap((c) =>
    LOCALES.map((locale) => ({
      url: `${BASE}${localePath("/cars", locale)}?city=${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.55,
    })),
  );

  return [...staticPages, ...vehicles, ...carBrands, ...motoBrands, ...dealers, ...guides, ...cities];
}
