# Investigación y Decisión de Arquitectura para React Native

Este documento detalla la investigación de patrones arquitectónicos, la evaluación de tecnologías y las decisiones finales para el desarrollo de la aplicación móvil en React Native (Expo).

---

## 1. Investigación de Arquitecturas

En el ecosistema de React Native, las arquitecturas más comunes para escalar un proyecto de forma mantenible son **Clean Architecture** y **MVVM** (Model-View-ViewModel). A continuación, se presenta una comparación:

### Comparativa: Clean Architecture vs MVVM

| Criterio | Clean Architecture | MVVM (Model-View-ViewModel) |
| :--- | :--- | :--- |
| **Concepto Principal** | Separación en capas concéntricas (Domain, Data, Presentation). La regla de dependencia apunta siempre hacia el centro (Dominio). | Separación en Vista (UI), ViewModel (Lógica de estado) y Modelo (Datos). El ViewModel conecta la Vista con el Modelo. |
| **Curva de Aprendizaje**| Alta. Requiere entender inyección de dependencias, casos de uso (Use Cases), repositorios y entidades. | Media. Es intuitiva para desarrolladores Frontend y se adapta bien al uso de Hooks en React. |
| **Escalabilidad** | Excelente. Ideal para proyectos muy grandes, equipos numerosos y reglas de negocio complejas. | Muy buena. Ideal para proyectos medianos a grandes. |
| **Boilerplate (Código base)**| Muy alto. Se necesita escribir mucha interfaz y mapeadores (Mappers) para cada capa. | Bajo/Medio. Los Custom Hooks en React funcionan perfectamente como ViewModels. |
| **Testing** | Excelente. Al estar todo desacoplado, probar el dominio y los casos de uso es trivial. | Bueno. Se pueden testear los ViewModels independientemente de la interfaz gráfica. |
| **Adaptación a React Native**| Requiere esfuerzo, ya que React es esencialmente una librería de vistas y no impone una estructura rígida. | Muy natural. Se logra aislando la lógica en `Custom Hooks` (ViewModel) y dejando los Componentes limpios. |

---

## 2. Evaluación de Librerías y Tecnologías

Para complementar la arquitectura, se evaluaron diversas herramientas para resolver problemas comunes en React Native.

| Categoría | Opción 1 | Opción 2 | Opción 3 | Evaluación y Comentarios |
| :--- | :--- | :--- | :--- | :--- |
| **Navegación** | React Navigation | Expo Router | - | **Expo Router** ofrece navegación basada en archivos (similar a Next.js), lo cual simplifica enormemente el enrutamiento frente a React Navigation tradicional. |
| **Estado Global** | Redux Toolkit | Zustand | Context API | **Zustand** es mucho más ligero, sin boilerplate y fácil de usar que Redux. **Context API** es útil, pero para estados frecuentes causa re-renderizados innecesarios. |
| **Estado Remoto / Fetching**| React Query | SWR | Axios manual | **React Query (TanStack Query)** maneja caché, reintentos y estados de carga automáticamente, superando con creces las peticiones manuales. |
| **Componentes UI** | NativeWind | Tamagui | StyleSheet nativo | **NativeWind** (Tailwind para RN) acelera el desarrollo si el equipo ya conoce Tailwind. El **StyleSheet nativo** ofrece máximo rendimiento y control. |
| **Almacenamiento Local** | AsyncStorage | MMKV | SQLite | **MMKV** es síncrono y extremadamente rápido comparado con AsyncStorage. AsyncStorage es más estándar y suficiente si no hay alta carga de lectura/escritura. |

---

## 3. Documento de Decisión de Arquitectura (ADR)

**Decisión Tomada:** Se utilizará un enfoque híbrido basado en **MVVM adaptado a React (Custom Hooks)** con **Feature-Sliced Design (Agrupación por Funcionalidad)**.

### Justificación:
1. **Velocidad de Desarrollo:** Clean Architecture estricto añade demasiado boilerplate para un proyecto que necesita iterar rápido (como un prototipo o v1).
2. **Reactividad Natural:** MVVM encaja perfectamente en React Native: 
   - **View:** Componentes funcionales `.tsx` puros y tontos (solo pintan UI).
   - **ViewModel:** Custom Hooks (ej. `useDocenteData.ts`) que exponen el estado y las funciones a la vista.
   - **Model:** Servicios de API, Contextos y Repositorios de datos.
3. **Estructura por Dominio (Feature-based):** En lugar de tener carpetas gigantes de `components`, `hooks` y `services`, agruparemos el código por funcionalidad (ej. `features/escaner/`, `features/docentes/`), lo que mejora la mantenibilidad.

---

## 4. Lista de Tecnologías Seleccionadas (Tech Stack)

A continuación, la lista definitiva de tecnologías a implementar, basada en la evaluación previa:

### Core
*   **Framework:** React Native + Expo (SDK reciente).
*   **Lenguaje:** TypeScript (Tipado estricto para evitar errores en tiempo de ejecución).
*   **Navegación:** Expo Router (Navegación basada en el sistema de archivos).

### Manejo de Estado y Datos
*   **Estado Global:** Context API (para datos estáticos como Autenticación) + Zustand (si se requiere estado complejo compartido).
*   **Fetching y Caché (Estado Remoto):** React Query (Manejo de peticiones HTTP, caching y re-fetching).
*   **Cliente HTTP:** Axios (Por su facilidad para interceptores y manejo de tokens).
*   **Almacenamiento Local:** AsyncStorage (Para persistencia básica como tokens o datos offline sencillos).

### UI y UX
*   **Estilos:** StyleSheet de React Native (para control total) apoyado de una carpeta de `theme` (colores, tipografía compartida).
*   **Iconos:** `@expo/vector-icons` (Ionicons).
*   **Gestos y Animaciones:** `react-native-reanimated` y `react-native-gesture-handler` (estándares de la industria).

### Arquitectura de Carpetas Propuesta

```text
/app               # Rutas de Expo Router (Vistas)
/src
  /assets          # Imágenes, fuentes, etc.
  /components      # Componentes UI reutilizables (Botones, Tarjetas, Modales)
  /contexts        # Contextos globales (AuthContext, DataContext)
  /hooks           # Custom hooks genéricos (ViewModels)
  /services        # Llamadas a API externa (Axios, Endpoints)
  /types           # Interfaces globales de TypeScript
  /utils           # Funciones de ayuda (formateo de fechas, validaciones)
```
