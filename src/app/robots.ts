import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/* الصفحات الخاصة (dashboard, admin, login...) عندها `robots: { index:
   false }` فmetadata ديالها ماشي هنا — هادشي كيخلي Google يزور
   الصفحة، يقرا noindex، وihidha منها بشكل صحيح. حجبها من هنا زيادة
   (Disallow) كيمنع الزيارة أصلاً، فGoogle ماكيقدرش يقرا noindex —
   وهادشي كيكسر follow:true (login/register) اللي غادي فيها الرابط
   يوصّل الـ«link equity» بلا ما تتفهرس الصفحة نفسها.

   هنا غير المسارات اللي معندهاش صفحة/metadata أصلاً: الـAPI. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
