# React Galaxy Background

Un componente React hermoso y animado que simula un fondo de galaxia con estrellas parpadeantes y estrellas fugaces.

## ✨ Características

- Fondo de galaxia con gradiente espacial
- Tres capas de estrellas con diferentes tamaños y velocidades de animación
- Estrellas fugaces animadas
- Completamente personalizable con props
- TypeScript incluido
- Optimizado para rendimiento
- Sin dependencias externas

## 📦 Instalación

```bash
npm install @r0rri/react-galaxy-bg
```

```bash
yarn add @r0rri/react-galaxy-bg

```bash
pnpm add @r0rri/react-galaxy-bg
```

## 🚀 Uso básico

```tsx
import React from 'react';
import { GalaxyComponent } from '@r0rri/react-galaxy-bg';

function App() {
  return (
    <div>
      <GalaxyComponent />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1>Tu contenido aquí</h1>
        <p>El fondo de galaxia estará detrás de este contenido</p>
      </div>
    </div>
  );
}

export default App;
```

## ⚙️ Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `starCount1` | `number` | `700` | Número de estrellas pequeñas (1px) |
| `starCount2` | `number` | `200` | Número de estrellas medianas (2px) |
| `starCount3` | `number` | `100` | Número de estrellas grandes (3px) |
| `enableShootingStars` | `boolean` | `true` | Habilita/deshabilita las estrellas fugaces |
| `className` | `string` | `''` | Clase CSS adicional |
| `style` | `React.CSSProperties` | `{}` | Estilos inline adicionales |

## 🎨 Ejemplos de uso

### Configuración personalizada

```tsx
import { GalaxyComponent } from '@r0rri/react-galaxy-bg';

function CustomGalaxy() {
  return (
    <GalaxyComponent
      starCount1={1000}
      starCount2={300}
      starCount3={150}
      enableShootingStars={true}
      className="mi-galaxia-personalizada"
      style={{ zIndex: -10 }}
    />
  );
}
```

### Sin estrellas fugaces

```tsx
import { GalaxyComponent } from '@r0rri/react-galaxy-bg';

function StaticGalaxy() {
  return (
    <GalaxyComponent
      enableShootingStars={false}
      starCount1={500}
    />
  );
}
```

### Galaxy minimalista

```tsx
import { GalaxyComponent } from '@r0rri/react-galaxy-bg';

function MinimalGalaxy() {
  return (
    <GalaxyComponent
      starCount1={200}
      starCount2={50}
      starCount3={25}
      enableShootingStars={false}
    />
  );
}
```

## 🎭 Animaciones

El componente incluye varias animaciones:

- **Estrellas flotantes**: Las estrellas se mueven verticalmente creando un efecto de profundidad
- **Estrellas fugaces**: Aparecen cada 10 segundos con trayectorias diagonales realistas
- **Responsive**: Se adapta automáticamente a cambios de tamaño de ventana

## 🎨 Personalización de estilos

El componente usa CSS personalizado que se inyecta automáticamente. Si necesitas sobrescribir estilos:

```css
/* Personalizar el fondo */
.galaxy-star-background {
  background: radial-gradient(ellipse at center, #2c3e50 0%, #000000 100%) !important;
}

/* Personalizar estrellas fugaces */
.galaxy-shooting-star {
  background-color: #ffeb3b !important;
  filter: drop-shadow(0 0 15px #ffeb3b) !important;
}
```

## 📱 Consideraciones de rendimiento

- Las estrellas se generan usando `box-shadow` para mejor rendimiento
- Las animaciones usan `transform` para aprovechar la aceleración por hardware
- El componente se actualiza solo cuando cambia el tamaño de la ventana
- Cleanup automático de intervals y event listeners

## 🌟 Casos de uso

- Fondos de páginas web espaciales
- Landing pages
- Aplicaciones de astronomía
- Juegos web
- Presentaciones
- Portafolios creativos

## 🔧 Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/barbarred/react-galaxy-bg.git

# Instalar dependencias
npm install

# Construir el paquete
npm run build

# Modo desarrollo
npm run dev
```

## 📄 Licencia

MIT © Barbarred

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🐛 Reportar bugs

Si encuentras un bug, por favor abre un issue en el repositorio de GitHub.

## ⭐ Soporte

Si este paquete te fue útil, considera darle una estrella en GitHub.