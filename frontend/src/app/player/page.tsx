import { Suspense } from "react";

import { PlayerView } from "@/components/player-view";

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="h-full w-full" />}>
      <PlayerView />
    </Suspense>
  );
}
