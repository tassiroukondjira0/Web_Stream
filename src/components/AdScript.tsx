import { Suspense } from "react";
import Script from "next/script";
import { getCurrentUser, hasPremiumAccess } from "@/lib/auth";

async function AdScriptInner() {
  const user = await getCurrentUser().catch(() => null);
  if (user && hasPremiumAccess(user.role)) return null;
  return (
    <>
      <Script
        id="vignette-ad"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(s){s.dataset.zone='12152322',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
        }}
      />
      <Script
        id="inpage-push-ad"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(s){s.dataset.zone='12152404',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`,
        }}
      />
      <Script
        src="https://5gvci.com/act/files/tag.min.js?z=12152406"
        data-cfasync="false"
        async
        strategy="afterInteractive"
      />
    </>
  );
}

export function AdScript() {
  return (
    <Suspense fallback={null}>
      <AdScriptInner />
    </Suspense>
  );
}
