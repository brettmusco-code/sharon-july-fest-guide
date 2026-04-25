import { useEffect, useState } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";

const FALLBACK_TARGET = new Date("2026-07-03T21:15:00-04:00").getTime();

const calcFor = (target: number) => {
  const diff = Math.max(0, target - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    done: diff === 0,
  };
};

const Cell = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center w-[2.25ch] md:w-[2.5ch]">
    <div className="font-heading text-2xl md:text-4xl text-firework-gold tabular-nums leading-none text-center">
      {value.toString().padStart(2, "0")}
    </div>
    <div className="font-body text-[10px] md:text-xs uppercase tracking-wider text-primary-foreground/70 mt-1">
      {label}
    </div>
  </div>
);

const Countdown = () => {
  const { data: config } = usePublicConfig();
  const target = config?.fireworks_at
    ? new Date(config.fireworks_at).getTime()
    : FALLBACK_TARGET;
  const validTarget = Number.isFinite(target) ? target : FALLBACK_TARGET;

  const [t, setT] = useState(() => calcFor(validTarget));

  useEffect(() => {
    setT(calcFor(validTarget));
    const id = setInterval(() => setT(calcFor(validTarget)), 1000);
    return () => clearInterval(id);
  }, [validTarget]);

  if (t.done) {
    return (
      <div className="font-heading text-2xl text-firework-gold animate-pulse">
        🎆 Happening now! 🎆
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-3 md:gap-5 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-sm px-5 py-3 md:px-7 md:py-4"
      aria-label="Countdown to fireworks"
    >
      <Cell value={t.d} label="Days" />
      <span className="text-firework-gold/40 text-2xl md:text-3xl font-heading">:</span>
      <Cell value={t.h} label="Hours" />
      <span className="text-firework-gold/40 text-2xl md:text-3xl font-heading">:</span>
      <Cell value={t.m} label="Min" />
      <span className="text-firework-gold/40 text-2xl md:text-3xl font-heading">:</span>
      <Cell value={t.s} label="Sec" />
    </div>
  );
};

export default Countdown;
