"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { Users, CalendarDays, ShieldCheck, Flag, Ticket } from "lucide-react";

function CountUp({
  value,
  visible,
  suffix = "",
}: {
  value: number;
  visible: boolean;
  suffix?: string;
}) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible || reduced) return;
    let frame = 0;
    let start: number | undefined;
    const tick = (time: number) => {
      if (start === undefined) start = time;
      const progress = Math.min((time - start) / 1600, 1);
      setCount(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, visible, reduced]);
  return (
    <>
      <span aria-hidden="true">
        {reduced ? value : count}
        {suffix}
      </span>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
    </>
  );
}
export function ClubStats({ counts }: { counts: Record<string, number> }) {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.3 });
  const stats = [
    {
      label: "Club members",
      value: counts.members ?? 0,
      suffix: counts.membersLowerBound ? "+" : "",
      icon: Users,
    },
    {
      label: "Events",
      value: counts.events ?? 0,
      suffix: "",
      icon: CalendarDays,
    },
    {
      label: "Workshops",
      value: counts.workshops ?? 0,
      suffix: "",
      icon: ShieldCheck,
    },
    {
      label: "CTFs done",
      value: counts.ctfs ?? 0,
      suffix: counts.ctfsLowerBound ? "+" : "",

      icon: Flag,
    },
    {
      label: "Attendance",
      value: counts.attendance ?? 0,
      suffix: counts.attendanceLowerBound ? "+" : "",
      icon: Ticket,
    },
  ];
  return (
    <section ref={ref} className="club-stats" aria-label="Club statistics">
      <div className="container">
        <dl className="club-stats-grid">
          {stats.map((stat) => (
            <div key={stat.label}>
              <stat.icon size={19} aria-hidden="true" />
              <dt>{stat.label}</dt>
              <dd>
                <CountUp
                  value={stat.value}
                  visible={visible}
                  suffix={stat.suffix}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
