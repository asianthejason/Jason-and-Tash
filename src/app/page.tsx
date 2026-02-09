"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

type Photo = {
  src: string;
  alt: string;
  style: React.CSSProperties;
};

export default function Page() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);

  const [accepted, setAccepted] = useState(false);
  const [noPos, setNoPos] = useState<{ x: number; y: number } | null>(null);

  // Placeholders — add your images in /public/photos and update these filenames
  const photos: Photo[] = useMemo(
    () => [
      { src: "/photos/1.jpg", alt: "Photo 1", style: { top: "8%", left: "6%", transform: "rotate(-6deg)" } },
      { src: "/photos/2.jpg", alt: "Photo 2", style: { top: "12%", right: "7%", transform: "rotate(7deg)" } },
      { src: "/photos/3.jpg", alt: "Photo 3", style: { bottom: "10%", left: "10%", transform: "rotate(5deg)" } },
      { src: "/photos/4.jpg", alt: "Photo 4", style: { bottom: "14%", right: "9%", transform: "rotate(-7deg)" } },
      { src: "/photos/5.jpg", alt: "Photo 5", style: { top: "42%", left: "2%", transform: "rotate(10deg)" } },
      { src: "/photos/6.jpg", alt: "Photo 6", style: { top: "46%", right: "2%", transform: "rotate(-10deg)" } },
    ],
    []
  );

  useEffect(() => {
    // initialize "No" button position (center-right-ish)
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setNoPos({ x: rect.width * 0.62, y: rect.height * 0.62 });
  }, []);

  const popConfetti = () => {
    // a few bursts
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.6 } }), 150);
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.6 } }), 250);
  };

  const handleYes = () => {
    setAccepted(true);
    popConfetti();
  };

  const moveNoAway = (clientX: number, clientY: number) => {
    if (!containerRef.current || !noBtnRef.current) return;
    const box = containerRef.current.getBoundingClientRect();
    const btn = noBtnRef.current.getBoundingClientRect();

    const current = noPos ?? { x: box.width / 2, y: box.height / 2 };

    // cursor relative to container
    const mx = clientX - box.left;
    const my = clientY - box.top;

    // button center
    const bx = current.x + btn.width / 2;
    const by = current.y + btn.height / 2;

    const dx = bx - mx;
    const dy = by - my;
    const dist = Math.max(1, Math.hypot(dx, dy));

    // push it away
    const push = 140; // how aggressively it escapes
    const nx = current.x + (dx / dist) * push;
    const ny = current.y + (dy / dist) * push;

    // clamp within container bounds with padding
    const pad = 16;
    const maxX = box.width - btn.width - pad;
    const maxY = box.height - btn.height - pad;

    setNoPos({
      x: Math.min(Math.max(pad, nx), maxX),
      y: Math.min(Math.max(pad, ny), maxY),
    });
  };

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-red-100"
      onMouseMove={(e) => {
        // if mouse gets near the "No" button, move it
        if (!noBtnRef.current || !noPos) return;
        const b = noBtnRef.current.getBoundingClientRect();
        const near =
          e.clientX > b.left - 90 &&
          e.clientX < b.right + 90 &&
          e.clientY > b.top - 90 &&
          e.clientY < b.bottom + 90;

        if (near) moveNoAway(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        // mobile: if they touch anywhere, nudge the "No" away from that touch
        const t = e.touches[0];
        if (t) moveNoAway(t.clientX, t.clientY);
      }}
    >
      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45),rgba(255,255,255,0)_55%)]" />

      {/* Photos */}
      {photos.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute w-[160px] sm:w-[190px] md:w-[220px] lg:w-[240px] drop-shadow-xl"
          style={p.style}
        >
          <div className="rounded-3xl bg-white/70 p-2 backdrop-blur">
            <img
              src={p.src}
              alt={p.alt}
              className="h-[170px] w-full rounded-2xl object-cover sm:h-[190px] md:h-[210px] lg:h-[230px]"
              draggable={false}
            />
          </div>
        </div>
      ))}

      {/* Center content */}
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-2xl rounded-[2rem] bg-white/70 p-8 text-center shadow-2xl backdrop-blur-md sm:p-10">
          <div className="mb-3 text-sm font-semibold tracking-wide text-rose-600">
            💌 a very important question
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">
            will you be my <span className="text-rose-600">valentine</span>
          </h1>

          <p className="mt-4 text-zinc-600">
            (there is a correct answer…)
          </p>

          <div className="relative mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handleYes}
              className="rounded-2xl bg-rose-600 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-[1.03] active:scale-[0.98]"
            >
              Yes 💖
            </button>

            {/* The "No" button is absolutely positioned so it can run away */}
            <button
              ref={noBtnRef}
              type="button"
              className="rounded-2xl bg-zinc-900/85 px-7 py-4 text-lg font-bold text-white shadow-lg"
              style={{
                position: "absolute",
                left: noPos?.x ?? 0,
                top: noPos?.y ?? 0,
              }}
              aria-label="No"
              // If they somehow click it (keyboard / edge case), still dodge
              onMouseEnter={(e) => moveNoAway(e.clientX, e.clientY)}
              onFocus={(e) => {
                const rect = (e.target as HTMLButtonElement).getBoundingClientRect();
                moveNoAway(rect.left, rect.top);
              }}
            >
              No 🙃
            </button>
          </div>
        </div>
      </section>

      {/* Slide-up modal */}
      <div
        className={[
          "fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-2xl px-6 pb-6",
          "transition-transform duration-500 ease-out",
          accepted ? "translate-y-0" : "translate-y-[120%]",
        ].join(" ")}
        aria-hidden={!accepted}
      >
        <div className="rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">
              yay 🎉
            </div>
            <div className="mt-2 text-lg text-zinc-700 sm:text-xl">
              le petit chef date awaits on <span className="font-bold">February 14th</span> @{" "}
              <span className="font-bold">8:15pm</span>
            </div>

            <button
              onClick={() => setAccepted(false)}
              className="mt-6 rounded-2xl bg-zinc-900 px-6 py-3 font-semibold text-white transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
