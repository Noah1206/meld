"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LoginModal } from "@/components/auth/LoginModal";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get("redirect_to") || "/projects";

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <LoginModal
        isOpen={true}
        onClose={() => router.push("/")}
        redirectTo={redirectTo}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#0D0D0D]">
        <Loader2 className="h-5 w-5 animate-spin text-[#555]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
