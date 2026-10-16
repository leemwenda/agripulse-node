import { useEffect, useRef, useState } from 'react';
import { useProtectedImage } from './hooks';

interface Props {
  id: string;
  alt: string;
  fit?: 'cover' | 'contain';
  /** Defer the request until the element scrolls near the viewport. */
  lazy?: boolean;
}

function useNearViewport(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(!enabled || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near || !ref.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);
  return { ref, near };
}

export function ProtectedImage({ id, alt, fit = 'cover', lazy = false }: Props) {
  const { ref, near } = useNearViewport(lazy);
  const { state, retry } = useProtectedImage(id, near);

  return (
    <div className="ii-thumb" ref={ref}>
      {(state.status === 'idle' || state.status === 'loading') && (
        <div className="ii-skeleton" role="status" aria-label={`Loading preview of ${alt}`} />
      )}
      {state.status === 'ready' && <img src={state.url} alt={alt} style={{ objectFit: fit }} />}
      {state.status === 'error' && (
        <div className="ii-thumb-msg" role="alert">
          <span>
            {state.error.kind === 'not_found' ? 'Image file not found.'
              : state.error.kind === 'forbidden' ? 'No permission to view this image.'
              : state.error.kind === 'auth' ? 'Session expired.'
              : 'Preview unavailable.'}
          </span>
          {state.error.kind !== 'forbidden' && state.error.kind !== 'not_found' && (
            <button type="button" className="ii-btn" onClick={e => { e.stopPropagation(); retry(); }}>Retry</button>
          )}
        </div>
      )}
    </div>
  );
}
