import { notFound } from "next/navigation";
import { ShiftGame } from "@/components/review/ShiftGame";
import { challengeInfoFor } from "@/lib/challenges";
import { getShift, getShiftDocuments } from "@/lib/review/content";
import { getProfile } from "@/lib/players";
import { authEnabled } from "@/lib/supabase/config";
import { getSignedInPlayer } from "@/lib/supabase/server";

type Props = { params: Promise<{ shift: string }>; searchParams: Promise<{ c?: string }> };

export default async function ShiftPage({ params, searchParams }: Props) {
  const [{ shift: param }, { c }] = await Promise.all([params, searchParams]);
  const shift = getShift(Number(param));
  if (!shift || !shift.available) notFound();

  const [player, profile] = await Promise.all([getSignedInPlayer(), getProfile()]);
  const challenge = await challengeInfoFor(c, player?.id ?? null, { kind: "review", shift: shift.number });

  // Only the answer-free version of each document is sent to the browser.
  return (
    <ShiftGame
      shift={shift}
      documents={getShiftDocuments(shift.number)}
      needsSignIn={authEnabled && !player}
      profile={profile}
      challenge={challenge}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ shift: string }> }) {
  const { shift: param } = await params;
  const shift = getShift(Number(param));
  return { title: shift ? `Shift ${shift.number}: ${shift.title} · by Oblique` : "Shift · by Oblique" };
}
