import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';

const IMAGE_LIGHTBOX_MIN_SCALE = 0.5;
const IMAGE_LIGHTBOX_MAX_SCALE = 5;
const IMAGE_LIGHTBOX_SCALE_STEP = 0.25;

function clampImageLightboxScale(scale: number) {
  return Math.min(
    IMAGE_LIGHTBOX_MAX_SCALE,
    Math.max(IMAGE_LIGHTBOX_MIN_SCALE, scale),
  );
}

function GraphWorkspaceImageLightbox({
  alt,
  onClose,
  src,
}: {
  alt: string;
  onClose: () => void;
  src: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function updateScale(nextScale: number, clientX?: number, clientY?: number) {
    const clampedScale = clampImageLightboxScale(nextScale);
    if (clampedScale === scale) {
      return;
    }
    if (
      typeof clientX === 'number' &&
      typeof clientY === 'number' &&
      viewportRef.current
    ) {
      const rect = viewportRef.current.getBoundingClientRect();
      const anchorX = clientX - (rect.left + rect.width / 2);
      const anchorY = clientY - (rect.top + rect.height / 2);
      const ratio = clampedScale / scale;
      setOffset((current) => ({
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
      }));
    }
    setScale(clampedScale);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    updateScale(
      scale + direction * IMAGE_LIGHTBOX_SCALE_STEP,
      event.clientX,
      event.clientY,
    );
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLImageElement>) {
    if (scale <= 1 || event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    setOffset({
      x: drag.startOffsetX + event.clientX - drag.startClientX,
      y: drag.startOffsetY + event.clientY - drag.startClientY,
    });
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLImageElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    setDragging(false);
  }

  return createPortal(
    <div
      className="thread-graph-image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview: ${alt || 'workspace image'}`}
    >
      <div
        className="thread-graph-image-lightbox-toolbar"
        role="toolbar"
        aria-label="Image zoom controls"
      >
        <button
          type="button"
          onClick={() => updateScale(scale - IMAGE_LIGHTBOX_SCALE_STEP)}
          disabled={scale <= IMAGE_LIGHTBOX_MIN_SCALE}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="thread-graph-image-lightbox-scale"
          title="Reset zoom"
          aria-label={`Reset zoom, currently ${Math.round(scale * 100)}%`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{Math.round(scale * 100)}%</span>
        </button>
        <button
          type="button"
          onClick={() => updateScale(scale + IMAGE_LIGHTBOX_SCALE_STEP)}
          disabled={scale >= IMAGE_LIGHTBOX_MAX_SCALE}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span
          className="thread-graph-image-lightbox-divider"
          aria-hidden="true"
        />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          title="Close image preview"
          aria-label="Close image preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={viewportRef}
        className="thread-graph-image-lightbox-viewport"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={dragging ? 'is-dragging' : ''}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

export function ZoomableImage({
  alt,
  className,
  loading,
  src,
}: {
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  src: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  function closeLightbox() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="thread-graph-zoomable-image-trigger"
        onClick={() => setOpen(true)}
        title="Open image preview"
        aria-label={`Open image preview: ${alt || 'workspace image'}`}
      >
        <img src={src} alt={alt} className={className} loading={loading} />
      </button>
      {open ? (
        <GraphWorkspaceImageLightbox
          src={src}
          alt={alt}
          onClose={closeLightbox}
        />
      ) : null}
    </>
  );
}

