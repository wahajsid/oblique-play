import { notFound } from "next/navigation";
import { ShiftGame } from "@/components/review/ShiftGame";
import { getShift, getShiftDocuments } from "@/lib/review/content";

export default async function ShiftPage({ params }: { params: Promise<{ shift: string }> }) {
  const { shift: param } = await params;
  const shift = getShift(Number(param));
  if (!shift || !shift.available) notFound();

  // Only the answer-free version of each document is sent to the browser.
  return <ShiftGame shift={shift} documents={getShiftDocuments(shift.number)} />;
}

export async function generateMetadata({ params }: { params: Promise<{ shift: string }> }) {
  const { shift: param } = await params;
  const shift = getShift(Number(param));
  return { title: shift ? `Shift ${shift.number}: ${shift.title} · by Oblique` : "Shift · by Oblique" };
}
