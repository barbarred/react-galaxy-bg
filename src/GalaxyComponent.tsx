import React, { useEffect, useRef, useCallback, useMemo } from 'react';

interface GalaxyComponentProps {
  starCount1?: number;
  starCount2?: number;
  starCount3?: number;
  enableShootingStars?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const GalaxyComponent: React.FC<GalaxyComponentProps> = ({
  starCount1 = 700,
  starCount2 = 200,
  starCount3 = 100,
  enableShootingStars = true,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shootingStarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWidthRef = useRef<number>(0);
  const shootingStarAnimationsRef = useRef<Map<HTMLElement, Animation>>(new Map());
  const initializedRef = useRef<boolean>(false);

  // Optimización: Usar variables CSS pre-definidas para diferentes resoluciones
  const cssVariables = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    if (isMobile) {
      return {
        '--stars-small': '12px 15px #FFF, 145px 87px #FFF, 223px 145px #FFF, 334px 223px #FFF, 445px 67px #FFF, 156px 334px #FFF, 267px 189px #FFF, 378px 445px #FFF, 489px 223px #FFF, 590px 356px #FFF',
        '--stars-medium': '23px 134px #FFF, 245px 367px #FFF, 167px 223px #FFF, 289px 478px #FFF, 351px 134px #FFF',
        '--stars-large': '67px 245px #FFF, 189px 367px #FFF, 211px 123px #FFF'
      };
    }
    
    return {
      '--stars-small': '12px 15px #FFF, 45px 87px #FFF, 123px 45px #FFF, 234px 123px #FFF, 345px 67px #FFF, 456px 234px #FFF, 567px 89px #FFF, 678px 345px #FFF, 789px 123px #FFF, 890px 456px #FFF, 23px 567px #FFF, 134px 234px #FFF, 245px 678px #FFF, 356px 345px #FFF, 467px 789px #FFF, 578px 123px #FFF, 689px 567px #FFF, 790px 234px #FFF, 821px 678px #FFF, 932px 345px #FFF',
      '--stars-medium': '23px 234px #FFF, 145px 567px #FFF, 267px 123px #FFF, 389px 678px #FFF, 451px 234px #FFF, 573px 789px #FFF, 695px 345px #FFF, 817px 567px #FFF, 939px 123px #FFF, 161px 678px #FFF',
      '--stars-large': '67px 345px #FFF, 189px 567px #FFF, 311px 123px #FFF, 433px 789px #FFF, 555px 234px #FFF'
    };
  }, []);

  // Optimización: Generar estrellas optimizadas para el viewport actual
  const generateOptimizedStars = useCallback((count: number, maxWidth: number, maxHeight: number) => {
    const stars = [];
    
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * maxWidth);
      const y = Math.floor(Math.random() * Math.min(2000, maxHeight * 2));
      stars.push(`${x}px ${y}px #FFF`);
    }
    
