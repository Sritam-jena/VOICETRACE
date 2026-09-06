"use client";

import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  isActive?: boolean;
  intensity?: number; // 0.0 to 1.0
  colorScheme?: "cyan" | "emerald" | "amber";
  className?: string;
  isBackground?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  alpha: number;
}

interface PhotonParticle {
  xPct: number;
  phaseOffset: number;
  speed: number;
  size: number;
  colorIdx: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
}

export function RimeWaveformVisualizer({
  isActive = true,
  intensity = 0.7,
  colorScheme = "cyan",
  className = "w-full h-44",
  isBackground = false,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse & interaction physics
  const mouseRef = useRef({
    targetX: 0.5,
    targetY: 0.5,
    currentX: 0.5,
    currentY: 0.5,
    lastX: 0.5,
    lastY: 0.5,
    velocity: 0,
    energy: 0,
    isHovering: false,
  });

  const ripplesRef = useRef<Ripple[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const particlesRef = useRef<PhotonParticle[]>([]);

  // Initialize photon particles
  useEffect(() => {
    const particles: PhotonParticle[] = [];
    const count = isBackground ? 36 : 24;
    for (let i = 0; i < count; i++) {
      particles.push({
        xPct: i / count + (Math.random() * 0.05 - 0.025),
        phaseOffset: Math.random() * Math.PI * 2,
        speed: 0.0008 + Math.random() * 0.0012,
        size: 1.5 + Math.random() * 2.5,
        colorIdx: i % 3,
        vx: 0,
        vy: 0,
        ox: 0,
        oy: 0,
      });
    }
    particlesRef.current = particles;
  }, [isBackground]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
    };

    resize();
    const resizeObserver = new ResizeObserver(() => resize());
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Spawn acoustic ripple shockwave
    const spawnRipple = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const rx = clientX - rect.left;
      const ry = clientY - rect.top;

      if (rx >= -50 && rx <= width + 50 && ry >= -50 && ry <= height + 50) {
        ripplesRef.current.push({
          x: rx,
          y: ry,
          radius: 10,
          maxRadius: Math.max(width, height) * 0.75,
          strength: 1.0,
          alpha: 0.85,
        });
        mouseRef.current.energy = Math.min(mouseRef.current.energy + 0.8, 2.5);
      }
    };

    // Track mouse & pointer movement smoothly
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const dx = normX - mouseRef.current.lastX;
      const dy = normY - mouseRef.current.lastY;
      const speed = Math.hypot(dx, dy);

      mouseRef.current.lastX = normX;
      mouseRef.current.lastY = normY;
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
      mouseRef.current.velocity = speed;
      mouseRef.current.energy = Math.min(mouseRef.current.energy + speed * 8, 2.5);
      mouseRef.current.isHovering = true;
    };

    const handlePointerLeave = () => {
      mouseRef.current.isHovering = false;
      mouseRef.current.targetX = 0.5;
      mouseRef.current.targetY = 0.5;
    };

    const handlePointerDown = (e: PointerEvent) => {
      spawnRipple(e.clientX, e.clientY);
    };

    // If background mode, attach global listeners to capture cursor movement over the entire hero container
    if (isBackground) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerdown", handlePointerDown);
    } else {
      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerleave", handlePointerLeave);
      canvas.addEventListener("pointerdown", handlePointerDown);
    }

    // Color palettes with rich neon harmonics
    const palette = {
      cyan: {
        wave1: "#00F0FF",
        wave2: "#8B5CF6",
        wave3: "#2CC3E9",
        wave4: "#10B981",
        glow: "rgba(0, 240, 255, 0.6)",
        fillGrad1: "rgba(0, 240, 255, 0.14)",
        fillGrad2: "rgba(139, 92, 246, 0.08)",
      },
      emerald: {
        wave1: "#10B981",
        wave2: "#06B6D4",
        wave3: "#34D399",
        wave4: "#A7F3D0",
        glow: "rgba(16, 185, 129, 0.55)",
        fillGrad1: "rgba(16, 185, 129, 0.12)",
        fillGrad2: "rgba(6, 182, 212, 0.06)",
      },
      amber: {
        wave1: "#F59E0B",
        wave2: "#EC4899",
        wave3: "#FBBF24",
        wave4: "#F43F5E",
        glow: "rgba(245, 158, 11, 0.55)",
        fillGrad1: "rgba(245, 158, 11, 0.12)",
        fillGrad2: "rgba(236, 72, 153, 0.06)",
      },
    }[colorScheme];

    // Animation Loop
    const render = () => {
      if (!ctx || width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse lerping
      const m = mouseRef.current;
      m.currentX += (m.targetX - m.currentX) * 0.08;
      m.currentY += (m.targetY - m.currentY) * 0.08;
      m.energy *= 0.96; // Smooth energy decay

      // Dynamic phase speed based on activity & mouse energy
      const baseSpeed = isActive ? 0.03 : 0.015;
      const speedBoost = m.energy * 0.035;
      phaseRef.current += baseSpeed + speedBoost;
      const phase = phaseRef.current;

      const centerY = isBackground ? height * 0.52 : height * 0.5;
      const effectiveAmp =
        height * (isBackground ? 0.32 : 0.28) * Math.max(0.4, intensity) * (1 + m.energy * 0.4);

      // Update and draw expanding acoustic shockwave ripples
      const activeRipples = ripplesRef.current;
      for (let i = activeRipples.length - 1; i >= 0; i--) {
        const rip = activeRipples[i];
        rip.radius += 7;
        rip.alpha *= 0.965;
        rip.strength *= 0.965;

        // Draw glowing shockwave ring
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${rip.alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = palette.wave1;
        ctx.shadowBlur = 15;
        ctx.stroke();

        if (rip.alpha < 0.02 || rip.radius >= rip.maxRadius) {
          activeRipples.splice(i, 1);
        }
      }

      // Calculate 4 rich harmonic wave layers
      const waves = [
        {
          freq: isBackground ? 0.007 : 0.011,
          amp: effectiveAmp * 1.15,
          phaseOffset: 0,
          color: palette.wave1,
          lineWidth: isBackground ? 3.0 : 2.5,
          alpha: isBackground ? 0.95 : 0.9,
          fill: palette.fillGrad1,
        },
        {
          freq: isBackground ? 0.011 : 0.016,
          amp: effectiveAmp * 0.82,
          phaseOffset: Math.PI * 0.45,
          color: palette.wave2,
          lineWidth: isBackground ? 2.2 : 1.8,
          alpha: isBackground ? 0.8 : 0.7,
          fill: palette.fillGrad2,
        },
        {
          freq: isBackground ? 0.015 : 0.022,
          amp: effectiveAmp * 0.55,
          phaseOffset: Math.PI * 0.9,
          color: palette.wave3,
          lineWidth: isBackground ? 1.8 : 1.4,
          alpha: 0.65,
          fill: null,
        },
        {
          freq: isBackground ? 0.022 : 0.03,
          amp: effectiveAmp * 0.32,
          phaseOffset: Math.PI * 1.35,
          color: palette.wave4,
          lineWidth: 1.2,
          alpha: 0.45,
          fill: null,
        },
      ];

      // Draw each harmonic wave
      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.lineWidth;
        ctx.globalAlpha = w.alpha;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = isActive ? (isBackground ? 26 : 18) : 10;

        const step = isBackground ? 4 : 3;
        for (let x = 0; x <= width; x += step) {
          const normX = x / width;

          // 1. Mouse distance & acoustic gravity pull
          const distToMouse = Math.abs(normX - m.currentX);
          const gaussianPull = Math.exp(-Math.pow(distToMouse * 4.2, 2));
          const cursorDip = gaussianPull * (m.currentY - 0.5) * height * 0.45;

          // 2. Ripple displacement calculation
          let rippleDisplacement = 0;
          for (let r = 0; r < activeRipples.length; r++) {
            const rip = activeRipples[r];
            const d = Math.abs(x - rip.x);
            const ringDist = Math.abs(d - rip.radius);
            if (ringDist < 70) {
              const factor = (1 - ringDist / 70) * rip.strength;
              rippleDisplacement += Math.sin((d - rip.radius) * 0.08) * 35 * factor;
            }
          }

          // 3. Multi-frequency harmonic synthesis
          const harmonic1 = Math.sin(x * w.freq + phase + w.phaseOffset);
          const harmonic2 = Math.cos(x * w.freq * 0.58 - phase * 0.7) * 0.38;
          const harmonic3 = Math.sin(x * w.freq * 1.8 + phase * 1.2) * 0.15;

          const y =
            centerY +
            (harmonic1 + harmonic2 + harmonic3) * w.amp +
            cursorDip +
            rippleDisplacement;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Translucent ambient glow fill underneath primary & secondary waves
        if (w.fill) {
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, centerY - w.amp, 0, height);
          grad.addColorStop(0, w.fill);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fill();
        }
      });

      // Interactive Photon Particles floating on the waves
      const particles = particlesRef.current;
      const pColors = [palette.wave1, palette.wave2, palette.wave3];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.xPct = (p.xPct + p.speed) % 1.0;
        const px = p.xPct * width;

        // Base harmonic height
        const primaryWave = waves[0];
        const h1 = Math.sin(px * primaryWave.freq + phase + p.phaseOffset);
        const h2 = Math.cos(px * primaryWave.freq * 0.58 - phase * 0.7) * 0.38;
        let py = centerY + (h1 + h2) * primaryWave.amp;

        // Mouse repulsion & interactive flare
        const dx = px - m.currentX * width;
        const dy = py - m.currentY * height;
        const dist = Math.hypot(dx, dy);

        let particleScale = 1.0;
        let pAlpha = 0.8;

        if (dist < 140) {
          const repelForce = (1 - dist / 140) * 35;
          const angle = Math.atan2(dy, dx);
          p.ox += (Math.cos(angle) * repelForce - p.ox) * 0.15;
          p.oy += (Math.sin(angle) * repelForce - p.oy) * 0.15;
          particleScale = 1.0 + (1 - dist / 140) * 1.5;
          pAlpha = 1.0;
        } else {
          p.ox *= 0.88;
          p.oy *= 0.88;
        }

        const finalX = px + p.ox;
        const finalY = py + p.oy;

        ctx.beginPath();
        ctx.arc(finalX, finalY, p.size * particleScale, 0, Math.PI * 2);
        ctx.fillStyle = pColors[p.colorIdx];
        ctx.shadowColor = pColors[p.colorIdx];
        ctx.shadowBlur = isBackground ? 18 : 12;
        ctx.globalAlpha = pAlpha;
        ctx.fill();
      }

      // Cursor reticle indicator if hovering
      if (m.isHovering && !isBackground) {
        const cx = m.currentX * width;
        const cy = m.currentY * height;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = palette.wave1;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = palette.wave1;
        ctx.shadowBlur = 10;
        ctx.stroke();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      resizeObserver.disconnect();
      if (isBackground) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerdown", handlePointerDown);
      } else {
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerleave", handlePointerLeave);
        canvas.removeEventListener("pointerdown", handlePointerDown);
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, intensity, colorScheme, isBackground]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${
        isBackground ? "w-full h-full pointer-events-auto select-none" : "rounded-2xl " + className
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
      />

      {/* Ambient mask fade on edges when in background mode */}
      {isBackground && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#09090b]/40 via-transparent to-[#09090b]/70" />
      )}

      {/* Minimal subtle badge only when displayed as standalone box */}
      {!isBackground && (
        <div className="absolute bottom-2 right-3 pointer-events-none text-[11px] font-sfmono text-zinc-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Interactive Harmonic Canvas</span>
        </div>
      )}
    </div>
  );
}
