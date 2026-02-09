"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// canvas-confetti sometimes lacks TS types depending on setup; require avoids build type errors.
 // eslint-disable-next-line @typescript-eslint/no-var-requires
const confetti = require("canvas-confetti");

type Photo = {
  src: string;
  alt: string;
  style: React.CSSProperties;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export default function Page() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);

  const [accepted, setAccepted] = useState(false);

  // --- Photos (put your images in /public/photos and update filenames if needed) ---
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

  // --- Confetti ---
  const popConfetti = () => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.72 } });
    setTimeout(() => confetti({ particleCount: 90, spread: 100, origin: { x: 0.2, y: 0.6 } }), 140);
    setTimeout(() => confetti({ particleCount: 90, spread: 100, origin: { x: 0.8, y: 0.6 } }), 240);
  };

  const handleYes = () => {
    setAccepted(true);
    popConfetti();
  };

  // --- "Elastic + repelling magnet" No button physics ---
  // We keep the No button in the flex row (next to Yes), and animate it using translate().
  // Anchor (0,0) is "beside Yes". The button is pulled back to anchor by a spring, and
  // pushed away from the cursor when the cursor gets close.
  const [noOffset, setNoOffset] = useState({ x: 0, y: 0 });

  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  // Anchor position (top-left) of the No button when offset is (0,0)
  const anchorTopLeftRef = useRef<{ left: number; top: number } | null>(null);
  const btnSizeRef = useRef<{ w: number; h: number } | null>(null);

  const measureAnchor = () => {
    if (!noBtnRef.current) return;
    // Reset to anchor visually before measuring
    posRef.current = { x: 0, y: 0 };
    velRef.current = { x: 0, y: 0 };
    setNoOffset({ x: 0, y: 0 });

    // Next tick to ensure DOM has applied transform reset
    requestAnimationFrame(() => {
      if (!noBtnRef.current) return;
      const r = noBtnRef.current.getBoundingClientRect();
      anchorTopLeftRef.current = { left: r.left, top: r.top };
      btnSizeRef.current = { w: r.width, h: r.height };
    });
  };

  useEffect(() => {
    measureAnchor();
    const onResize = () => {
      // Re-anchor on resize (keeps it beside Yes)
      measureAnchor();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When closing the modal, let the No button calmly return to anchor
  useEffect(() => {
    if (!accepted) {
      // small reset so it feels like it rebounds back
      // (physics will do the rest)
      velRef.current = { x: 0, y: 0 };
    }
  }, [accepted]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); // cap dt for stability
      last = now;

      const pos = posRef.current;
      const vel = velRef.current;
      const mouse = mouseRef.current;

      // Spring back to anchor: F = -k x - c v
      const k = 55; // stiffness
      const c = 12; // damping

      let ax = -k * pos.x - c * vel.x;
      let ay = -k * pos.y - c * vel.y;

      // Repel from cursor if close ("magnet")
      if (mouse && anchorTopLeftRef.current && btnSizeRef.current) {
        const { w, h } = btnSizeRef.current;
        const anchor = anchorTopLeftRef.current;

        // Current center of the button on screen:
        const cx = anchor.left + pos.x + w / 2;
        const cy = anchor.top + pos.y + h / 2;

        const dx = cx - mouse.x;
        const dy = cy - mouse.y;
        const d = Math.hypot(dx, dy);

        const influence = 140; // how close before it reacts
        if (d < influence) {
          const strength = 2200; // repel strength
          const t = 1 - d / influence; // 0..1
          const ux = dx / Math.max(1, d);
          const uy = dy / Math.max(1, d);

          // Push away more as you get closer
          ax += ux * strength * t;
          ay += uy * strength * t;
        }
      }

      // Integrate (semi-implicit Euler)
      vel.x += ax * dt;
      vel.y += ay * dt;

      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // Elastic band: clamp max distance from anchor
      const maxLen = 180;
      const len = Math.hypot(pos.x, pos.y);
      if (len > maxLen) {
        const s = maxLen / Math.max(1, len);
        pos.x *= s;
        pos.y *= s;
        // damp velocity when hitting the band
        vel.x *= 0.6;
        vel.y *= 0.6;
      }

      // Keep button on-screen (prevents teleport/offscreen)
      if (anchorTopLeftRef.current && btnSizeRef.current) {
        const { w, h } = btnSizeRef.current;
        const anchor = anchorTopLeftRef.current;

        const pad = 10;
        const minL = pad;
        const minT = pad;
        const maxL = window.innerWidth - w - pad;
        const maxT = window.innerHeight - h - pad;

        // current top-left
        let L = anchor.left + pos.x;
        let T = anchor.top + pos.y;

        const clampedL = clamp(L, minL, maxL);
        const clampedT = clamp(T, minT, maxT);

        if (clampedL !== L) {
          pos.x += clampedL - L;
          vel.x *= -0.25;
        }
        if (clampedT !== T) {
          pos.y += clampedT - T;
          vel.y *= -0.25;
        }
      }

      posRef.current = pos;
      velRef.current = vel;

      // Update React state (drives transform)
      setNoOffset({ x: pos.x, y: pos.y });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-red-100"
      onMouseMove={(e) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseLeave={() => {
        mouseRef.current = null;
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) mouseRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={() => {
        mouseRef.current = null;
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
          <div className="mb-3 text-sm font-semibold tracking-wide text-rose-600">💌 a very important question</div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">
            will you be my <span className="text-rose-600">valentine</span>
          </h1>

          <p className="mt-4 text-zinc-600">(there is a correct answer…)</p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handleYes}
              className="rounded-2xl bg-rose-600 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-[1.03] active:scale-[0.98]"
            >
              Yes 💖
            </button>

            <button
              ref={noBtnRef}
              type="button"
              className="rounded-2xl bg-zinc-900/85 px-7 py-4 text-lg font-bold text-white shadow-lg select-none"
              style={{
                transform: `translate(${noOffset.x}px, ${noOffset.y}px)`,
                willChange: "transform",
                touchAction: "none",
              }}
              onMouseEnter={() => {
                // ensure anchor is measured before physics has to behave
                if (!anchorTopLeftRef.current) measureAnchor();
              }}
              onFocus={() => {
                // keyboard focus shouldn't allow click; nudge away by setting "mouse" near it
                if (noBtnRef.current) {
                  const r = noBtnRef.current.getBoundingClientRect();
                  mouseRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                }
              }}
              onClick={(e) => {
                // Extra safety: if someone somehow clicks it, just prevent default.
                e.preventDefault();
              }}
              aria-label="No"
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
            <div className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">yay 🎉</div>
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
