"use client";

import Link from "next/link";
import { ArrowLeft, Atom } from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    back: "Home",
    title: "Privacy Policy",
    lastUpdated: "Last updated: March 24, 2026",

    intro:
      'This Privacy Policy describes how Meld ("we", "our", or "the Service") collects, uses, and protects your information when you use our design-to-code platform.',

    s1Title: "1. Information We Collect",
    s1Sub1: "Account Information",
    s1Sub1Body:
      "When you sign in with GitHub, we receive your public profile information: username, display name, email address, and avatar URL. We do not access your private repositories unless you explicitly grant permission.",
    s1Sub2: "Figma Data",
    s1Sub2Body:
      "When you connect a Figma file, we access the design data (node tree, styles, images) through the Figma REST API using your OAuth token. This data is used to render the visual viewer and enable design-to-code mapping.",
    s1Sub3: "Code Data",
    s1Sub3Body:
      "In Cloud mode, code snippets from your selected files are temporarily sent to AI providers for processing. In Local and Desktop modes, your code is processed entirely on your machine and never transmitted to our servers.",
    s1Sub4: "Usage Data",
    s1Sub4Body:
      "We collect anonymized usage analytics (page views, feature usage, error reports) to improve the Service. We do not track individual user behavior.",

    s2Title: "2. How We Use Your Information",
    s2Items: [
      "To authenticate your identity and provide access to the Service",
      "To render Figma designs and enable design-to-code mapping",
      "To send code snippets to AI models for generating code modifications (Cloud mode only)",
      "To improve and maintain the Service based on aggregated usage patterns",
      "To communicate important updates about the Service",
    ],

    s3Title: "3. Data Storage and Security",
    s3Body:
      "We use Supabase (hosted on AWS) for data storage. Your data is encrypted in transit (TLS 1.3) and at rest (AES-256). OAuth tokens are stored securely and automatically refreshed. We implement industry-standard security measures to protect your information.",

    s4Title: "4. Third-Party Services",
    s4Body: "We integrate with the following third-party services:",
    s4Items: [
      "GitHub — Authentication and repository access",
      "Figma — Design data access via REST API",
      "Anthropic (Claude) — AI code generation",
      "OpenAI (GPT-4o) — AI code generation",
      "Google (Gemini) — AI code generation",
      "Supabase — Database and authentication infrastructure",
      "Vercel — Web application hosting",
    ],
    s4Footer:
      "Each provider has their own privacy policy. Code snippets sent to AI providers are used only for generating responses and are not stored or used for training, in accordance with their API terms.",

    s5Title: "5. Data Retention",
    s5Body:
      "Project data and mappings are retained while your account is active. You can delete your projects at any time. If you delete your account, all associated data is permanently removed within 30 days. Anonymized analytics data may be retained indefinitely.",

    s6Title: "6. Your Rights",
    s6Items: [
      "Access: Request a copy of the data we hold about you",
      "Correction: Update or correct your personal information",
      "Deletion: Request deletion of your account and all associated data",
      "Portability: Export your project data in standard formats",
      "Opt-out: Disable analytics tracking in your account settings",
    ],

    s7Title: "7. Cookies and Local Storage",
    s7Body:
      "We use essential cookies for authentication and session management. We use localStorage to persist your language preference and UI settings. We do not use third-party tracking cookies.",

    s8Title: "8. Children's Privacy",
    s8Body:
      "The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.",

    s9Title: "9. International Data Transfers",
    s9Body:
      "Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers in compliance with applicable data protection laws.",

    s10Title: "10. Changes to This Policy",
    s10Body:
      "We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page. Your continued use of the Service constitutes acceptance of the revised policy.",

    s11Title: "11. Contact Us",
    s11Body: "For privacy-related inquiries, please contact us at:",
    s11Email: "privacy@meld.dev",
  },
  ko: {
    back: "홈",
    title: "개인정보처리방침",
    lastUpdated: "최종 업데이트: 2026년 3월 24일",

    intro:
      "본 개인정보처리방침은 Meld(\"당사\" 또는 \"서비스\")가 디자인-투-코드 플랫폼을 사용할 때 귀하의 정보를 어떻게 수집, 사용 및 보호하는지 설명합니다.",

    s1Title: "1. 수집하는 정보",
    s1Sub1: "계정 정보",
    s1Sub1Body:
      "GitHub로 로그인하면 공개 프로필 정보(사용자명, 표시 이름, 이메일 주소, 아바타 URL)를 받습니다. 귀하가 명시적으로 권한을 부여하지 않는 한 비공개 저장소에 접근하지 않습니다.",
    s1Sub2: "Figma 데이터",
    s1Sub2Body:
      "Figma 파일을 연결하면 OAuth 토큰을 사용하여 Figma REST API를 통해 디자인 데이터(노드 트리, 스타일, 이미지)에 접근합니다. 이 데이터는 비주얼 뷰어 렌더링 및 디자인-코드 매핑에 사용됩니다.",
    s1Sub3: "코드 데이터",
    s1Sub3Body:
      "Cloud 모드에서는 선택한 파일의 코드 스니펫이 처리를 위해 일시적으로 AI 공급자에게 전송됩니다. Local 및 Desktop 모드에서는 코드가 전적으로 귀하의 기기에서 처리되며 당사 서버로 전송되지 않습니다.",
    s1Sub4: "사용 데이터",
    s1Sub4Body:
      "서비스 개선을 위해 익명화된 사용 분석(페이지 뷰, 기능 사용, 오류 보고)을 수집합니다. 개별 사용자 행동을 추적하지 않습니다.",

    s2Title: "2. 정보 사용 방법",
    s2Items: [
      "귀하의 신원을 인증하고 서비스 접근을 제공하기 위해",
      "Figma 디자인을 렌더링하고 디자인-코드 매핑을 활성화하기 위해",
      "코드 수정을 생성하기 위해 AI 모델에 코드 스니펫을 전송하기 위해 (Cloud 모드만 해당)",
      "집계된 사용 패턴을 기반으로 서비스를 개선 및 유지하기 위해",
      "서비스에 대한 중요한 업데이트를 전달하기 위해",
    ],

    s3Title: "3. 데이터 저장 및 보안",
    s3Body:
      "데이터 저장에 Supabase(AWS 호스팅)를 사용합니다. 데이터는 전송 중(TLS 1.3) 및 저장 시(AES-256) 암호화됩니다. OAuth 토큰은 안전하게 저장되고 자동으로 갱신됩니다. 정보 보호를 위해 업계 표준 보안 조치를 구현합니다.",

    s4Title: "4. 서드파티 서비스",
    s4Body: "다음 서드파티 서비스와 통합합니다:",
    s4Items: [
      "GitHub — 인증 및 저장소 접근",
      "Figma — REST API를 통한 디자인 데이터 접근",
      "Anthropic (Claude) — AI 코드 생성",
      "OpenAI (GPT-4o) — AI 코드 생성",
      "Google (Gemini) — AI 코드 생성",
      "Supabase — 데이터베이스 및 인증 인프라",
      "Vercel — 웹 애플리케이션 호스팅",
    ],
    s4Footer:
      "각 공급자는 자체 개인정보처리방침을 가지고 있습니다. AI 공급자에게 전송되는 코드 스니펫은 응답 생성에만 사용되며, API 이용약관에 따라 저장되거나 학습에 사용되지 않습니다.",

    s5Title: "5. 데이터 보존",
    s5Body:
      "프로젝트 데이터와 매핑은 계정이 활성 상태인 동안 보존됩니다. 언제든지 프로젝트를 삭제할 수 있습니다. 계정을 삭제하면 관련된 모든 데이터가 30일 이내에 영구 삭제됩니다. 익명화된 분석 데이터는 무기한 보존될 수 있습니다.",

    s6Title: "6. 귀하의 권리",
    s6Items: [
      "접근: 당사가 보유한 귀하의 데이터 사본 요청",
      "정정: 개인정보 업데이트 또는 수정",
      "삭제: 계정 및 모든 관련 데이터 삭제 요청",
      "이동: 프로젝트 데이터를 표준 형식으로 내보내기",
      "거부: 계정 설정에서 분석 추적 비활성화",
    ],

    s7Title: "7. 쿠키 및 로컬 저장소",
    s7Body:
      "인증 및 세션 관리를 위해 필수 쿠키를 사용합니다. 언어 설정 및 UI 설정을 유지하기 위해 localStorage를 사용합니다. 서드파티 추적 쿠키는 사용하지 않습니다.",

    s8Title: "8. 아동 개인정보 보호",
    s8Body:
      "서비스는 만 13세 미만 아동을 대상으로 하지 않습니다. 만 13세 미만 아동의 개인정보를 고의로 수집하지 않습니다. 이러한 정보가 수집되었다고 판단되면 즉시 연락해 주세요.",

    s9Title: "9. 국제 데이터 전송",
    s9Body:
      "귀하의 데이터는 거주 국가 외의 국가에서 처리될 수 있습니다. 적용 가능한 데이터 보호법을 준수하여 국제 데이터 전송에 적절한 보호 조치를 보장합니다.",

    s10Title: "10. 방침 변경",
    s10Body:
      "수시로 본 개인정보처리방침을 업데이트할 수 있습니다. 중요한 변경 사항은 이 페이지에 업데이트된 방침을 게시하여 알려드립니다. 서비스를 계속 사용하면 수정된 방침에 동의하는 것으로 간주됩니다.",

    s11Title: "11. 문의",
    s11Body: "개인정보 관련 문의는 아래로 연락해 주세요:",
    s11Email: "privacy@meld.dev",
  },
} as const;

