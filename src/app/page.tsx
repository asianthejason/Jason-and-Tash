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
  const yesBtnRef = useRef<HTMLButtonElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);

  const [accepted, setAccepted] = useState(false);
  const acceptedRef = useRef(false);


  // "No" button is free to move, but it should START beside "Yes"
  const [noPos, setNoPos] = useState<{ left: number; top: number } | null>(null);

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

  const placeNoNextToYes = () => {
    if (!yesBtnRef.current || !noBtnRef.current) return;

    const yes = yesBtnRef.current.getBoundingClientRect();
    const no = noBtnRef.current.getBoundingClientRect();

    const gap = 14;

    // Position "No" just to the right of "Yes" (same vertical alignment)
    setNoPos({
      left: yes.right + gap,
      top: yes.top + (yes.height - no.height) / 2,
    });
  };

  useEffect(() => {
    // Wait a tick so the buttons have measured sizes
    const t = setTimeout(() => placeNoNextToYes(), 0);

    const onResize = () => {
      // If not accepted yet, keep it nicely positioned by Yes on resize
      if (!acceptedRef.current) placeNoNextToYes();
    };

    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const popConfetti = () => {
    // a few bursts
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.6 } }), 150);
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.6 } }), 250);
  };

  const handleYes = () => {
    acceptedRef.current = true;
    setAccepted(true);
    popConfetti();
  };

  // Keep the "No" always teasingly close to the cursor while still escaping.
  const moveNoAway = (clientX: number, clientY: number) => {
    if (!noBtnRef.current) return;

    const btn = noBtnRef.current.getBoundingClientRect();

    // Tune these to taste:
    const MIN_R = 90; // minimum distance away
    const MAX_R = 160; // never farther than this
    const pad = 12;

    // Pick a random angle and radius in [MIN_R, MAX_R]
    const angle = Math.random() * Math.PI * 2;
    const r = MIN_R + Math.random() * (MAX_R - MIN_R);

    let left = clientX + Math.cos(angle) * r - btn.width / 2;
    let top = clientY + Math.sin(angle) * r - btn.height / 2;

    // Clamp inside viewport
    const maxL = window.innerWidth - btn.width - pad;
    const maxT = window.innerHeight - btn.height - pad;

    left = Math.min(Math.max(pad, left), maxL);
    top = Math.min(Math.max(pad, top), maxT);

    setNoPos({ left, top });
  };

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-red-100"
      onMouseMove={(e) => {
        if (acceptedRef.current) return;
        if (!noBtnRef.current) return;

        const b = noBtnRef.current.getBoundingClientRect();
        const near =
          e.clientX > b.left - 70 &&
          e.clientX < b.right + 70 &&
          e.clientY > b.top - 70 &&
          e.clientY < b.bottom + 70;

        if (near) moveNoAway(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if (acceptedRef.current) return;
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

          <p className="mt-4 text-zinc-600">(there is a correct answer…)</p>

          <div className="relative mt-8 flex items-center justify-center gap-4">
            <button
              ref={yesBtnRef}
              onClick={handleYes}
              className="rounded-2xl bg-rose-600 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-[1.03] active:scale-[0.98]"
            >
              Yes 💖
            </button>

            {/* Invisible placeholder so layout still looks like "two buttons" */}
            <button
              type="button"
              className="rounded-2xl bg-zinc-900/20 px-7 py-4 text-lg font-bold text-zinc-900/30 shadow-lg"
              style={{ pointerEvents: "none" }}
              aria-hidden="true"
            >
              No 🙃
            </button>

            {/* Real "No" button that dodges */}
            <button
              ref={noBtnRef}
              type="button"
              className="rounded-2xl bg-zinc-900/85 px-7 py-4 text-lg font-bold text-white shadow-lg"
              style={{
                position: "fixed",
                left: noPos?.left ?? -9999,
                top: noPos?.top ?? -9999,
                zIndex: 50,
              }}
              aria-label="No"
              onMouseEnter={(e) => moveNoAway(e.clientX, e.clientY)}
              onFocus={(e) => {
                const rect = (e.target as HTMLButtonElement).getBoundingClientRect();
                moveNoAway(rect.left + rect.width / 2, rect.top + rect.height / 2);
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
            <div className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">yay 🎉</div>
            <div className="mt-2 text-lg text-zinc-700 sm:text-xl">
              le petit chef date awaits on <span className="font-bold">February 14th</span> @{" "}
              <span className="font-bold">8:15pm</span>
            </div>

            <button
              onClick={() => {
                acceptedRef.current = false;
                setAccepted(false);
                // When closing, put the "No" back beside "Yes"
                setTimeout(() => placeNoNextToYes(), 0);
              }}
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
