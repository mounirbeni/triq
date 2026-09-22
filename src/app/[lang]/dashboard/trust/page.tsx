import type { Metadata } from "next";
import { Link } from "@/components/Link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDealerOfSeller, getSellerStats } from "@/lib/source";
import { userTrustScore } from "@/lib/userTrust";
import { userBadges } from "@/lib/userBadges";
import { dictionaryOf, getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n/config";
import { DashboardShell } from "@/components/dashboard/Shell";
import { TrustRing } from "@/components/TrustBadge";
import {
  ArrowLeft, BadgeCheck, Check, Close, IdCard, Mail, Phone, ShieldCheck,
} from "@/components/icons";

export async function generateMetadata({
  params,
}: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await dictionaryOf(locale);
  return { title: t.trustPage.metaTitle, robots: { index: false, follow: false } };
}

export default async function TrustCenterPage() {
  const t = await getDictionary();
  const locale = await getLocale();
  const p = t.trustPage;
  const user = await getCurrentUser();
  if (!user) redirect(localePath("/login?next=/dashboard/trust", locale));

  const [stats, dealer] = await Promise.all([
    getSellerStats(user.id),
    getDealerOfSeller(user.id),
  ]);

  const result = userTrustScore({
    onboarded: user.onboarded,
    hasAvatar: Boolean(user.avatar_url),
    emailVerified: user.email_verified,
    idVerified: user.id_verified,
    memberSince: new Date(user.member_since),
    activeListings: stats.activeListings,
    avgListingTrust: stats.avgTrust,
    negativeReports: stats.negativeReports,
    founder: user.founder,
  }, locale);

  const badges = userBadges({
    idVerified: user.id_verified,
    type: user.type,
    dealerVerified: Boolean(dealer?.verified),
    trustLevel: result.level,
  });

  return (
    <DashboardShell title={p.title}>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* الملخص */}
        <div className="card flex flex-col items-center p-6 text-center lg:sticky lg:top-[84px] lg:h-fit">
          <TrustRing score={result.score} grade={result.levelLabel} size={120} stroke={10} />
          <p className="mt-4 text-[13px] font-bold">{p.currentScore}</p>
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--text-dim)" }}>
            <span className="num font-bold" style={{ color: "var(--brand)" }}>{result.score}%</span> · {p.levelPrefix} {result.levelLabel}
          </p>

          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {badges.map((b) => (
                <span
                  key={b.key}
                  className="chip"
                  style={{ background: `color-mix(in oklab, ${b.color} 14%, transparent)`, color: b.color, borderColor: "transparent" }}
                >
                  <b.Icon size={12} /> {t.badge[b.key as keyof typeof t.badge]}
                </span>
              ))}
            </div>
          )}

          {!user.onboarded && (
            <Link href="/dashboard/complete-profile?next=/dashboard/trust" className="btn btn-primary btn-sm mt-5 w-full">
              {p.completeProfile} <ArrowLeft size={14} className="dir-flip" />
            </Link>
          )}
        </div>

        <div className="space-y-5">
          {/* حالة التحقق السريعة */}
          <section className="card p-5">
            <h2 className="mb-4 text-[14px] font-bold">{p.accountStatusTitle}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { Icon: Mail, label: p.email, done: user.email_verified, hint: p.emailHint },
                { Icon: Phone, label: p.phone, done: Boolean(user.phone), hint: user.phone ? p.phoneSaved : p.phoneHintMissing },
                { Icon: IdCard, label: p.idVerification, done: user.id_verified, hint: user.id_verified ? p.idVerified : p.idOptional },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2.5 rounded-xl border p-3"
                  style={{ borderColor: s.done ? "var(--good)" : "var(--line-soft)", background: s.done ? "var(--good-soft)" : "var(--surface-3)" }}
                >
                  <s.Icon size={17} style={{ color: s.done ? "var(--good)" : "var(--text-dim)" }} />
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-bold">{s.label}</p>
                    <p className="truncate text-[10px]" style={{ color: "var(--text-dim)" }}>{s.hint}</p>
                  </div>
                  {s.done ? (
                    <Check size={15} className="me-auto shrink-0" style={{ color: "var(--good)" }} />
                  ) : (
                    <Close size={15} className="me-auto shrink-0" style={{ color: "var(--text-dim)" }} />
                  )}
                </div>
              ))}
            </div>
            <Link href="/dashboard/settings" className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color: "var(--brand)" }}>
              {p.editAccount} <ArrowLeft size={12} className="dir-flip" />
            </Link>
          </section>

          {/* التفصيل */}
          <section className="card p-5">
            <h2 className="mb-1 text-[14px] font-bold">{p.raiseTrustTitle}</h2>
            <p className="mb-4 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
              {p.raiseTrustLead}
            </p>
            <div className="space-y-2.5">
              {result.parts.map((part) => (
                <div key={part.key} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--surface-3)" }}>
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: part.done ? "var(--good-soft)" : "var(--surface-1)", color: part.done ? "var(--good)" : "var(--text-dim)" }}
                  >
                    {part.done ? <Check size={15} /> : <Close size={15} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold">{part.label}</span>
                      <span className="num text-[11px]" style={{ color: "var(--text-dim)" }}>{part.score}/{part.max}</span>
                    </div>
                    {part.action && (
                      <p className="mt-0.5 text-[10.5px]" style={{ color: "var(--text-dim)" }}>{part.action}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className="card flex items-start gap-3 p-5"
            style={{ background: "var(--brand-soft)", borderColor: "transparent" }}
          >
            <ShieldCheck size={20} className="mt-0.5 shrink-0" style={{ color: "var(--brand)" }} />
            <div>
              <h3 className="text-[13px] font-bold">{p.privacyTitle}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {p.privacyText}
              </p>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
