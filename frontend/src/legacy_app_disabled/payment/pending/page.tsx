import { Suspense } from "react";
import PendingContent from "./PendingContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PendingContent />
    </Suspense>
  );
}
