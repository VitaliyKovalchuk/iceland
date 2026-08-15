import { notFound } from "next/navigation";
import DayView from "@/components/DayView";
import { itinerary } from "@/lib/data";

export function generateStaticParams() {
  return itinerary.days.map((_, i) => ({ n: String(i + 1) }));
}

export default async function Day({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const i = Number(n) - 1;
  if (!Number.isInteger(i) || i < 0 || i >= itinerary.days.length) notFound();
  return <DayView index={i} />;
}
