# Prueba Técnica - Algoritmo de Cronograma de Supervisores

Sistema de planificacion de turnos para supervisores de perforación minera.

## Descripción

Esta aplicación genera automáticamente cronogramas de trabajo para 3 supervisores de perforación, asegurando que siempre haya exactamente 2 supervisores trabajando simultaneamente.

## Características

- Configuración flexible de régimen de trabajo (NxM)
- Días de inducción configurables (1-5 días)
- Visualización de cronograma con códigos de colores
- Validación automática de reglas
- Estadísticas detalladas por supervisor

## Reglas del Sistema

1. Siempre deben haber exactamente 2 supervisores perforando
2. Nunca pueden haber 3 supervisores perforando al mismo tiempo
3. Nunca puede haber solo 1 supervisor perforando (una vez que S3 entro)
4. S1 siempre cumple el régimen completo sin modificaciones
5. S2 y S3 se ajustan para cumplir las reglas

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Testing

```bash
npm run test
```

## Build

```bash
npm run build
```

## Deploy

La aplicación será desplegada en GitHub Pages

## Tecnologias

- React 18
- Vite
- CSS Modules
- Vitest