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
      { src: "/photos/5.JPG", alt: "Photo 5", style: { top: "42%", left: "2%", transform: "rotate(10deg)" } },
      { src: "/photos/6.JPG", alt: "Photo 6", style: { top: "46%", right: "2%", transform: "rotate(-10deg)" } },
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
  // No button stays next to Yes in layout; we animate it via translate() with a gentle spring + cursor repulsion.
  // Goal: it never lets the cursor touch it, but it also shouldn't jitter/spaz.
  const [noOffset, setNoOffset] = useState({ x: 0, y: 0 });

  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  // Anchor (top-left) of the No button when offset is (0,0)
  const anchorTopLeftRef = useRef<{ left: number; top: number } | null>(null);
  const btnSizeRef = useRef<{ w: number; h: number } | null>(null);

  const measureAnchor = () => {
    if (!noBtnRef.current) return;
    // Reset to anchor visually before measuring
    posRef.current = { x: 0, y: 0 };
    velRef.current = { x: 0, y: 0 };
    setNoOffset({ x: 0, y: 0 });

    requestAnimationFrame(() => {
      if (!noBtnRef.current) return;
      const r = noBtnRef.current.getBoundingClientRect();
      anchorTopLeftRef.current = { left: r.left, top: r.top };
      btnSizeRef.current = { w: r.width, h: r.height };
    });
  };

  useEffect(() => {
    measureAnchor();
    const onResize = () => measureAnchor();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accepted) {
      // Let it rebound to home
      velRef.current = { x: 0, y: 0 };
    }
  }, [accepted]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.03, (now - last) / 1000); // stable dt cap
      last = now;

      const pos = posRef.current;
      const vel = velRef.current;
      const mouse = mouseRef.current;

      // Gentler spring back to anchor
      const k = 28; // stiffness (lower = less snap-back)
      const c = 10; // damping

      let ax = -k * pos.x - c * vel.x;
      let ay = -k * pos.y - c * vel.y;

      if (mouse && anchorTopLeftRef.current && btnSizeRef.current) {
        const { w, h } = btnSizeRef.current;
        const anchor = anchorTopLeftRef.current;

        // Current center of the button on screen:
        const cx = anchor.left + pos.x + w / 2;
        const cy = anchor.top + pos.y + h / 2;

        const dx = cx - mouse.x;
        const dy = cy - mouse.y;
        const d = Math.hypot(dx, dy);

        // Smooth repulsion (no impulses) to avoid jitter
        const influence = 175;
        if (d < influence) {
          const strength = 2000; // gentler than before
          const t = 1 - d / influence; // 0..1
          const ux = dx / Math.max(1, d);
          const uy = dy / Math.max(1, d);

          // ease curve (smooth near edge, stronger near center)
          const ease = t * t;
          ax += ux * strength * ease;
          ay += uy * strength * ease;
        }

        // HARD SAFETY (gentle): if cursor enters the padded rectangle,
        // nudge the position out WITHOUT a big velocity impulse.
        const safe = 24;
        const L = anchor.left + pos.x;
        const T = anchor.top + pos.y;
        const R = L + w;
        const B = T + h;

        const inX = mouse.x >= L - safe && mouse.x <= R + safe;
        const inY = mouse.y >= T - safe && mouse.y <= B + safe;

        if (inX && inY) {
          const leftOverlap = mouse.x - (L - safe);
          const rightOverlap = (R + safe) - mouse.x;
          const topOverlap = mouse.y - (T - safe);
          const botOverlap = (B + safe) - mouse.y;

          const minX = Math.min(leftOverlap, rightOverlap);
          const minY = Math.min(topOverlap, botOverlap);

          const shove = 8; // small extra spacing
          if (minX < minY) {
            const dir = leftOverlap < rightOverlap ? -1 : 1;
            pos.x += dir * (minX + shove) * 0.45; // partial correction = gentle
            vel.x *= 0.35; // damp instead of impulse
          } else {
            const dir = topOverlap < botOverlap ? -1 : 1;
            pos.y += dir * (minY + shove) * 0.45;
            vel.y *= 0.35;
          }
        }
      }

      // Integrate (semi-implicit Euler)
      vel.x += ax * dt;
      vel.y += ay * dt;

      // Cap velocity to prevent spazzing
      const vMax = 850;
      vel.x = clamp(vel.x, -vMax, vMax);
      vel.y = clamp(vel.y, -vMax, vMax);

      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // Elastic band: clamp max distance from anchor (keeps it near its home)
      const maxLen = 150;
      const len = Math.hypot(pos.x, pos.y);
      if (len > maxLen) {
        const s = maxLen / Math.max(1, len);
        pos.x *= s;
        pos.y *= s;
        vel.x *= 0.55;
        vel.y *= 0.55;
      }

      // Keep button on-screen (very soft)
      if (anchorTopLeftRef.current && btnSizeRef.current) {
        const { w, h } = btnSizeRef.current;
        const anchor = anchorTopLeftRef.current;

        const pad = 10;
        const minL = pad;
        const minT = pad;
        const maxL = window.innerWidth - w - pad;
        const maxT = window.innerHeight - h - pad;

        const L = anchor.left + pos.x;
        const T = anchor.top + pos.y;

        const clampedL = clamp(L, minL, maxL);
        const clampedT = clamp(T, minT, maxT);

        // apply a gentle correction rather than a bounce
        pos.x += (clampedL - L) * 0.7;
        pos.y += (clampedT - T) * 0.7;

        vel.x *= 0.85;
        vel.y *= 0.85;
      }

      posRef.current = pos;
      velRef.current = vel;

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
                // Cursor can never actually hover/click it (and that removes edge-case "touch").
                pointerEvents: "none",
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
