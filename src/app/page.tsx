"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// canvas-confetti sometimes lacks TS types depending on setup; require avoids build type errors.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const confetti = require("canvas-confetti");

type Photo = {
  src: string;
  alt: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Page() {
  const noBtnRef = useRef<HTMLButtonElement | null>(null);

  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);

  // --- Photos (put your images in /public/photos and update filenames if needed) ---
  const photos: Photo[] = useMemo(
    () => [
      { src: "/photos/1.jpg", alt: "Photo 1" },
      { src: "/photos/2.jpg", alt: "Photo 2" },
      { src: "/photos/3.jpg", alt: "Photo 3" },
      { src: "/photos/4.jpg", alt: "Photo 4" },
      { src: "/photos/5.JPG", alt: "Photo 5" },
      { src: "/photos/6.JPG", alt: "Photo 6" },
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

    const minL = pad;
    const minT = pad;
    const maxL = vw - btn.width - pad;
    const maxT = vh - btn.height - pad;

    // Keep it around the sides (top, bottom, left, right bands), and away from the center card.
    const side = randInt(0, 3); // 0=top,1=right,2=bottom,3=left
    const band = 90;

    let left = 0;
    let top = 0;

    if (side === 0) {
      top = randInt(minT, clamp(band, minT, maxT));
      left = randInt(minL, maxL);
    } else if (side === 1) {
      left = randInt(clamp(maxL - band, minL, maxL), maxL);
      top = randInt(minT, maxT);
    } else if (side === 2) {
      top = randInt(clamp(maxT - band, minT, maxT), maxT);
      left = randInt(minL, maxL);
    } else {
      left = randInt(minL, clamp(band, minL, maxL));
      top = randInt(minT, maxT);
    }

    // If mouse is close, reroll once so it doesn't land under the cursor.
    const m = mouseRef.current;
    if (m) {
      const cx = left + btn.width / 2;
      const cy = top + btn.height / 2;
      const d = Math.hypot(cx - m.x, cy - m.y);
      if (d < 170) {
        left = randInt(minL, maxL);
        top = side % 2 === 0 ? (side === 0 ? minT : maxT) : top;
      }
    }

    setNoPos({ left: clamp(left, minL, maxL), top: clamp(top, minT, maxT) });
  };

  // Initial placement (so it appears quickly)
  useEffect(() => {
    const t = setTimeout(() => {
      setNoPos({ left: window.innerWidth * 0.12, top: window.innerHeight * 0.22 });
    }, 0);

    const onResize = () => teleportNo();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic teleport so it keeps skittering around the edges
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!declined && !accepted) teleportNo();
    }, 650);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declined, accepted]);

  const maybeTeleportIfClose = (mx: number, my: number) => {
    if (!noBtnRef.current || !noPos) return;
    const r = noBtnRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.hypot(cx - mx, cy - my);

    const danger = 140;
    if (d < danger) teleportNo();
  };

  return (
    <main
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

      {/* MOBILE layout: photos in a grid ABOVE and BELOW so they never get hidden by the card */}
      <div className="relative z-0 mx-auto w-full max-w-3xl px-4 pt-6 sm:hidden">
        <div className="grid grid-cols-2 gap-4">
          {photos.slice(0, 4).map((p) => (
            <div key={p.src} className="rounded-3xl bg-white/70 p-2 shadow-xl backdrop-blur">
              <img src={p.src} alt={p.alt} className="h-40 w-full rounded-2xl object-cover" draggable={false} />
            </div>
          ))}
        </div>
      </div>

      {/* DESKTOP/TABLET collage: absolute photos, placed to avoid overlaps */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {/* left column */}
        <div className="absolute left-6 top-10 w-[210px] md:w-[240px] rotate-[-6deg] drop-shadow-xl">
          <div className="rounded-3xl bg-white/70 p-2 backdrop-blur">
            <img src={photos[0].src} alt={photos[0].alt} className="h-[220px] w-full rounded-2xl object-cover md:h-[250px]" draggable={false} />
          </div>
        </div>

        <div className="absolute left-8 bottom-10 w-[220px] md:w-[260px] rotate-[6deg] drop-shadow-xl">
          <div className="rounded-3xl bg-white/70 p-2 backdrop-blur">
            <img src={photos[2].src} alt={photos[2].alt} className="h-[230px] w-full rounded-2xl object-cover md:h-[270px]" draggable={false} />
          </div>
        </div>

        {/* right column */}
        <div className="absolute right-6 top-12 w-[210px] md:w-[240px] rotate-[7deg] drop-shadow-xl">
          <div className="rounded-3xl bg-white/70 p-2 backdrop-blur">
            <img src={photos[1].src} alt={photos[1].alt} className="h-[220px] w-full rounded-2xl object-cover md:h-[250px]" draggable={false} />
          </div>
        </div>

        <div className="absolute right-8 bottom-12 w-[220px] md:w-[260px] rotate-[-7deg] drop-shadow-xl">
          <div className="rounded-3xl bg-white/70 p-2 backdrop-blur">
            <img src={photos[3].src} alt={photos[3].alt} className="h-[230px] w-full rounded-2xl object-cover md:h-[270px]" draggable={false} />
          </div>
        </div>

        {/* mid-left & mid-right (smaller) */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-[170px] md:w-[200px] rotate-[10deg] drop-shadow-xl">
          <div className="rounded-3xl bg-white/60 p-2 backdrop-blur">
            <img src={photos[4].src} alt={photos[4].alt} className="h-[180px] w-full rounded-2xl object-cover md:h-[210px]" draggable={false} />
          </div>
        </div>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-[170px] md:w-[200px] rotate-[-10deg] drop-shadow-xl">
          <div className="rounded-3xl bg-white/60 p-2 backdrop-blur">
            <img src={photos[5].src} alt={photos[5].alt} className="h-[180px] w-full rounded-2xl object-cover md:h-[210px]" draggable={false} />
          </div>
        </div>
      </div>

      {/* Center content */}
      <section className="relative z-10 flex min-h-[70vh] items-center justify-center px-4 py-8 sm:min-h-screen sm:px-6">
        <div className="w-full max-w-2xl rounded-[2rem] bg-white/70 p-6 text-center shadow-2xl backdrop-blur-md sm:p-10">
          <div className="mb-3 text-sm font-semibold tracking-wide text-rose-600">💌 a very important question</div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">
            will you be my <span className="text-rose-600">valentine</span>
          </h1>



          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={handleYes}
              className="rounded-2xl bg-rose-600 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-[1.03] active:scale-[0.98]"
            >
              Yes 💖
            </button>
          </div>

          <p className="mt-6 text-xs text-zinc-500 sm:text-sm">P.S. There might be a “No” button… somewhere 😈</p>
        </div>
      </section>

      {/* MOBILE bottom photos so card never hides them */}
      <div className="relative z-0 mx-auto w-full max-w-3xl px-4 pb-10 sm:hidden">
        <div className="grid grid-cols-2 gap-4">
          {photos.slice(4).map((p) => (
            <div key={p.src} className="rounded-3xl bg-white/70 p-2 shadow-xl backdrop-blur">
              <img src={p.src} alt={p.alt} className="h-40 w-full rounded-2xl object-cover" draggable={false} />
            </div>
          ))}
        </div>
      </div>

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
        onMouseDown={() => teleportNo()}
        onTouchStart={() => teleportNo()}
        onClick={(e) => {
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
