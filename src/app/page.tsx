"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  return (
    <main className="relative min-h-screen w-screen overflow-hidden bg-background">
      <Blob />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center">
        <div className="w-full max-w-xl">
          <h1 className="text-5xl font-normal tracking-tight">mappli</h1>
          <p className="mt-6 text-lg font-normal leading-7 text-foreground/70">
            The AI Marketplace community.
          </p>
          <p className="mt-4 text-lg font-normal leading-7 text-foreground/70">
            comming soon in 2026...
          </p>
        </div>
      </div>
      <WaitlistBar />
    </main>
  );
}

function WaitlistBar() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.ok) {
        setEmail("");
        setMessage("You're on the waitlist.");
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | { error?: unknown }
        | null;
      const errorText =
        data && typeof data.error === "string"
          ? data.error
          : "Could not join the waitlist.";
      setMessage(`Error: ${errorText}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-10">
      <div className="pointer-events-auto w-full max-w-3xl">
        <form onSubmit={onSubmit} className="flex items-center gap-4">
          <div className="flex h-16 flex-1 items-center rounded-full border border-foreground/10 bg-background/70 px-8 backdrop-blur">
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (message) setMessage(null);
              }}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="join the waitlist..."
              required
              disabled={isSubmitting}
              className="w-full bg-transparent text-lg text-foreground placeholder:text-foreground/40 outline-none disabled:opacity-60"
              aria-label="Email address"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/60 text-background transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
            >
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22l-4-9-9-4 20-7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        {isSubmitting ? (
          <p className="mt-3 text-center text-lg text-foreground/60">
            sending...
          </p>
        ) : message ? (
          <p className="mt-3 text-center text-lg text-foreground/60">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Blob() {
  const bubbleRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);

  const target = useRef({ x: 0, y: 0 });
  const targetSmoothed = useRef({ x: 0, y: 0 });
  const currents = useRef([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);

  const lastPointer = useRef({ x: 0, y: 0, t: 0 });
  const speedInstant = useRef(0);
  const speedSmoothed = useRef(0);
  const water = useRef({ freqX: 0.01, freqY: 0.016, disp: 12 });

  useEffect(() => {
    const setCenter = () => {
      target.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      targetSmoothed.current = { ...target.current };
      currents.current = [
        { ...target.current },
        { ...target.current },
        { ...target.current },
      ];
      lastPointer.current = { ...target.current, t: performance.now() };
      speedInstant.current = 0;
      speedSmoothed.current = 0;
    };

    setCenter();

    const onMove = (event: PointerEvent) => {
      const now = performance.now();
      const x = event.clientX;
      const y = event.clientY;
      target.current = { x, y };

      const lp = lastPointer.current;
      const dt = Math.max(8, now - lp.t);
      const dist = Math.hypot(x - lp.x, y - lp.y);
      speedInstant.current = dist / dt; // px/ms
      lastPointer.current = { x, y, t: now };
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", setCenter, { passive: true });

    let rafId = 0;
    const bubbleConfigs = [
      { lag: 0.03, drift: 24, phase: 0.0 },
      { lag: 0.02, drift: 34, phase: 1.6 },
      { lag: 0.0152, drift: 44, phase: 3.1 },
    ];

    const follow = () => {
      const turbulence = turbulenceRef.current;
      const displacement = displacementRef.current;
      const now = performance.now();

      // Smooth the pointer target so movement "fades" rather than snapping.
      const targetEase = 0.034;
      targetSmoothed.current.x +=
        (target.current.x - targetSmoothed.current.x) * targetEase;
      targetSmoothed.current.y +=
        (target.current.y - targetSmoothed.current.y) * targetEase;

      // If the pointer stops firing events, decay the instantaneous speed.
      speedInstant.current *= 0.92;

      // Smooth speed so ripples decay naturally ("fade" between deformation states).
      speedSmoothed.current +=
        (speedInstant.current - speedSmoothed.current) * 0.06;
      const intensity = Math.min(1, speedSmoothed.current / 0.9);

      // Drive watery displacement from movement intensity (smoothly; no seed jumps).
      const desiredFreqX = 0.01 + 0.032 * intensity;
      const desiredFreqY = 0.016 + 0.032 * intensity;
      const desiredDisp = 12 + 70 * intensity;

      water.current.freqX += (desiredFreqX - water.current.freqX) * 0.08;
      water.current.freqY += (desiredFreqY - water.current.freqY) * 0.08;
      water.current.disp += (desiredDisp - water.current.disp) * 0.08;

      if (turbulence) {
        const wobble = 0.0025;
        const fx = water.current.freqX + Math.sin(now * 0.0011) * wobble;
        const fy = water.current.freqY + Math.cos(now * 0.001) * wobble;
        turbulence.setAttribute(
          "baseFrequency",
          `${fx.toFixed(4)} ${fy.toFixed(4)}`,
        );
      }
      if (displacement) {
        displacement.setAttribute("scale", water.current.disp.toFixed(1));
      }

      for (let i = 0; i < bubbleConfigs.length; i++) {
        const el = bubbleRefs.current[i];
        if (!el) continue;

        const cfg = bubbleConfigs[i];
        const driftX = Math.sin(now * 0.0007 + cfg.phase) * cfg.drift;
        const driftY = Math.cos(now * 0.0006 + cfg.phase) * cfg.drift;
        const desiredX = targetSmoothed.current.x + driftX;
        const desiredY = targetSmoothed.current.y + driftY;

        currents.current[i].x += (desiredX - currents.current[i].x) * cfg.lag;
        currents.current[i].y += (desiredY - currents.current[i].y) * cfg.lag;

        el.style.setProperty("--blob-morph-duration", `${14 - intensity * 9}s`);

        // Seamless loop for size/form: drive scale/rotation with continuous waves.
        // (CSS custom properties don't interpolate between keyframes, which can cause jumps.)
        const pulse = (Math.sin(now * 0.001 + cfg.phase) + 1) / 2; // 0..1
        const baseScale = 0.90 + pulse * (0.22 - i * 0.03); // small -> big -> small
        const motionScale = 1 + intensity * (0.06 - i * 0.01);
        const scale = baseScale * motionScale;

        const baseRotate = Math.sin(now * 0.0008 + cfg.phase) * (6 - i * 1.5);
        const motionRotate = (i === 1 ? -1 : 1) * intensity * 7;
        const rotate = baseRotate + motionRotate;

        el.style.transform = `translate3d(${currents.current[i].x}px, ${currents.current[i].y}px, 0) translate3d(-50%, -50%, 0) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      }

      rafId = window.requestAnimationFrame(follow);
    };

    rafId = window.requestAnimationFrame(follow);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", setCenter);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <filter id="blob-water" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence
            ref={turbulenceRef}
            type="fractalNoise"
            baseFrequency="0.010 0.016"
            numOctaves={2}
            seed={2}
            result="noise"
          />
          <feDisplacementMap
            ref={displacementRef}
            in="SourceGraphic"
            in2="noise"
            scale={14}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </svg>

      <div
        ref={(el) => {
          bubbleRefs.current[0] = el;
        }}
        aria-hidden="true"
        style={{ filter: "url(#blob-water)", width: 208, height: 208, opacity: 0.55 }}
        className="blob-morph pointer-events-none absolute left-0 top-0 select-none bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-300 mix-blend-multiply"
      />
      <div
        ref={(el) => {
          bubbleRefs.current[1] = el;
        }}
        aria-hidden="true"
        style={{
          filter: "url(#blob-water)",
          width: 176,
          height: 176,
          opacity: 0.38,
          animationDelay: "-3.5s",
        }}
        className="blob-morph pointer-events-none absolute left-0 top-0 select-none bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-300 mix-blend-multiply"
      />
      <div
        ref={(el) => {
          bubbleRefs.current[2] = el;
        }}
        aria-hidden="true"
        style={{
          filter: "url(#blob-water)",
          width: 144,
          height: 144,
          opacity: 0.26,
          animationDelay: "-7s",
        }}
        className="blob-morph pointer-events-none absolute left-0 top-0 select-none bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-300 mix-blend-multiply"
      />
    </>
  );
}
