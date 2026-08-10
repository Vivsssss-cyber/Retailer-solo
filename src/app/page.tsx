import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

/**
 * Home: intro + solo / join.
 * Legacy `/?code=ABC` deep links redirect to the dedicated join route.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.code) ? sp.code[0] : sp.code;
  const code = raw?.trim();
  if (code) {
    redirect(`/join/${encodeURIComponent(code.toUpperCase())}`);
  }
  return <OnboardingFlow />;
}
