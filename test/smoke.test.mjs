import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(here, 'index.html')).href;

// En CI el binario lo instala `playwright install chromium`. En local, si la
// caché tiene otra build, se apunta con PLAYWRIGHT_CHROMIUM_PATH.
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};

let browser;

before(async () => {
  browser = await chromium.launch(launchOptions);
});

after(async () => {
  await browser?.close();
});

/** Monta el componente con la configuración dada y devuelve lo que se pintó */
async function render(query = '', viewport = { width: 1280, height: 800 }) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];

  page.on('pageerror', error => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    // El favicon no existe en file://
    if (message.type() === 'error' && !message.text().includes('favicon')) {
      consoleErrors.push(`console: ${message.text()}`);
    }
  });

  await page.goto(`${pageUrl}${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const snapshot = await page.evaluate(() => {
    const layers = [...document.querySelectorAll('[data-galaxy-layer]')];

    const parse = element => {
      const raw = getComputedStyle(element).getPropertyValue('--galaxy-layer');
      return raw
        .split(/,(?![^(]*\))/)
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => {
          const [x, y, ...rest] = part.split(/\s+/);
          return { x: parseFloat(x), y: parseFloat(y), color: rest.join(' ') };
        });
    };

    const perLayer = layers.map(element => {
      const dots = parse(element);
      const style = getComputedStyle(element);
      return {
        dots: dots.length,
        maxY: dots.reduce((max, dot) => Math.max(max, dot.y), -Infinity),
        colors: [...new Set(dots.map(dot => dot.color))],
        animationName: style.animationName,
        animationDelay: style.animationDelay,
        size: style.width
      };
    });

    return {
      layerCount: layers.length,
      totalDots: perLayer.reduce((sum, layer) => sum + layer.dots, 0),
      colors: [...new Set(perLayer.flatMap(layer => layer.colors))],
      perLayer,
      haze: document.querySelectorAll('.galaxy-nebula-haze').length,
      shootingStars: document.querySelectorAll('.galaxy-shooting-star').length,
      styleTags: document.querySelectorAll('style[id^="galaxy-component-styles"]').length
    };
  });

  return { page, snapshot, consoleErrors };
}

/** Desplazamiento acumulado de cada capa en el intervalo dado */
async function measureDrift(page, ms) {
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-galaxy-layer]')].map(element => {
        const value = getComputedStyle(element).transform;
        if (value === 'none') return [0, 0];
        return value
          .match(/matrix.*\(([^)]+)\)/)[1]
          .split(',')
          .map(Number)
          .slice(-2);
      })
    );

  const start = await read();
  await page.waitForTimeout(ms);
  const end = await read();

  return start.map(([x, y], index) => ({
    dx: end[index][0] - x,
    dy: end[index][1] - y
  }));
}

describe('variante scroll', () => {
  test('monta tres capas y no ensucia la consola', async () => {
    const { page, snapshot, consoleErrors } = await render('?variant=scroll');
    assert.deepEqual(consoleErrors, []);
    assert.equal(snapshot.layerCount, 3);
    assert.equal(snapshot.haze, 0);
    assert.equal(snapshot.shootingStars, 2);
    await page.close();
  });

  test('respeta las cantidades pedidas', async () => {
    const { page, snapshot } = await render('?variant=scroll&c1=300&c2=120&c3=40');
    assert.equal(snapshot.totalDots, 460);
    await page.close();
  });

  test('cubre toda la distancia del bucle vertical', async () => {
    // Viewport bajo a propósito: antes las estrellas se dispersaban sobre
    // height*2 mientras la animación siempre recorre 2000px, y quedaba una
    // banda vacía en cada vuelta.
    const { page, snapshot } = await render('?variant=scroll', { width: 1280, height: 400 });
    for (const layer of snapshot.perLayer) {
      assert.ok(layer.maxY > 1900, `capa con maxY ${layer.maxY}, se esperaba cerca de 2000`);
    }
    await page.close();
  });

  test('las capas suben en vertical puro', async () => {
    const { page } = await render('?variant=scroll');
    const drift = await measureDrift(page, 1500);
    for (const { dx, dy } of drift) {
      assert.equal(dx, 0, 'scroll no debe moverse en horizontal');
      assert.ok(dy < 0, `se esperaba desplazamiento hacia arriba, hubo ${dy}`);
    }
    await page.close();
  });

  test('por defecto es blanco', async () => {
    const { page, snapshot } = await render('?variant=scroll');
    assert.deepEqual(snapshot.colors, ['#FFF']);
    await page.close();
  });
});

describe('variante nebula', () => {
  test('reparte el mismo total en nueve capas', async () => {
    const { page, snapshot, consoleErrors } = await render('?variant=nebula');
    assert.deepEqual(consoleErrors, []);
    assert.equal(snapshot.layerCount, 9);
    assert.equal(snapshot.totalDots, 1000);
    assert.equal(snapshot.haze, 1);
    await page.close();
  });

  test('usa keyframes de deriva desfasados entre sí', async () => {
    const { page, snapshot } = await render('?variant=nebula');
    const delays = new Set();

    for (const layer of snapshot.perLayer) {
      assert.match(layer.animationName, /^galaxy-drift-[a-f]$/);
      delays.add(layer.animationDelay);
    }

    assert.ok(delays.size >= 8, `se esperaban fases distintas, hubo ${delays.size}`);
    await page.close();
  });

  test('las capas derivan en ambos ejes', async () => {
    const { page } = await render('?variant=nebula');
    const drift = await measureDrift(page, 2500);
    const moved = drift.filter(({ dx }) => dx !== 0);
    assert.ok(moved.length >= 6, `solo ${moved.length} de 9 capas se movieron en horizontal`);
    await page.close();
  });

  test('mezcla colores además del blanco', async () => {
    const { page, snapshot } = await render('?variant=nebula');
    assert.ok(snapshot.colors.length > 1, 'la paleta de nebulosa debe traer varios tonos');
    assert.ok(
      snapshot.colors.some(color => color.toUpperCase() !== '#FFFFFF'),
      'se esperaba al menos un tono que no sea blanco'
    );
    await page.close();
  });
});

describe('props', () => {
  test('palette limita los colores a los indicados', async () => {
    const { page, snapshot } = await render('?variant=nebula&palette=%23FF0000,%230000FF');
    assert.deepEqual(snapshot.colors.map(c => c.toUpperCase()).sort(), ['#0000FF', '#FF0000']);
    await page.close();
  });

  test('adaptiveDensity recorta en pantallas angostas', async () => {
    const narrow = { width: 400, height: 800 };
    const libre = await render('?variant=scroll', narrow);
    const recortado = await render('?variant=scroll&adaptive=1', narrow);

    assert.equal(libre.snapshot.totalDots, 1000);
    assert.ok(
      recortado.snapshot.totalDots < libre.snapshot.totalDots,
      'adaptiveDensity debería reducir la cantidad'
    );

    await libre.page.close();
    await recortado.page.close();
  });

  test('enableShootingStars quita los elementos', async () => {
    const { page, snapshot } = await render('?variant=nebula&shooting=0');
    assert.equal(snapshot.shootingStars, 0);
    await page.close();
  });

  test('inyecta una sola hoja de estilos bajo StrictMode', async () => {
    const { page, snapshot } = await render('?variant=nebula');
    assert.equal(snapshot.styleTags, 1);
    await page.close();
  });
});
