"use client";

import { use } from "react";
import { PlayScreen } from "@/components/game/PlayScreen";

export default function PlayPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  return <PlayScreen attemptId={attemptId} />;
}
