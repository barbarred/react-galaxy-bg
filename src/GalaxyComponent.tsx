import React, { useEffect, useRef, useCallback } from 'react';

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
  const shootingStarIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const generateStarsShadow = useCallback((count: number, size: number) => {
    let shadow = '';
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * window.innerWidth);
      const y = Math.floor(Math.random() * 2000);
      shadow += `${x}px ${y}px #FFF${i === count - 1 ? '' : ', '}`;
    }
    return shadow;
  }, []);

  const updateStarsShadows = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    container.style.setProperty('--stars-shadow-1', generateStarsShadow(starCount1, 1));
    container.style.setProperty('--stars-shadow-2', generateStarsShadow(starCount2, 2));
    container.style.setProperty('--stars-shadow-3', generateStarsShadow(starCount3, 3));
  }, [generateStarsShadow, starCount1, starCount2, starCount3]);

  const animateShootingStars = useCallback(() => {
    if (!containerRef.current || !enableShootingStars) return;

    const rightToLeft = containerRef.current.querySelector('.right-to-left') as HTMLElement;
    const topToBottom = containerRef.current.querySelector('.top-to-bottom') as HTMLElement;

    if (!rightToLeft || !topToBottom) return;

    const duration = 5;
    const delay = 4;

    function animate() {
      // Primera estrella (derecha a izquierda)
      setTimeout(() => {
        if (rightToLeft) {
          rightToLeft.style.animation = 'none';
          rightToLeft.offsetHeight;
          rightToLeft.style.animation = `shootingStarRightToLeft ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
        }
      }, 0);

      // Segunda estrella (arriba a abajo), 4 segundos después
      setTimeout(() => {
        if (topToBottom) {
          topToBottom.style.animation = 'none';
          topToBottom.offsetHeight;
          topToBottom.style.animation = `shootingStarTopToBottom ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`;
        }
      }, delay * 1000);
    }

    // Iniciar la primera secuencia
    setTimeout(animate, 1000);

    // Repetir la secuencia cada 10 segundos
    if (shootingStarIntervalRef.current) {
      clearInterval(shootingStarIntervalRef.current);
    }
    shootingStarIntervalRef.current = setInterval(animate, 10000);
  }, [enableShootingStars]);

  useEffect(() => {
    // Inyectar estilos CSS en el document head
    const styleId = 'galaxy-component-styles';
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
        }

        .galaxy-stars {
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: var(--stars-shadow-1);
          animation: galaxy-animStar 50s linear infinite;
        }

        .galaxy-stars:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: var(--stars-shadow-1);
        }

        .galaxy-stars2 {
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: var(--stars-shadow-2);
          animation: galaxy-animStar 100s linear infinite;
        }

        .galaxy-stars2:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: var(--stars-shadow-2);
        }

        .galaxy-stars3 {
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: var(--stars-shadow-3);
          animation: galaxy-animStar 150s linear infinite;
        }

        .galaxy-stars3:after {
          content: " ";
          position: absolute;
          top: 2000px;
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: var(--stars-shadow-3);
        }

        @keyframes galaxy-animStar {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(-2000px);
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
            transform: translate(110vw, 20vh) rotate(-15deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          70% {
            transform: translate(-10vw, 40vh) rotate(-15deg);
            opacity: 1;
          }
          100% {
            transform: translate(-10vw, 40vh) rotate(-15deg);
            opacity: 0;
          }
        }

        @keyframes shootingStarTopToBottom {
          0% {
            transform: translate(30vw, -10vh) rotate(45deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          70% {
            transform: translate(60vw, 110vh) rotate(45deg);
            opacity: 1;
          }
          100% {
            transform: translate(60vw, 110vh) rotate(45deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    updateStarsShadows();
    animateShootingStars();

    const handleResize = () => {
      updateStarsShadows();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (shootingStarIntervalRef.current) {
        clearInterval(shootingStarIntervalRef.current);
      }
    };
  }, [updateStarsShadows, animateShootingStars]);

  return (
    <div 
      ref={containerRef}
      className={`galaxy-star-background ${className}`}
      style={style}
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