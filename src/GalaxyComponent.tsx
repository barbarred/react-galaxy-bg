import React, { useEffect, useRef, useCallback, useMemo } from 'react';

type GalaxyVariant = 'scroll' | 'nebula';

interface GalaxyPaletteEntry {
  /** Color CSS del punto */
  color: string;
  /** Peso relativo dentro de la paleta. Default 1 */
  weight?: number;
}

interface GalaxyComponentProps {
  variant?: GalaxyVariant;
  starCount1?: number;
  starCount2?: number;
  starCount3?: number;
  palette?: GalaxyPaletteEntry[];
  adaptiveDensity?: boolean;
  enableShootingStars?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Distancia que recorre el bucle vertical de la variante scroll */
const SCROLL_LOOP = 2000;

/** Puntos por capa que se pintan en el primer render, antes de medir el viewport */
const FALLBACK_COUNT = 60;

const WHITE_PALETTE: GalaxyPaletteEntry[] = [{ color: '#FFF', weight: 1 }];

const NEBULA_PALETTE: GalaxyPaletteEntry[] = [
  { color: '#FFFFFF', weight: 60 },
  { color: '#FFD9C0', weight: 14 },
  { color: '#FF8A65', weight: 12 },
  { color: '#E5533D', weight: 8 },
  { color: '#9FB4FF', weight: 6 }
];

/** Descriptor de una capa de puntos */
interface LayerSpec {
  /** Cuál de las tres props de cantidad alimenta la capa */
  source: 1 | 2 | 3;
  /** Fracción de esa cantidad que le toca a la capa */
  share: number;
  size: number;
  animation: string;
  duration: number;
  delay: number;
  timing: string;
  /** Si necesita el duplicado que cierra el bucle vertical */
  loop: boolean;
  className: string;
}

/** Variante clásica: tres capas subiendo en bucle */
const SCROLL_LAYERS: LayerSpec[] = [
  { source: 1, share: 1, size: 1, animation: 'galaxy-animStar', duration: 50, delay: 0, timing: 'linear', loop: true, className: 'galaxy-stars' },
  { source: 2, share: 1, size: 2, animation: 'galaxy-animStar', duration: 100, delay: 0, timing: 'linear', loop: true, className: 'galaxy-stars2' },
  { source: 3, share: 1, size: 3, animation: 'galaxy-animStar', duration: 150, delay: 0, timing: 'linear', loop: true, className: 'galaxy-stars3' }
];

/**
 * Variante nebulosa: cada tamaño se reparte en tres grupos con dirección,
 * velocidad y fase distintas. El total de puntos es el mismo que en scroll,
 * solo cambia entre cuántos elementos se reparten.
 */
const NEBULA_LAYERS: LayerSpec[] = [
  { source: 1, share: 0.4, size: 1, animation: 'galaxy-drift-a', duration: 42, delay: 0, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-small' },
  { source: 1, share: 0.33, size: 1, animation: 'galaxy-drift-b', duration: 56, delay: -14, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-small' },
  { source: 1, share: 0.27, size: 1, animation: 'galaxy-drift-c', duration: 70, delay: -29, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-small' },
  { source: 2, share: 0.4, size: 2, animation: 'galaxy-drift-d', duration: 64, delay: -7, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-medium' },
  { source: 2, share: 0.33, size: 2, animation: 'galaxy-drift-e', duration: 82, delay: -22, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-medium' },
  { source: 2, share: 0.27, size: 2, animation: 'galaxy-drift-f', duration: 96, delay: -38, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-medium' },
  { source: 3, share: 0.4, size: 3, animation: 'galaxy-drift-b', duration: 88, delay: -11, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-large' },
  { source: 3, share: 0.33, size: 3, animation: 'galaxy-drift-e', duration: 112, delay: -47, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-large' },
  { source: 3, share: 0.27, size: 3, animation: 'galaxy-drift-c', duration: 132, delay: -63, timing: 'ease-in-out', loop: false, className: 'galaxy-particles galaxy-particles-large' }
];

/**
 * PRNG determinista. El primer render usa una semilla fija para que servidor y
 * cliente pinten lo mismo; después del montaje se regenera con Math.random.
 */
const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Convierte la paleta en un selector por peso acumulado */
const createColorPicker = (palette: GalaxyPaletteEntry[]) => {
  const entries = palette.filter(entry => entry && entry.color && (entry.weight === undefined || entry.weight > 0));
  const usable = entries.length ? entries : WHITE_PALETTE;

  const thresholds: number[] = [];
  let total = 0;

  usable.forEach(entry => {
    total += entry.weight === undefined ? 1 : entry.weight;
    thresholds.push(total);
  });

  return (random: number) => {
    const target = random * total;
    for (let i = 0; i < thresholds.length; i++) {
      if (target < thresholds[i]) return usable[i].color;
    }
    return usable[usable.length - 1].color;
  };
};

const GalaxyComponent: React.FC<GalaxyComponentProps> = ({
  variant = 'scroll',
  starCount1 = 700,
  starCount2 = 200,
  starCount3 = 100,
  palette,
  adaptiveDensity = false,
  enableShootingStars = true,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shootingStarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWidthRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);

  const isNebula = variant === 'nebula';
  const layers = isNebula ? NEBULA_LAYERS : SCROLL_LAYERS;

  // La paleta suele llegar como array literal, con identidad nueva en cada
  // render. Se compara por contenido para no reinicializar el componente.
  const paletteKey = useMemo(
    () => (palette || []).map(entry => `${entry.color}:${entry.weight === undefined ? 1 : entry.weight}`).join('|'),
    [palette]
  );

  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  const pickColor = useMemo(() => {
    const current = paletteRef.current;
    const resolved = current && current.length ? current : isNebula ? NEBULA_PALETTE : WHITE_PALETTE;
    return createColorPicker(resolved);
    // paletteKey representa el contenido de paletteRef.current
  }, [paletteKey, isNebula]);

  /** Cantidad final de una capa, ya repartida y con el recorte opcional aplicado */
  const resolveLayerCount = useCallback(
    (layer: LayerSpec, width: number) => {
      const counts = { 1: starCount1, 2: starCount2, 3: starCount3 };
      const ratios = { 1: 0.5, 2: 0.15, 3: 0.08 };
      const base = counts[layer.source];
      const resolved = adaptiveDensity ? Math.min(base, Math.floor(width * ratios[layer.source])) : base;
      return Math.max(0, Math.round(resolved * layer.share));
    },
    [starCount1, starCount2, starCount3, adaptiveDensity]
  );

  const generateStars = useCallback(
    (count: number, width: number, height: number, random: () => number) => {
      const stars = [];
      // scroll necesita cubrir toda la distancia del bucle o quedan bandas vacías.
      // nebula solo cubre el viewport más un margen para la deriva.
      const spanX = isNebula ? width + 80 : width;
      const offsetX = isNebula ? -40 : 0;
      const spanY = isNebula ? height + 80 : SCROLL_LOOP;
      const offsetY = isNebula ? -40 : 0;

      for (let i = 0; i < count; i++) {
        const x = Math.floor(random() * spanX) + offsetX;
        const y = Math.floor(random() * spanY) + offsetY;
        stars.push(`${x}px ${y}px ${pickColor(random())}`);
      }

      return stars.join(', ');
    },
    [isNebula, pickColor]
  );

  /**
   * Puntos del primer render. Deterministas y en cantidad reducida: solo evitan
   * un fondo vacío mientras no se conoce el viewport real.
   */
  const fallbackLayers = useMemo(
    () =>
      layers.map((layer, index) => {
        const random = createSeededRandom(index + 1);
        const count = Math.min(FALLBACK_COUNT, Math.round(resolveLayerCount(layer, 1440)));
        return generateStars(count, 1440, 900, random);
      }),
    [layers, resolveLayerCount, generateStars]
  );

  const updateStarsForCurrentViewport = useCallback(
    (force = false) => {
      if (typeof window === 'undefined' || !containerRef.current) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Solo actualizar si el cambio es significativo, salvo que se fuerce
      if (!force && lastWidthRef.current && Math.abs(lastWidthRef.current - width) < 100) {
        return;
      }

      lastWidthRef.current = width;

      const elements = containerRef.current.querySelectorAll<HTMLElement>('[data-galaxy-layer]');

      layers.forEach((layer, index) => {
        const element = elements[index];
        if (!element) return;
        const count = resolveLayerCount(layer, width);
        element.style.setProperty('--galaxy-layer', generateStars(count, width, height, Math.random));
      });
    },
    [layers, resolveLayerCount, generateStars]
  );

  /** Reinicia la animación CSS forzando un reflow entre asignaciones */
  const animateShootingStar = useCallback((element: HTMLElement, animationName: string, duration: number) => {
    if (!element) return;

    element.style.animation = 'none';
    element.offsetHeight; // Forzar reflow
    element.style.animation = `${animationName} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
  }, []);

  const initShootingStars = useCallback(() => {
    if (!containerRef.current || !enableShootingStars) return;

    const rightToLeft = containerRef.current.querySelector('.right-to-left') as HTMLElement;
    const topToBottom = containerRef.current.querySelector('.top-to-bottom') as HTMLElement;

    if (!rightToLeft || !topToBottom) return;

    const duration = 5000; // ms
    const delay = 4000; // ms

    const animateSequence = () => {
      animateShootingStar(rightToLeft, 'shootingStarRightToLeft', duration);

      setTimeout(() => {
        animateShootingStar(topToBottom, 'shootingStarTopToBottom', duration);
      }, delay);
    };

    setTimeout(animateSequence, 1000);

    if (shootingStarIntervalRef.current) {
      clearInterval(shootingStarIntervalRef.current);
    }

    shootingStarIntervalRef.current = setInterval(animateSequence, 10000);
  }, [enableShootingStars, animateShootingStar]);

  const setupEventListeners = useCallback(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        updateStarsForCurrentViewport();
      }, 250); // Esperar 250ms después del último resize
    };

    const handleVisibilityChange = () => {
      if (!containerRef.current) return;

      const animated = containerRef.current.querySelectorAll('.galaxy-layer, .galaxy-shooting-star');
      const state = document.hidden ? 'paused' : 'running';

      animated.forEach(element => {
        (element as HTMLElement).style.animationPlayState = state;
      });
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateStarsForCurrentViewport]);

  const init = useCallback(() => {
    if (initializedRef.current) return;

    updateStarsForCurrentViewport(true);
    const cleanup = setupEventListeners();
    initShootingStars();

    initializedRef.current = true;
    return cleanup;
  }, [updateStarsForCurrentViewport, setupEventListeners, initShootingStars]);

  useEffect(() => {
    // Inyectar estilos CSS optimizados en el document head
    const styleId = 'galaxy-component-styles-v3';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .galaxy-star-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
          overflow: hidden;
          will-change: auto;
        }

        .galaxy-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: var(--galaxy-size, 1px);
          height: var(--galaxy-size, 1px);
          background: transparent;
          box-shadow: var(--galaxy-layer);
          transform: translate3d(0, 0, 0);
          will-change: transform, opacity;
        }

        .galaxy-layer-loop::after {
          content: " ";
          position: absolute;
          top: ${SCROLL_LOOP}px;
          left: 0;
          width: var(--galaxy-size, 1px);
          height: var(--galaxy-size, 1px);
          background: transparent;
          box-shadow: var(--galaxy-layer);
        }

        @keyframes galaxy-animStar {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(0, -${SCROLL_LOOP}px, 0);
          }
        }

        .galaxy-nebula-haze {
          position: absolute;
          top: -10%;
          left: -10%;
          width: 120%;
          height: 120%;
          pointer-events: none;
          background:
            radial-gradient(40% 35% at 22% 32%, rgba(229, 83, 61, 0.18), transparent 70%),
            radial-gradient(45% 40% at 78% 64%, rgba(96, 125, 255, 0.13), transparent 70%),
            radial-gradient(35% 30% at 56% 14%, rgba(255, 138, 101, 0.11), transparent 70%);
          animation: galaxy-haze 60s ease-in-out infinite;
          will-change: opacity, transform;
        }

        @keyframes galaxy-haze {
          0%, 100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.06);
          }
        }

        @keyframes galaxy-drift-a {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.75; }
          25% { transform: translate3d(18px, -12px, 0); opacity: 1; }
          50% { transform: translate3d(30px, 9px, 0); opacity: 0.82; }
          75% { transform: translate3d(11px, 21px, 0); opacity: 0.95; }
        }

        @keyframes galaxy-drift-b {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.9; }
          25% { transform: translate3d(-16px, 14px, 0); opacity: 0.7; }
          50% { transform: translate3d(-27px, -8px, 0); opacity: 1; }
          75% { transform: translate3d(-9px, -19px, 0); opacity: 0.78; }
        }

        @keyframes galaxy-drift-c {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.8; }
          33% { transform: translate3d(13px, 24px, 0); opacity: 1; }
          66% { transform: translate3d(-14px, 12px, 0); opacity: 0.72; }
        }

        @keyframes galaxy-drift-d {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.85; }
          33% { transform: translate3d(-22px, -15px, 0); opacity: 0.68; }
          66% { transform: translate3d(9px, -26px, 0); opacity: 1; }
        }

        @keyframes galaxy-drift-e {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.72; }
          25% { transform: translate3d(24px, 8px, 0); opacity: 0.92; }
          50% { transform: translate3d(6px, -22px, 0); opacity: 1; }
          75% { transform: translate3d(-18px, -6px, 0); opacity: 0.8; }
        }

        @keyframes galaxy-drift-f {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.95; }
          50% { transform: translate3d(-12px, 20px, 0); opacity: 0.7; }
        }

        .galaxy-shooting-star {
          position: absolute;
          width: 6px;
          height: 6px;
          background-color: #fff;
          border-radius: 50%;
          filter: drop-shadow(0 0 10px #fff);
          opacity: 0;
          will-change: transform, opacity;
          transform: translate3d(0, 0, 0);
        }

        .galaxy-shooting-star::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform: translateX(-100%);
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent);
        }

        @keyframes shootingStarRightToLeft {
          0% {
            transform: translate3d(110vw, 20vh, 0) rotate(-15deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          70% {
            transform: translate3d(-10vw, 40vh, 0) rotate(-15deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(-10vw, 40vh, 0) rotate(-15deg);
            opacity: 0;
          }
        }

        @keyframes shootingStarTopToBottom {
          0% {
            transform: translate3d(30vw, -10vh, 0) rotate(45deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          70% {
            transform: translate3d(60vw, 110vh, 0) rotate(45deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(60vw, 110vh, 0) rotate(45deg);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .galaxy-layer {
            animation-duration: 600s !important;
          }

          .galaxy-nebula-haze {
            animation: none !important;
          }

          .galaxy-shooting-star {
            display: none;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const cleanup = init();

    return () => {
      if (cleanup) cleanup();

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      if (shootingStarIntervalRef.current) {
        clearInterval(shootingStarIntervalRef.current);
      }

      initializedRef.current = false;
    };
  }, [init]);

  return (
    <div
      ref={containerRef}
      className={`galaxy-star-background ${className}`}
      style={style}
    >
      {isNebula && <div className="galaxy-nebula-haze" />}
      {layers.map((layer, index) => (
        <div
          key={`${layer.className}-${index}`}
          data-galaxy-layer={index}
          className={`galaxy-layer ${layer.loop ? 'galaxy-layer-loop ' : ''}${layer.className}`}
          style={{
            '--galaxy-size': `${layer.size}px`,
            '--galaxy-layer': fallbackLayers[index],
            animationName: layer.animation,
            animationDuration: `${layer.duration}s`,
            animationDelay: `${layer.delay}s`,
            animationTimingFunction: layer.timing,
            animationIterationCount: 'infinite'
          } as React.CSSProperties}
        />
      ))}
      {enableShootingStars && (
        <>
          <div className="galaxy-shooting-star right-to-left"></div>
          <div className="galaxy-shooting-star top-to-bottom"></div>
        </>
      )}
    </div>
  );
};

export default GalaxyComponent;
export type { GalaxyComponentProps, GalaxyVariant, GalaxyPaletteEntry };
