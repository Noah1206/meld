"use client";

import Link from "next/link";
import { ArrowLeft, Atom } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    back: "Home",
    title: "Refund Policy",
    lastUpdated: "Last updated: March 24, 2026",

    intro:
      "This Refund Policy explains how refunds are handled for paid subscriptions to Meld. We want you to be satisfied with our Service, and we strive to be fair and transparent.",

    s1Title: "1. Free Tier",
    s1Body:
      "The Free tier is offered at no cost and does not require payment. No refund applies to the Free tier.",

    s2Title: "2. Pro Subscription Refunds",
    s2Sub1: "Within 7 Days of Purchase",
    s2Sub1Body:
      "If you are not satisfied with Meld Pro, you may request a full refund within 7 days of your initial purchase. This applies to first-time Pro subscribers only.",
    s2Sub2: "After 7 Days",
    s2Sub2Body:
      "After the 7-day window, refunds are generally not provided. However, we may consider refunds on a case-by-case basis for extenuating circumstances such as:",
    s2Sub2Items: [
      "Service was significantly unavailable during the billing period",
      "A critical feature was removed without notice",
      "Billing errors or unauthorized charges",
    ],

    s3Title: "3. Annual Subscription Refunds",
    s3Body:
      "For annual subscriptions, you may request a prorated refund within 30 days of purchase. After 30 days, we will provide a prorated refund for the remaining unused months if you contact us before the next billing cycle.",

    s4Title: "4. How to Request a Refund",
    s4Body: "To request a refund:",
    s4Steps: [
      "Send an email to support@meld.dev with the subject line \"Refund Request\"",
      "Include your GitHub username and the email associated with your account",
      "Describe the reason for your refund request",
      "We will respond within 3 business days",
    ],

    s5Title: "5. Refund Processing",
    s5Body:
      "Approved refunds will be processed to the original payment method within 5-10 business days. The exact timing depends on your payment provider. You will receive an email confirmation when the refund is issued.",

    s6Title: "6. Cancellation vs. Refund",
    s6Body:
      "Cancelling your subscription is different from requesting a refund. When you cancel, your Pro features remain active until the end of your current billing period. No automatic refund is issued for cancellations. If you want both cancellation and a refund, please contact us separately.",

    s7Title: "7. Non-Refundable Items",
    s7Items: [
      "Usage that has already been consumed (API calls, AI generations)",
      "Subscriptions that were used beyond the 7-day refund window",
      "Accounts that violated the Terms of Service",
      "Promotional or discounted subscriptions (unless otherwise stated)",
    ],

    s8Title: "8. Changes to This Policy",
    s8Body:
      "We may update this Refund Policy from time to time. Changes will be posted on this page with a new effective date. Material changes will not apply retroactively to existing refund requests.",

    s9Title: "9. Contact Us",
    s9Body: "For refund inquiries, please contact us at:",
    s9Email: "support@meld.dev",
  },
  ko: {
    back: "홈",
    title: "환불 정책",
    lastUpdated: "최종 업데이트: 2026년 3월 24일",

    intro:
      "본 환불 정책은 Meld 유료 구독에 대한 환불 처리 방법을 설명합니다. 서비스에 만족하시길 바라며, 공정하고 투명한 처리를 위해 노력합니다.",

    s1Title: "1. 무료 플랜",
    s1Body:
      "무료 플랜은 무상으로 제공되며 결제가 필요하지 않습니다. 무료 플랜에는 환불이 적용되지 않습니다.",

    s2Title: "2. Pro 구독 환불",
    s2Sub1: "구매 후 7일 이내",
    s2Sub1Body:
      "Meld Pro에 만족하지 않으시면 최초 구매일로부터 7일 이내에 전액 환불을 요청할 수 있습니다. 이는 첫 Pro 구독자에게만 적용됩니다.",
    s2Sub2: "7일 이후",
    s2Sub2Body:
      "7일 이후에는 일반적으로 환불이 제공되지 않습니다. 다만, 다음과 같은 특별한 상황에서는 개별적으로 환불을 검토할 수 있습니다:",
    s2Sub2Items: [
      "결제 기간 중 서비스가 상당 기간 사용 불가능했을 경우",
      "핵심 기능이 사전 통지 없이 제거된 경우",
      "결제 오류 또는 무단 청구가 발생한 경우",
    ],

    s3Title: "3. 연간 구독 환불",
    s3Body:
      "연간 구독의 경우 구매 후 30일 이내에 비례 환불을 요청할 수 있습니다. 30일 이후에는 다음 결제 주기 전에 연락하시면 남은 미사용 기간에 대한 비례 환불을 제공합니다.",

    s4Title: "4. 환불 요청 방법",
    s4Body: "환불을 요청하려면:",
    s4Steps: [
      "support@meld.dev로 제목에 \"환불 요청\"을 포함한 이메일을 보내세요",
      "GitHub 사용자명과 계정에 연결된 이메일을 포함하세요",
      "환불 요청 사유를 설명해 주세요",
      "영업일 기준 3일 이내에 답변드리겠습니다",
    ],

    s5Title: "5. 환불 처리",
    s5Body:
      "승인된 환불은 원래 결제 수단으로 영업일 기준 5~10일 이내에 처리됩니다. 정확한 시기는 결제 공급자에 따라 다릅니다. 환불이 발행되면 이메일 확인을 받으실 수 있습니다.",

    s6Title: "6. 구독 취소 vs. 환불",
    s6Body:
      "구독 취소와 환불 요청은 다릅니다. 구독을 취소하면 현재 결제 기간이 끝날 때까지 Pro 기능이 유지됩니다. 취소 시 자동 환불은 발생하지 않습니다. 취소와 환불을 모두 원하시면 별도로 연락해 주세요.",

    s7Title: "7. 환불 불가 항목",
    s7Items: [
      "이미 소비된 사용량 (API 호출, AI 생성)",
      "7일 환불 기간을 초과하여 사용된 구독",
      "서비스 이용약관을 위반한 계정",
      "프로모션 또는 할인된 구독 (별도 명시가 없는 한)",
    ],

    s8Title: "8. 정책 변경",
    s8Body:
      "수시로 본 환불 정책을 업데이트할 수 있습니다. 변경 사항은 새로운 적용 날짜와 함께 이 페이지에 게시됩니다. 중요한 변경 사항은 기존 환불 요청에 소급 적용되지 않습니다.",

    s9Title: "9. 문의",
    s9Body: "환불 관련 문의는 아래로 연락해 주세요:",
    s9Email: "support@meld.dev",
  },
} as const;

