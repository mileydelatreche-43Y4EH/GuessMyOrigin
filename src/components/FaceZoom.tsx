"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "@/lib/types";

interface Props {
  src: string;
  caption?: string | null;
  mode: GameMode;
  /** Timestamp fin du flash hardcore (null = pas de flash / déjà fini) */
  flashEndsAt: number | null;
  /** Après révélation manche : on réaffiche la photo */
  forceShow?: boolean;
}

export default function FaceZoom({
  src,
  caption,
  mode,
  flashEndsAt,
  forceShow = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [flashing, setFlashing] = useState(false);
  const [flashGone, setFlashGone] = useState(false);
  const [flashLeft, setFlashLeft] = useState(0);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    resetView();
  }, [resetView]);

  /* Hardcore flash lifecycle */
  useEffect(() => {
    setOpen(false);
    resetView();

    if (forceShow || mode !== "hardcore") {
      setFlashing(false);
      setFlashGone(false);
      return;
    }

    if (!flashEndsAt) {
      setFlashing(false);
      setFlashGone(true);
      return;
    }

    const tick = () => {
      const left = flashEndsAt - Date.now();
      if (left <= 0) {
        setFlashing(false);
        setFlashGone(true);
        setFlashLeft(0);
        return false;
      }
      setFlashing(true);
      setFlashGone(false);
      setFlashLeft(left);
      return true;
    };

    if (!tick()) return;
    const id = setInterval(() => {
      if (!tick()) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [src, mode, flashEndsAt, forceShow, resetView]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(5, s + 0.25));
      if (e.key === "-") setScale((s) => Math.max(1, s - 0.25));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => {
      const next = Math.min(5, Math.max(1, s + delta));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const showDock = mode !== "hardcore" || forceShow;
  const canOpen = showDock;

  return (
    <>
      {/* Flash hardcore plein écran */}
      {flashing && (
        <div className="hardcore-flash" aria-live="polite">
          <div className="hardcore-flash-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Mémorise ce visage" draggable={false} />
            <div className="hardcore-flash-meta">
              <span className="hardcore-tag">HARDCORE</span>
              <span className="hardcore-timer">
                {(flashLeft / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder après flash */}
      {mode === "hardcore" && flashGone && !forceShow && (
        <div className="face-dock face-dock-gone" aria-hidden>
          <span className="face-gone-mark">?</span>
          <span className="face-dock-hint dim">Flash terminé</span>
        </div>
      )}

      {showDock && (
        <button
          type="button"
          className="face-dock"
          onClick={() => canOpen && setOpen(true)}
          aria-label="Agrandir la photo"
        >
          <span className="face-dock-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Visage à placer" draggable={false} />
            <span className="face-dock-hint">Agrandir</span>
          </span>
          {caption && <span className="face-dock-cap">{caption}</span>}
        </button>
      )}

      {open && canOpen && (
        <div className="face-lightbox" role="dialog" aria-modal="true">
          <div className="face-lightbox-bar">
            <button type="button" className="lb-btn" onClick={close}>
              Fermer
            </button>
            <div className="lb-zoom-controls">
              <button
                type="button"
                className="lb-btn round"
                onClick={() => setScale((s) => Math.max(1, s - 0.25))}
                aria-label="Dézoomer"
              >
                −
              </button>
              <span className="lb-zoom-label">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                className="lb-btn round"
                onClick={() => setScale((s) => Math.min(5, s + 0.25))}
                aria-label="Zoomer"
              >
                +
              </button>
              <button type="button" className="lb-btn" onClick={resetView}>
                Reset
              </button>
            </div>
          </div>

          <div
            className="face-lightbox-stage"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={() => {
              if (scale > 1) resetView();
              else setScale(2.2);
            }}
            style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Visage agrandi"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
            />
          </div>

          <p className="face-lightbox-tip">
            Molette pour zoomer · glisser pour bouger · double-clic · Échap
          </p>
        </div>
      )}
    </>
  );
}
