"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
}

export function BottomSheet({ isOpen, onClose, children, title, snapPoints = [0.4, 0.85] }: BottomSheetProps) {
  const [snapIndex, setSnapIndex] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentTranslate = useRef(0);

  useEffect(() => {
    let frame: number | undefined;
    if (isOpen) {
      document.body.style.overflow = "hidden";
      frame = window.requestAnimationFrame(() => setSnapIndex(0));
    }
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = e.changedTouches[0].clientY - startY.current;
      if (diff > 100) {
        if (snapIndex === 0) {
          onClose();
        } else {
          setSnapIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (diff < -100) {
        setSnapIndex((prev) => Math.min(snapPoints.length - 1, prev + 1));
      }
      currentTranslate.current = 0;
    },
    [snapIndex, snapPoints, onClose],
  );

  if (!isOpen) return null;

  const height = `${snapPoints[snapIndex] * 100}vh`;

  return (
    <div className="fixed inset-0 z-[9999] md:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl transition-all duration-300 ease-out"
        style={{ height }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-zinc-300" />
        </div>
        {title && (
          <div className="px-4 pb-3 border-b border-zinc-100">
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          </div>
        )}
        <div className="overflow-y-auto px-4 py-3" style={{ height: `calc(100% - ${title ? "80px" : "40px"})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
