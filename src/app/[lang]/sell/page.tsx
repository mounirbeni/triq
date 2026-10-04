import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SellWizard } from "@/components/SellWizard";
import { Coins } from "@/components/icons";
import { dictionaryOf, getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/site";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return {
    title: t.sellPage.metaTitle,
    description: t.sellPage.metaDesc,
    alternates: localeAlternates("/sell", locale),
  };
}

export default async function SellPage() {
  /* الزائر الغير مسجّل يقدر يعمّر الفورمير ويشوف الثمن المقترح —
     التسجيل مطلوب غير فآخر خطوة (publish). ولكن المسجّل بملف
     ناقص خاصو يكمّل قبل، حيت الإعلان بلا رقم ولا مدينة حقيقية
     ماكيخدمش لا للبائع لا للمشتري. */
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (user && !user.onboarded) redirect(localePath("/dashboard/complete-profile?next=/sell", locale));
  const t = await getDictionary();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <span className="eyebrow"><Coins size={13} /> {t.sellPage.eyebrow}</span>
        <h1 className="h-page mt-4">{t.sellPage.title}</h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t.sellPage.lead}
        </p>
      </header>
      <SellWizard />
    </div>
  );
}