export default function RefundPage() {
  const { lang, toggleLang } = useLangStore();
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b border-[#F0F0EE]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] text-[#B4B4B0] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.back}
          </Link>
          <div className="flex-1" />
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1A1A1A]">
            <Atom className="h-3 w-3 text-white" />
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
          {t.title}
        </h1>
        <p className="mt-2 text-[13px] text-[#B4B4B0]">{t.lastUpdated}</p>

        <div className="mt-8 space-y-8 text-[14px] leading-relaxed text-[#555]">
          <p>{t.intro}</p>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s1Title}</h2>
            <p className="mt-2">{t.s1Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s2Title}</h2>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="text-[14px] font-medium text-[#333]">{t.s2Sub1}</h3>
                <p className="mt-1">{t.s2Sub1Body}</p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-[#333]">{t.s2Sub2}</h3>
                <p className="mt-1">{t.s2Sub2Body}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {t.s2Sub2Items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s3Title}</h2>
            <p className="mt-2">{t.s3Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s4Title}</h2>
            <p className="mt-2">{t.s4Body}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {t.s4Steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s5Title}</h2>
            <p className="mt-2">{t.s5Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s6Title}</h2>
            <p className="mt-2">{t.s6Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s7Title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {t.s7Items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s8Title}</h2>
            <p className="mt-2">{t.s8Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s9Title}</h2>
            <p className="mt-2">{t.s9Body}</p>
            <a
              href={`mailto:${t.s9Email}`}
              className="mt-1 inline-block text-[#2E86C1] underline underline-offset-2"
            >
              {t.s9Email}
            </a>
          </section>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-[#F0F0EE]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-4 text-[12px] text-[#B4B4B0]">
            <Link href="/terms" className="hover:text-[#787774]">
              {lang === "ko" ? "이용약관" : "Terms of Service"}
            </Link>
            <Link href="/privacy" className="hover:text-[#787774]">
              {lang === "ko" ? "개인정보처리방침" : "Privacy Policy"}
            </Link>
          </div>
          <span className="text-[11px] text-[#D4D4D0]">© 2026 Meld</span>
        </div>
      </footer>

      {/* 언어 토글 */}
      <button
        onClick={toggleLang}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A] text-[12px] font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {lang === "en" ? "KO" : "EN"}
      </button>
    </div>
  );
}
