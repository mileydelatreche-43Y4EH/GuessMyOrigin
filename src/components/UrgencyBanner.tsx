"use client";

import { useEffect, useState } from "react";
import { playUrgencyTick } from "@/lib/sound";

interface Props {
  endsAt: number | null;
  active: boolean;
  label?: string;
}

export default function UrgencyBanner({
  endsAt,
  active,
  label = "Quelqu'un a guess !",
}: Props) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!active || !endsAt) {
      setLeft(0);
      return;
    }
    const tick = () => {
      const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(s);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [active, endsAt]);

  useEffect(() => {
    if (!active || left <= 0) return;
    playUrgencyTick();
  }, [active, left]);

  if (!active || left <= 0) return null;

  return (
    <>
      <div className="urgency-overlay" />
      <div className="urgency-banner" role="alert">
        <span className="urgency-label">{label}</span>
        <span className="urgency-count">{left}</span>
      </div>
    </>
  );
}