    return stars.join(', ');
  }, []);

  // Optimización: Actualizar estrellas solo cuando sea necesario
  const updateStarsForCurrentViewport = useCallback(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Solo actualizar si el cambio es significativo
    if (lastWidthRef.current && Math.abs(lastWidthRef.current - width) < 100) {
      return;
    }
    
    lastWidthRef.current = width;
    
    // Generar estrellas optimizadas para el viewport actual
    const smallStars = generateOptimizedStars(Math.min(starCount1, width * 0.5), width, height);
    const mediumStars = generateOptimizedStars(Math.min(starCount2, width * 0.15), width, height);
    const largeStars = generateOptimizedStars(Math.min(starCount3, width * 0.08), width, height);
    
    // Actualizar CSS custom properties
    const container = containerRef.current;
    container.style.setProperty('--stars-small', smallStars);
    container.style.setProperty('--stars-medium', mediumStars);
    container.style.setProperty('--stars-large', largeStars);
  }, [generateOptimizedStars, starCount1, starCount2, starCount3]);

  // Optimización: Usar Web Animations API para mejor control
  const animateShootingStar = useCallback((element: HTMLElement, animationName: string, duration: number) => {
    if (!element || !element.animate) return;

    // Limpiar animación anterior si existe
    const existingAnimation = shootingStarAnimationsRef.current.get(element);
    if (existingAnimation) {
      existingAnimation.cancel();
    }

    // Crear nueva animación
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
      // Primera estrella
      animateShootingStar(rightToLeft, 'shootingStarRightToLeft', duration);
      
      // Segunda estrella con delay
      setTimeout(() => {
        animateShootingStar(topToBottom, 'shootingStarTopToBottom', duration);
      }, delay);
    };

    // Iniciar después de 1 segundo
    setTimeout(animateSequence, 1000);
    
    // Limpiar interval anterior
    if (shootingStarIntervalRef.current) {
      clearInterval(shootingStarIntervalRef.current);
    }
    
    // Repetir cada 10 segundos
    shootingStarIntervalRef.current = setInterval(animateSequence, 10000);
  }, [enableShootingStars, animateShootingStar]);

  // Optimización: Setup de event listeners con debounce
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
      
      const stars = containerRef.current.querySelectorAll('.galaxy-stars, .galaxy-stars2, .galaxy-stars3, .galaxy-shooting-star');
      
      if (document.hidden) {
        stars.forEach(star => {
          (star as HTMLElement).style.animationPlayState = 'paused';
        });
      } else {
        stars.forEach(star => {
          (star as HTMLElement).style.animationPlayState = 'running';
        });
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateStarsForCurrentViewport]);

  // Inicialización principal
  const init = useCallback(() => {
    if (initializedRef.current) return;
    
    updateStarsForCurrentViewport();
    const cleanup = setupEventListeners();
    initShootingStars();
    
    initializedRef.current = true;
    return cleanup;
  }, [updateStarsForCurrentViewport, setupEventListeners, initShootingStars]);

  useEffect(() => {
    // Inyectar estilos CSS optimizados en el document head
    const styleId = 'galaxy-component-styles-optimized';
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

        .galaxy-stars {
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: var(--stars-small);
          animation: galaxy-animStar 50s linear infinite;
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }

        .galaxy-stars:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: var(--stars-small);
        }

        .galaxy-stars2 {
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: var(--stars-medium);
          animation: galaxy-animStar 100s linear infinite;
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }

        .galaxy-stars2:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: var(--stars-medium);
        }

        .galaxy-stars3 {
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: var(--stars-large);
          animation: galaxy-animStar 150s linear infinite;
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }

        .galaxy-stars3:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: var(--stars-large);
        }

        @keyframes galaxy-animStar {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(0, -2000px, 0);
          }
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
          .galaxy-stars, .galaxy-stars2, .galaxy-stars3 {
            animation-duration: 200s;
          }
          
          .galaxy-shooting-star {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .galaxy-stars {
            box-shadow: var(--stars-small);
          }
          .galaxy-stars2 {
            box-shadow: var(--stars-medium);
          }
          .galaxy-stars3 {
            box-shadow: var(--stars-large);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Inicializar solo cuando el DOM esté listo
    const cleanup = init();

    return () => {
      if (cleanup) cleanup();
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      if (shootingStarIntervalRef.current) {
        clearInterval(shootingStarIntervalRef.current);
      }
      
      // Limpiar animaciones
      shootingStarAnimationsRef.current.forEach(animation => {
        animation.cancel();
      });
      shootingStarAnimationsRef.current.clear();
      
      initializedRef.current = false;
    };
  }, [init, cssVariables]);

  return (
    <div 
      ref={containerRef}
      className={`galaxy-star-background ${className}`}
      style={{
        ...cssVariables,
        ...style
      }}
    >
      <div className="galaxy-stars"></div>    
      <div className="galaxy-stars2"></div>
      <div className="galaxy-stars3"></div>
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
export type { GalaxyComponentProps };