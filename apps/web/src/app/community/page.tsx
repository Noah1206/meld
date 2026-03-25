"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Atom,
  MessageCircle,
  ArrowUpRight,
  Users,
  HelpCircle,
  Lightbulb,
  Heart,
  ArrowRight,
} from "lucide-react";
import { useLangStore } from "@/lib/store/lang-store";

const translations = {
  en: {
    back: "Home",
    title: "Community",
    subtitle: "Connect with other users and help each other.",

    discordTitle: "Join Discord",
    discordDesc: "Ask questions, share ideas, and exchange feedback.",
    discordBtn: "Open Discord",

    channelsTitle: "Channels",
    chQuestions: "#questions",
    chQuestionsDesc: "Ask anything about using the tool. We'll respond quickly.",
    chIdeas: "#ideas",
    chIdeasDesc: "Share new feature ideas or improvement suggestions.",
    chGeneral: "#general",
    chGeneralDesc: "Chat freely and share your experiences.",
    chShowcase: "#showcase",
    chShowcaseDesc: "Show off what you've built with Meld.",

    guidelinesTitle: "Community Guidelines",
    guideline1: "Be respectful and kind to each other.",
    guideline2: "When asking questions, describe your situation clearly.",
    guideline3: "Help others by answering their questions too.",
    guideline4: "Please refrain from spam or unrelated promotions.",

    otherChannels: "Other Channels",
    ghDiscussions: "GitHub Discussions",
    ghDiscussionsDesc: "Long-form discussions and Q&A",
    twitter: "Twitter / X",
    twitterDesc: "News and updates",

    backToDashboard: "Back to Home",
  },
  ko: {
    back: "홈",
    title: "커뮤니티",
    subtitle: "다른 사용자들과 소통하고 도움을 주고받으세요.",

    discordTitle: "Discord에 참여하기",
    discordDesc: "질문하고, 아이디어를 공유하고, 피드백을 주고받으세요.",
    discordBtn: "Discord 열기",

    channelsTitle: "채널 안내",
    chQuestions: "#질문",
    chQuestionsDesc: "사용 중 궁금한 점을 물어보세요. 빠르게 답변해 드립니다.",
    chIdeas: "#아이디어",
    chIdeasDesc: "새로운 기능 아이디어나 개선 제안을 공유하세요.",
    chGeneral: "#일반",
    chGeneralDesc: "자유롭게 대화하고 경험을 나누세요.",
    chShowcase: "#쇼케이스",
    chShowcaseDesc: "Meld로 만든 결과물을 자랑하세요.",

    guidelinesTitle: "커뮤니티 가이드라인",
    guideline1: "서로 존중하고 친절하게 대화해 주세요.",
    guideline2: "질문할 때는 상황을 구체적으로 설명해 주세요.",
    guideline3: "다른 사람의 질문에도 적극적으로 답변해 주세요.",
    guideline4: "스팸이나 관련 없는 홍보는 삼가해 주세요.",

    otherChannels: "다른 채널",
    ghDiscussions: "GitHub Discussions",
    ghDiscussionsDesc: "긴 토론과 Q&A",
    twitter: "Twitter / X",
    twitterDesc: "업데이트 소식",

    backToDashboard: "홈으로 돌아가기",
  },
} as const;

export default function CommunityPage() {
  const { lang } = useLangStore();
  const t = translations[lang];

  const channels = [
    { icon: HelpCircle, channel: t.chQuestions, desc: t.chQuestionsDesc },
    { icon: Lightbulb, channel: t.chIdeas, desc: t.chIdeasDesc },
    { icon: MessageCircle, channel: t.chGeneral, desc: t.chGeneralDesc },
    { icon: Heart, channel: t.chShowcase, desc: t.chShowcaseDesc },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-16 py-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[15px] text-[#787774] transition-colors hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A1A1A]">
              <Atom className="h-3.5 w-3.5 text-white" />
            </div>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 lg:px-16 pt-12 pb-24">
        {/* 타이틀 */}
        <div className="animate-fade-in-up mb-14">
          <h1 className="text-[36px] font-bold tracking-[-0.02em] text-[#1A1A1A]">
            {t.title}
          </h1>
          <p className="mt-2 text-[15px] text-[#787774]">
            {t.subtitle}
          </p>
        </div>

        {/* Discord 메인 카드 */}
        <div className="animate-fade-in-up animation-delay-150 mb-10">
          <a
            href="https://discord.gg/meld"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center rounded-2xl bg-[#F7F7F5] p-10 text-center transition-colors hover:bg-[#F0F0EE]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
              <MessageCircle className="h-6 w-6 text-[#1A1A1A]" />
            </div>
            <h2 className="mt-5 text-[22px] font-bold text-[#1A1A1A]">{t.discordTitle}</h2>
            <p className="mt-2 text-[14px] text-[#787774]">
              {t.discordDesc}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-6 py-3 text-[14px] font-semibold text-white transition-colors group-hover:bg-[#333]">
              {t.discordBtn}
              <ArrowUpRight className="h-4 w-4 text-white/40" />
            </div>
          </a>
        </div>

        {/* 채널 안내 */}
        <section className="animate-fade-in-up animation-delay-300 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.channelsTitle}</h2>
          <div className="mt-6 space-y-3">
            {channels.map((item) => (
              <div key={item.channel} className="flex gap-4 rounded-2xl bg-[#F7F7F5] p-5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white">
                  <item.icon className="h-4 w-4 text-[#787774]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">{item.channel}</p>
                  <p className="mt-0.5 text-[13px] text-[#787774]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 커뮤니티 가이드라인 */}
        <section className="animate-fade-in-up animation-delay-450 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.guidelinesTitle}</h2>
          <div className="mt-6 rounded-2xl bg-[#F7F7F5] p-6">
            <ul className="space-y-3 text-[13px] leading-relaxed text-[#787774]">
              {[t.guideline1, t.guideline2, t.guideline3, t.guideline4].map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#1A1A1A]">·</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 다른 채널 */}
        <section className="animate-fade-in-up animation-delay-600 mb-14">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#1A1A1A]">{t.otherChannels}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href="https://github.com/meld-studio/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 transition-colors hover:bg-[#F0F0EE]"
            >
              <Users className="h-4 w-4 text-[#787774]" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{t.ghDiscussions}</p>
                <p className="text-[11px] text-[#B4B4B0]">{t.ghDiscussionsDesc}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-colors group-hover:text-[#787774]" />
            </a>
            <a
              href="https://twitter.com/meld_studio"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl bg-[#F7F7F5] p-4 transition-colors hover:bg-[#F0F0EE]"
            >
              <MessageCircle className="h-4 w-4 text-[#787774]" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{t.twitter}</p>
                <p className="text-[11px] text-[#B4B4B0]">{t.twitterDesc}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#D4D4D0] transition-colors group-hover:text-[#787774]" />
            </a>
          </div>
        </section>

        {/* 하단 */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#1A1A1A] transition-colors hover:text-[#787774]"
          >
            {t.backToDashboard}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
