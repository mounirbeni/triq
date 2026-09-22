/* ============================================================
   مؤشر ثقة الحساب

   ماشي نفس trustScore() ديال lib/market.ts — هاداك كيقيّم إعلان
   وحيد (الثمن، الوثائق، الصور...). هنا كنقيّمو الحساب كاملاً:
   شحال كمّل من الملف الشخصي، واش موثّق، واش نشيط، وواش الإعلانات
   ديالو نظيفة وبلا بلاغات. توثيق الهوية عامل واحد من بزاف، ماشي
   الوحيد — بحال ما تطلب.

   المجموع 100: الملف 20 + البريد 15 + الهوية 35 + النشاط 10 +
   الإعلانات 15 + البلاغات 5. ماكاينش توثيق الهاتف — المنصة
   ماعندهاش مزوّد SMS، فماكانش عدل نطالبو بحاجة ماكيناش.
   ============================================================ */

import type { Locale } from "./i18n/config";

export type TrustLevel = "low" | "medium" | "high";

export interface UserTrustInput {
  onboarded: boolean;
  hasAvatar: boolean;
  emailVerified: boolean;
  idVerified: boolean;
  /** تاريخ إنشاء الحساب */
  memberSince: Date;
  activeListings: number;
  /** متوسط مؤشر ثقة الإعلانات النشيطة (0-100)، null إلا ماكانش عندو حتى واحد */
  avgListingTrust: number | null;
  /** بلاغات تّحسمات ضد إعلاناته */
  negativeReports: number;
  /** حساب صاحب المنصة — موثوق بطبيعتو، بحال توثيق الهوية اللي كيتفرض ليه تلقائياً فـauth.ts */
  founder?: boolean;
}

export interface UserTrustPart {
  key: string;
  label: string;
  score: number;
  max: number;
  done: boolean;
  /** اقتراح ملموس لرفع النقطة — null إلا كانت مكتملة */
  action: string | null;
}

export interface UserTrustResult {
  score: number;
  level: TrustLevel;
  levelLabel: string;
  parts: UserTrustPart[];
}

const LEVEL_LABEL: Record<TrustLevel, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
};

const LEVEL_LABEL_FR: Record<TrustLevel, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
};

function levelOf(score: number): TrustLevel {
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function userTrustScore(input: UserTrustInput, locale: Locale = "ar"): UserTrustResult {
  const fr = locale === "fr";
  const months = Math.max(
    0,
    (Date.now() - input.memberSince.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );

  const parts: UserTrustPart[] = [
    {
      key: "profile",
      label: fr ? "Profil complété" : "إكمال الملف الشخصي",
      score: (input.onboarded ? 15 : 0) + (input.hasAvatar ? 5 : 0),
      max: 20,
      done: input.onboarded && input.hasAvatar,
      action: !input.onboarded
        ? (fr ? "Complétez les informations de base de votre compte" : "كمّل معلومات حسابك الأساسية")
        : !input.hasAvatar
          ? (fr ? "Ajoutez une photo de profil ou le logo de votre activité" : "أضف صورة شخصية أو شعار النشاط")
          : null,
    },
    {
      key: "email",
      label: fr ? "E-mail confirmé" : "تأكيد البريد الإلكتروني",
      score: input.emailVerified ? 15 : 0,
      max: 15,
      done: input.emailVerified,
      action: input.emailVerified ? null : (fr ? "Confirmez votre adresse e-mail" : "أكّد البريد الإلكتروني ديالك"),
    },
    {
      key: "id",
      label: fr ? "Identité vérifiée" : "توثيق الهوية",
      score: input.idVerified ? 35 : 0,
      max: 35,
      done: input.idVerified,
      action: input.idVerified ? null : (fr ? "Vérifiez votre compte (facultatif) — augmente beaucoup la confiance" : "وثّق حسابك (اختياري) — كيرفع الثقة بزاف"),
    },
    {
      key: "activity",
      label: fr ? "Activité du compte" : "نشاط الحساب",
      score: Math.round(Math.min(10, (months / 12) * 10)),
      max: 10,
      done: months >= 12,
      action: months >= 12 ? null : (fr ? "Continuez à utiliser votre compte — le score augmente avec le temps" : "استمر فاستعمال حسابك — النقطة كتزيد مع الوقت"),
    },
    {
      key: "listings",
      label: fr ? "Qualité des annonces" : "جودة الإعلانات",
      score: input.avgListingTrust != null ? Math.round((input.avgListingTrust / 100) * 15) : 0,
      max: 15,
      done: input.avgListingTrust != null && input.avgListingTrust >= 70,
      action:
        input.avgListingTrust == null
          ? (fr ? "Publiez une annonce complète avec photos et documents" : "انشر إعلاناً كاملاً بصور ووثائق")
          : input.avgListingTrust < 70
            ? (fr ? "Complétez les informations et documents de vos annonces actuelles" : "كمّل معلومات ووثائق إعلاناتك الحالية")
            : null,
    },
    {
      key: "reports",
      label: fr ? "Aucun signalement" : "بلا بلاغات مخالفة",
      score: Math.max(0, 5 - input.negativeReports * 2.5),
      max: 5,
      done: input.negativeReports === 0,
      action: input.negativeReports === 0 ? null : (fr ? "Maintenez des informations exactes et cohérentes dans vos annonces" : "حافظ على معلومات صحيحة ومتناسقة فإعلاناتك"),
    },
  ];

  /* المؤسس (صاحب المنصة) كيبقى ديما 100% — نفس المنطق اللي كيفرض
     ليه توثيق الهوية تلقائياً، ماشي معقول نطالبوه بـ12 شهر نشاط
     ولا إعلانات باش يوصل لثقة كاملة فمنصتو ديالو. */
  const finalParts = input.founder
    ? parts.map((p) => ({ ...p, score: p.max, done: true, action: null }))
    : parts;

  const score = Math.max(
    0,
    Math.min(100, Math.round(finalParts.reduce((s, p) => s + p.score, 0))),
  );
  const level = levelOf(score);

  return { score, level, levelLabel: (fr ? LEVEL_LABEL_FR : LEVEL_LABEL)[level], parts: finalParts };
}
