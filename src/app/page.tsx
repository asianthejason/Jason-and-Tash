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

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Page() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);

  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);

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
    setDeclined(false);
    setAccepted(true);
    popConfetti();
  };

  const handleNo = () => {
    setAccepted(false);
    setDeclined(true);
  };

  // --- Teleporting "No" button (clickable, but very hard to click) ---
  const [noPos, setNoPos] = useState<{ left: number; top: number } | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  const teleportNo = () => {
    if (!noBtnRef.current) return;

    const btn = noBtnRef.current.getBoundingClientRect();
    const pad = 14;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Keep it around the sides (top, bottom, left, right bands)
    // and avoid the central card a bit by biasing to edges.
    const side = randInt(0, 3); // 0=top,1=right,2=bottom,3=left
    const band = 80; // distance from edge
    let left = 0;
    let top = 0;

    const minL = pad;
    const minT = pad;
    const maxL = vw - btn.width - pad;
    const maxT = vh - btn.height - pad;

    if (side === 0) {
      // top band
      top = randInt(minT, clamp(band, minT, maxT));
      left = randInt(minL, maxL);
    } else if (side === 1) {
      // right band
      left = randInt(clamp(maxL - band, minL, maxL), maxL);
      top = randInt(minT, maxT);
    } else if (side === 2) {
      // bottom band
      top = randInt(clamp(maxT - band, minT, maxT), maxT);
      left = randInt(minL, maxL);
    } else {
      // left band
      left = randInt(minL, clamp(band, minL, maxL));
      top = randInt(minT, maxT);
    }

    // If mouse is very close to target, re-roll once to reduce "teleport into cursor"
    const m = mouseRef.current;
    if (m) {
      const cx = left + btn.width / 2;
      const cy = top + btn.height / 2;
      const d = Math.hypot(cx - m.x, cy - m.y);
      if (d < 160) {
        // re-roll quickly
        const newSide = (side + randInt(1, 3)) % 4;
        // quick deterministic re-roll
        if (newSide === 0) {
          top = randInt(minT, clamp(band, minT, maxT));
          left = randInt(minL, maxL);
        } else if (newSide === 1) {
          left = randInt(clamp(maxL - band, minL, maxL), maxL);
          top = randInt(minT, maxT);
        } else if (newSide === 2) {
          top = randInt(clamp(maxT - band, minT, maxT), maxT);
          left = randInt(minL, maxL);
        } else {
          left = randInt(minL, clamp(band, minL, maxL));
          top = randInt(minT, maxT);
        }
      }
    }

    setNoPos({ left: clamp(left, minL, maxL), top: clamp(top, minT, maxT) });
  };

  // Initial placement near the Yes button (then it starts teleporting when you approach)
  useEffect(() => {
    const t = setTimeout(() => {
      // place it roughly beside the center card initially
      setNoPos({ left: window.innerWidth / 2 + 120, top: window.innerHeight / 2 + 80 });
    }, 0);

    const onResize = () => {
      teleportNo();
    };

    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic teleport so it keeps "skittering" around the edges
  useEffect(() => {
    const id = window.setInterval(() => {
      // Don’t teleport while the decline modal is open (so they can see/click other things)
      if (!declined && !accepted) teleportNo();
    }, 650); // quick but not nauseating
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declined, accepted]);

  const maybeTeleportIfClose = (mx: number, my: number) => {
    if (!noBtnRef.current || !noPos) return;
    const r = noBtnRef.current.getBoundingClientRect();
    // If cursor is within a radius, teleport away immediately
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(cx - mx, cy - my);

    const danger = 140; // make it hard to get close
    if (d < danger) teleportNo();
  };

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-red-100"
      onMouseMove={(e) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
        maybeTeleportIfClose(e.clientX, e.clientY);
      }}
      onMouseLeave={() => {
        mouseRef.current = null;
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) {
          mouseRef.current = { x: t.clientX, y: t.clientY };
          maybeTeleportIfClose(t.clientX, t.clientY);
        }
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

            {/* Placeholder so the UI reads "Yes / No" even while real No teleports */}
            <div className="rounded-2xl bg-zinc-900/10 px-7 py-4 text-lg font-bold text-zinc-900/30 shadow-lg">
              No 🙃
            </div>
          </div>
        </div>
      </section>

      {/* Real teleporting NO button (clickable) */}
      <button
        ref={noBtnRef}
        type="button"
        className="fixed z-30 rounded-2xl bg-zinc-900/90 px-7 py-4 text-lg font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
        style={{
          left: noPos?.left ?? -9999,
          top: noPos?.top ?? -9999,
        }}
        onMouseEnter={() => teleportNo()}
        onMouseDown={() => teleportNo()} // makes it VERY hard to click
        onClick={(e) => {
          // If they actually click, show the "sad" modal.
          e.stopPropagation();
          handleNo();
        }}
        aria-label="No"
      >
        No 🙃
      </button>

      {/* YES modal */}
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

      {/* NO modal */}
      <div
        className={[
          "fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-2xl px-6 pb-6",
          "transition-transform duration-500 ease-out",
          declined ? "translate-y-0" : "translate-y-[120%]",
        ].join(" ")}
        aria-hidden={!declined}
      >
        <div className="rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">oh… 😢</div>
            <div className="mt-2 text-lg text-zinc-700 sm:text-xl">
              I guess you really don’t want to be my valentine. :(
            </div>

            <button
              onClick={() => setDeclined(false)}
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
