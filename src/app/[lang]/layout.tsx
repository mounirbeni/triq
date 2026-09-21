import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic, Space_Grotesk } from "next/font/google";
import "../globals.css";
import { DEFAULT_LOCALE, DIR, HTML_LANG, isLocale, localePath, LOCALES, type Locale } from "@/lib/i18n/config";
import { dictionaryOf } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { AppProvider } from "@/store/app";
import { SessionProvider } from "@/store/session";
import { getCurrentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/db/chat";
import { Header, MobileNav } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CompareBar } from "@/components/CompareBar";
import { PwaRegister } from "@/components/PwaRegister";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Tour } from "@/components/Tour";
import { absoluteUrl, localeAlternates, siteUrl } from "@/lib/site";
import { jsonLdHtml } from "@/lib/jsonLd";

/** نص المتن */
const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

/** العناوين — كوفي معماري يعطي الهوية المغربية */
const kufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["500", "700", "800"],
  variable: "--font-kufi",
  display: "swap",
});

/** الأرقام والنصوص اللاتينية */
const num = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-num",
  display: "swap",
});

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  const m = t.siteMeta;
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: m.title,
      template: locale === "fr" ? "%s · Tarique" : "%s · طريق Tarique",
    },
    description: m.description,
    keywords: m.keywords,
    alternates: localeAlternates("/", locale),
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_MA" : "ar_MA",
      alternateLocale: locale === "fr" ? "ar_MA" : "fr_MA",
      siteName: "Tarique",
      title: m.title,
      description: m.ogDescription,
      images: [{ url: "/hero-vehicles.webp", width: 1774, height: 887, alt: m.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.ogDescription,
      images: ["/hero-vehicles.webp"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    /* ملي كيتزاد للشاشة الرئيسية فiOS: بلا شريط سفاري، وباسم مختصر */
    appleWebApp: {
      capable: true,
      title: m.appleTitle,
      statusBarStyle: "black-translucent",
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
  };
}

/**
 * Organization وWebSite — كتعرّف لجوجل بلي «طريق» كيان واحد عبر كل
 * اللغات، وSearchAction كتفتح الباب لصندوق بحث فنتائج البحث (sitelinks
 * search box) كيوجّه مباشرة لصفحة السيارات مع نتيجة البحث.
 */
function organizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl()}/#organization`,
        name: "Tarique",
        alternateName: "طريق",
        url: siteUrl(),
        /* Google كيرفض SVG فـLogo rich result — لازم راستر */
        logo: absoluteUrl("/icons/icon-512.png"),
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        name: "Tarique",
        url: siteUrl(),
        publisher: { "@id": `${siteUrl()}/#organization` },
        inLanguage: [HTML_LANG[locale]],
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${absoluteUrl(localePath("/cars", locale))}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#071426" },
    { media: "(prefers-color-scheme: light)", color: "#0a1e3d" },
  ],
  width: "device-width",
  initialScale: 1,
  // بلا هادشي المحتوى ماكيتمدّش تحت الـnotch/الجزيرة الديناميكية
  // ملي التطبيق مزاد للشاشة الرئيسية — كيبقى فراغ أبيض فوق وتحت
  viewportFit: "cover",
};

/** يمنع وميض الوضع الفاتح/الداكن قبل التحميل */
const themeScript = `(function(){try{var s=localStorage.getItem('triq:v1');var t=s?JSON.parse(s).theme:'dark';document.documentElement.setAttribute('data-theme',t||'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

/** كل لغة كتّبنى ساكنة — بلاها المسار الجذري كيبقى ديناميكي بلا داعي */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await dictionaryOf(lang);

  // الجلسة كتتقرا من الكوكي فالخادم — هي المصدر الوحيد للحقيقة
  const user = await getCurrentUser();
  const unread = user ? await unreadCount(user.id).catch(() => 0) : 0;

  return (
    <html lang={HTML_LANG[lang]} dir={DIR[lang]} data-theme="dark" className={`${body.variable} ${kufi.variable} ${num.variable}`}>
      <head>
        {/* Next كيصيفط mobile-web-app-capable وحدو؛ آيفون قبل iOS 16.4
            كيقرا غير هاد الوسم القديم باش يفتح بلا شريط سفاري */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(organizationJsonLd(lang)) }}
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <I18nProvider dict={dict} locale={lang}>
        <SessionProvider user={user} unread={unread}>
        <AppProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:end-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--brand)] focus:px-4 focus:py-2 focus:font-bold focus:text-[var(--brand-ink)]"
          >
            {dict.nav.skipToContent}
          </a>
          <Header />
          <InstallPrompt />
          <main id="main" className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
            {children}
          </main>
          <Footer />
          <CompareBar />
          <MobileNav />
          <PwaRegister />
          <Tour />
        </AppProvider>
        </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
