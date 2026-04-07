"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/project/workspace?name=New+Project");
  }, [router]);

  return null;
}
