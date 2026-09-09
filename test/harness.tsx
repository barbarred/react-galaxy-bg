/**
 * Página que monta el componente contra src/ con la configuración que llega por
 * query string. La usa test/smoke.test.mjs desde file://, sin servidor.
 */
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import GalaxyComponent, { GalaxyVariant } from '../src/GalaxyComponent';

const params = new URLSearchParams(location.search);

const num = (key: string, fallback: number) => {
  const raw = params.get(key);
  return raw === null ? fallback : Number(raw);
};

const rawPalette = params.get('palette');
const palette = rawPalette ? rawPalette.split(',').map(color => ({ color })) : undefined;

const root = document.getElementById('root');

if (root) {
  // StrictMode a propósito: verifica que el guard de doble montaje aguanta
  createRoot(root).render(
    React.createElement(
      StrictMode,
      null,
      React.createElement(GalaxyComponent, {
        variant: (params.get('variant') as GalaxyVariant) || 'scroll',
        palette,
        starCount1: num('c1', 700),
        starCount2: num('c2', 200),
        starCount3: num('c3', 100),
        adaptiveDensity: params.get('adaptive') === '1',
        enableShootingStars: params.get('shooting') !== '0'
      })
    )
  );
}

(window as unknown as { __ready?: boolean }).__ready = true;