export default function PrivacyPage() {
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
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="text-[14px] font-medium text-[#333]">{t.s1Sub1}</h3>
                <p className="mt-1">{t.s1Sub1Body}</p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-[#333]">{t.s1Sub2}</h3>
                <p className="mt-1">{t.s1Sub2Body}</p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-[#333]">{t.s1Sub3}</h3>
                <p className="mt-1">{t.s1Sub3Body}</p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-[#333]">{t.s1Sub4}</h3>
                <p className="mt-1">{t.s1Sub4Body}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s2Title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {t.s2Items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s3Title}</h2>
            <p className="mt-2">{t.s3Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s4Title}</h2>
            <p className="mt-2">{t.s4Body}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {t.s4Items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-[#888]">{t.s4Footer}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s5Title}</h2>
            <p className="mt-2">{t.s5Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s6Title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {t.s6Items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s7Title}</h2>
            <p className="mt-2">{t.s7Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s8Title}</h2>
            <p className="mt-2">{t.s8Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s9Title}</h2>
            <p className="mt-2">{t.s9Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s10Title}</h2>
            <p className="mt-2">{t.s10Body}</p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{t.s11Title}</h2>
            <p className="mt-2">{t.s11Body}</p>
            <a
              href={`mailto:${t.s11Email}`}
              className="mt-1 inline-block text-[#2E86C1] underline underline-offset-2"
            >
              {t.s11Email}
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
            <Link href="/refund" className="hover:text-[#787774]">
              {lang === "ko" ? "환불 정책" : "Refund Policy"}
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
