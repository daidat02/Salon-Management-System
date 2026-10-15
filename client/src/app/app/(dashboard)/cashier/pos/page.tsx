import type { Metadata } from "next";
import { Suspense } from "react";
import PosContent from "./components/PosContent";

export const metadata: Metadata = { title: "Thu ngân | SALON ADMIN" };

export default function PosPage() {
  return (
    <Suspense>
      <PosContent />
    </Suspense>
  );
}
