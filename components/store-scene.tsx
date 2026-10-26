'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, LoaderCircle, MousePointer2, Plus, RotateCcw, ShoppingBasket } from 'lucide-react';
import { useCart } from '@/components/cart-provider';
import type { StoreEngine } from '@/lib/store-engine';
import styles from './store-scene.module.css';

const fa = (value: number) => value.toLocaleString('fa-IR');
type Direction = 'forward' | 'backward' | 'left' | 'right';

export function StoreScene() {
  const cart = useCart();
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StoreEngine | null>(null);
  const visibleRef = useRef(false);
  const [initialize, setInitialize] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState('روی هر قوطی که دوست داری بزن؛ بقیه‌اش با ما.');

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (!('IntersectionObserver' in window)) {
      visibleRef.current = true;
      setInitialize(true);
      return;
    }
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInitialize(true); preload.disconnect(); }
    }, { rootMargin: '350px' });
    const visibility = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      engineRef.current?.setActive(entry.isIntersecting && !document.hidden);
    }, { threshold: 0.01 });
    preload.observe(frame);
    visibility.observe(frame);
    const onVisibility = () => engineRef.current?.setActive(visibleRef.current && !document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      preload.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!initialize || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const abort = new AbortController();
    let engine: StoreEngine | null = null;
    const start = async () => {
      try {
        const { createStoreEngine } = await import('@/lib/store-engine');
        if (abort.signal.aborted) return;
        engine = await createStoreEngine(canvas, cartRef.current.quantity, {
          onArrival: () => cartRef.current.addOne(),
          onPendingChange: (count) => { if (!abort.signal.aborted) setPending(count); },
          onMessage: (text) => { if (!abort.signal.aborted) setMessage(text); },
        }, abort.signal);
        if (abort.signal.aborted) { engine.dispose(); return; }
        engineRef.current = engine;
        engine.setQuantity(cartRef.current.quantity);
        engine.setActive(visibleRef.current && !document.hidden);
        setPhase('ready');
      } catch (error) {
        if (!abort.signal.aborted) {
          console.warn('YAMYAM store preview unavailable:', error);
          setPhase('fallback');
          setMessage('یام‌یامت رو همین‌جا به سبد اضافه کن.');
        }
      }
    };
    void start();
    return () => {
      abort.abort();
      engineRef.current = null;
      engine?.dispose();
    };
  }, [initialize]);

  useEffect(() => { engineRef.current?.setQuantity(cart.quantity); }, [cart.quantity]);

  const addProduct = () => {
    if (phase === 'fallback') {
      const accepted = cartRef.current.addOne();
      setMessage(accepted ? 'یک یام‌یام به سبدت اضافه شد.' : 'سبدت به سقف ۱۲ قوطی رسیده.');
    } else engineRef.current?.addProduct();
  };

  const movementButton = (direction: Direction, label: string, icon: React.ReactNode, className = '') => (
    <button
      type="button"
      className={`${styles.moveButton} ${className}`}
      aria-label={label}
      title={label}
      disabled={phase !== 'ready'}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        engineRef.current?.move(direction, true);
      }}
      onPointerUp={() => engineRef.current?.move(direction, false)}
      onPointerCancel={() => engineRef.current?.move(direction, false)}
      onLostPointerCapture={() => engineRef.current?.move(direction, false)}
      onBlur={() => engineRef.current?.move(direction, false)}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); engineRef.current?.move(direction, true); }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); engineRef.current?.move(direction, false); }
      }}
    >{icon}</button>
  );

  const full = cart.quantity + pending >= 12;

  return (
    <div className={styles.frame} ref={frameRef} dir="rtl">
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${phase === 'ready' ? styles.visible : ''}`}
        tabIndex={phase === 'ready' ? 0 : -1}
        role="application"
        aria-label="فروشگاه سه‌بعدی یام‌یام. با کلیدهای جهت یا دبلیو، ای، اس، دی حرکت کن. با کشیدن تصویر اطراف را ببین. برای افزودن قوطی، روی آن بزن یا فاصله را فشار بده. با اسکیپ از کنترل خارج شو."
        aria-describedby="store-controls-help"
      />

      {phase !== 'ready' && (
        <div className={styles.poster} aria-hidden="true">
          {/* This is also the intentionally lightweight WebGL fallback. */}
          <img src="/images/can-persian.webp" alt="" className={styles.posterCan} />
          <div className={styles.posterShadow} />
          {phase === 'loading' && <div className={styles.loading}><LoaderCircle size={16} /><span>داریم قفسه‌ها رو می‌چینیم…</span></div>}
        </div>
      )}

      <div className={styles.topBar}>
        <div className={styles.live}><span /><span>{phase === 'ready' ? 'اینجا، یام‌یام بردار' : 'قفسهٔ حس خوب'}</span></div>
        <div className={styles.topActions}>
          <button type="button" className={styles.reset} onClick={() => engineRef.current?.resetCamera()} disabled={phase !== 'ready'} aria-label="برگشت به نمای اول" title="نمای اول"><RotateCcw size={17} /></button>
          <button type="button" className={styles.cartCount} onClick={cart.openCart} aria-label={`باز کردن سبد، ${fa(cart.quantity)} قوطی`}>
            <ShoppingBasket size={18} strokeWidth={1.6} /><span>{fa(cart.quantity)}<span className={styles.countSuffix}> قوطی</span></span>
            {pending > 0 && <span className={styles.pending}>+{fa(pending)}</span>}
          </button>
        </div>
      </div>

      {phase === 'ready' && <div className={styles.pickHint}><MousePointer2 size={15} /><span>یکی رو انتخاب کن</span><ArrowUpLeft size={16} /></div>}

      <div className={styles.bottomBar}>
        <div className={styles.controls} dir="ltr" aria-label="کنترل حرکت در فروشگاه">
          <div className={styles.movement}>
            {movementButton('forward', 'حرکت به جلو', <ArrowUp size={16} />, styles.forward)}
            {movementButton('left', 'حرکت به چپ', <ArrowLeft size={16} />, styles.left)}
            {movementButton('backward', 'حرکت به عقب', <ArrowDown size={16} />, styles.backward)}
            {movementButton('right', 'حرکت به راست', <ArrowRight size={16} />, styles.right)}
          </div>
          <div className={styles.controlsText} id="store-controls-help" dir="rtl"><span>یه دوری بزن</span><small>بکش و ببین · با فلش‌ها حرکت کن</small></div>
        </div>
        <div className={styles.addArea}>
          <span className={styles.addCaption}>{full ? 'سبدت پر از حال خوبه' : 'از قفسه، مستقیم توی سبدت'}</span>
          <button type="button" className={styles.addButton} disabled={phase === 'loading' || full} onClick={addProduct}>
            <span>{full ? '۱۲ تا حس خوب توی سبد' : 'یکی بنداز تو سبد'}</span><Plus size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{message} {fa(cart.quantity)} قوطی در سبد.</p>
    </div>
  );
}

export default StoreScene;
