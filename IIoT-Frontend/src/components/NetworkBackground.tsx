"use client";
import React, { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────
// NetworkBackground
//
// Canvas-based ambient background: a mesh of nodes (gateways/sensors)
// drifting slowly, connected by lines when close enough — and every so
// often, a node "reports" a live-looking telemetry value (temperature,
// percentage, status) that floats up and fades. It's meant to echo what
// the product actually does (real-time sensor data flowing through a
// gateway network), not just be a generic particle effect.
//
// Usage: drop <NetworkBackground /> as the first child of a
// `position: relative` container, with your actual content (e.g. the
// login card) rendered after it with a higher z-index.
// ─────────────────────────────────────────────────────────────────────────

const METRIC_SAMPLES = [
  () => `${(18 + Math.random() * 14).toFixed(1)}°C`,
  () => `${(30 + Math.random() * 65).toFixed(0)}%`,
  () => `${(0.8 + Math.random() * 2.4).toFixed(2)} bar`,
  () => (Math.random() > 0.15 ? "ONLINE" : "SYNC"),
  () => `${(2 + Math.random() * 8).toFixed(1)} A`,
];

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pulsePhase: number;
}

interface Blip {
  nodeIndex: number;
  text: string;
  life: number; // 0..1, counts down
  color: string;
}

export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: Node[] = [];
    let blips: Blip[] = [];
    let animId = 0;

    const LINK_DIST = 150;
    const NODE_COLOR = "#2563eb";
    const LINE_COLOR = "37, 99, 235";
    const GOOD_COLOR = "#059669";
    const WARN_COLOR = "#d97706";

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(70, Math.max(28, Math.floor((width * height) / 22000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1.4 + Math.random() * 1.6,
        pulsePhase: Math.random() * Math.PI * 2,
      }));
      blips = [];
    }

    function maybeSpawnBlip() {
      if (prefersReducedMotion) return;
      if (Math.random() > 0.985 && nodes.length) {
        const nodeIndex = Math.floor(Math.random() * nodes.length);
        const already = blips.some((b) => b.nodeIndex === nodeIndex);
        if (already) return;
        const sample = METRIC_SAMPLES[Math.floor(Math.random() * METRIC_SAMPLES.length)]();
        const isWarn = sample === "SYNC";
        blips.push({
          nodeIndex,
          text: sample,
          life: 1,
          color: isWarn ? WARN_COLOR : GOOD_COLOR,
        });
      }
    }

    function step() {
      ctx!.clearRect(0, 0, width, height);

      // Drift nodes
      for (const n of nodes) {
        if (!prefersReducedMotion) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;
          n.pulsePhase += 0.02;
        }
      }

      // Links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.22;
            ctx!.strokeStyle = `rgba(${LINE_COLOR}, ${alpha})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        const pulse = prefersReducedMotion ? 0 : Math.sin(n.pulsePhase) * 0.4 + 0.6;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r + pulse * 0.6, 0, Math.PI * 2);
        ctx!.fillStyle = NODE_COLOR;
        ctx!.globalAlpha = 0.55;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      // Telemetry blips
      maybeSpawnBlip();
      ctx!.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx!.textAlign = "center";
      blips = blips.filter((b) => b.life > 0);
      for (const b of blips) {
        const node = nodes[b.nodeIndex];
        if (!node) { b.life = 0; continue; }
        const riseOffset = (1 - b.life) * 26;
        const alpha = b.life < 0.25 ? b.life / 0.25 : b.life > 0.85 ? (1 - b.life) / 0.15 : 1;

        // Ring pulse at the node
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, 3 + (1 - b.life) * 14, 0, Math.PI * 2);
        ctx!.strokeStyle = b.color;
        ctx!.globalAlpha = Math.max(0, alpha * 0.5);
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        // Floating label
        ctx!.fillStyle = b.color;
        ctx!.globalAlpha = Math.max(0, alpha);
        ctx!.fillText(b.text, node.x, node.y - 14 - riseOffset);
        ctx!.globalAlpha = 1;

        b.life -= 0.006;
      }

      animId = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener("resize", resize);
    step();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}