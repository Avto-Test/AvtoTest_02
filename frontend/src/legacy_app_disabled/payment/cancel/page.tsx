import { Suspense } from "react";
import CancelContent from "./CancelContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CancelContent />
    </Suspense>
  );
}
