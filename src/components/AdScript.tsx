import { Suspense } from "react";
import Script from "next/script";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";

async function AdScriptInner() {
  const user = await getCurrentUser().catch(() => null);
  if (user && hasPremiumAccess(user.role)) return null;
  return (
    <Script
      src="https://quge5.com/88/tag.min.js"
      data-zone="303060"
      async
      data-cfasync="false"
      strategy="afterInteractive"
    />
  );
}

export function AdScript() {
  return (
    <Suspense fallback={null}>
      <AdScriptInner />
    </Suspense>
  );
}
