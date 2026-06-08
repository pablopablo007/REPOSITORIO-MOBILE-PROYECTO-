<div style="color: black; font-family: sans-serif; line-height: 1.6;">

<div style="text-align: center; margin-top: 50px; margin-bottom: 50px;">
  <h1 style="color: red; font-size: 2.5em;">DOCUMENTACIÓN TÉCNICA DE SOFTWARE</h1>
  <h2 style="color: red; font-size: 1.8em;">PROYECTO: EDUSUDAMERICANO (GESTIÓN ACADÉMICA)</h2>
  <br><br>
  <p><strong>Fecha de Generación:</strong> 08 de Junio de 2026</p>
  <p><strong>Versión:</strong> 1.0.0</p>
  <p><strong>Clasificación:</strong> Confidencial / Uso Interno</p>
</div>

<hr style="border: 1px solid black;">

<h2 style="color: red;">1. Resumen Ejecutivo</h2>
<p>El presente documento detalla la arquitectura, el código fuente, el diseño de la base de datos y los procesos de configuración e implementación del sistema "EduSudamericano". Este sistema consiste en una aplicación móvil desarrollada con tecnologías híbridas cuyo propósito es facilitar la gestión académica, permitiendo a los docentes la carga, validación y gestión de evidencias documentales, tales como títulos, sílabos, actas y certificaciones. El aplicativo integra además funcionalidades avanzadas como el escaneo de documentos en tiempo real.</p>

<h2 style="color: red;">2. Introducción</h2>
<p>El proyecto EduSudamericano nace de la necesidad de digitalizar y centralizar el proceso de recolección de evidencias académicas en la Universidad Sudamericana. La aplicación móvil proporciona una interfaz formal, intuitiva y directa para que el personal docente interactúe con las tareas asignadas por el departamento de recursos humanos o coordinación académica, manteniendo un registro histórico y seguro de los documentos subidos.</p>

<h2 style="color: red;">3. Objetivos</h2>
<ul>
  <li>Centralizar la gestión de evidencias documentales del personal docente.</li>
  <li>Proveer una herramienta móvil rápida para el escaneo, revisión y envío de documentos.</li>
  <li>Establecer un sistema de validación de documentos mediante estados (Pendiente, Validado, Observado).</li>
  <li>Mantener al personal informado mediante un sistema de notificaciones en tiempo real.</li>
</ul>

<h2 style="color: red;">4. Tecnologías Utilizadas</h2>
<p>El proyecto está desarrollado utilizando un conjunto de tecnologías modernas centradas en el ecosistema de JavaScript y React Native. Las herramientas principales incluyen:</p>
<ul>
  <li><strong>React Native (v0.81.5):</strong> Framework base para el desarrollo de la aplicación móvil multiplataforma (iOS y Android).</li>
  <li><strong>Expo (v54.0.33):</strong> Conjunto de herramientas y servicios construidos alrededor de React Native que simplifican el acceso a APIs nativas y el proceso de compilación.</li>
  <li><strong>Expo Router (v6.0.23):</strong> Enrutador basado en el sistema de archivos para aplicaciones Expo, utilizado para la navegación entre pantallas.</li>
  <li><strong>TypeScript:</strong> Superconjunto de JavaScript que añade tipado estático, mejorando la mantenibilidad y reduciendo errores en tiempo de desarrollo.</li>
  <li><strong>AsyncStorage (@react-native-async-storage/async-storage):</strong> Solución de almacenamiento local persistente clave-valor para mantener sesiones y datos cacheados.</li>
  <li><strong>React Native Reanimated y Gesture Handler:</strong> Librerías empleadas para crear animaciones fluidas a 60fps y manejar gestos táctiles complejos.</li>
  <li><strong>Expo Camera e Image Picker:</strong> Módulos utilizados para la funcionalidad de captura y selección de imágenes/documentos.</li>
</ul>

<h2 style="color: red;">5. Arquitectura del Sistema</h2>
<p>La arquitectura del sistema sigue el patrón Modelo-Vista-Controlador (MVC) adaptado a las convenciones de React. La aplicación es de tipo "Client-Side", donde el estado global y la lógica de negocio se manejan a través de React Context, y la persistencia de datos se simula y almacena de forma local utilizando AsyncStorage, con la capacidad futura de conectarse a una API RESTful externa.</p>
<p><strong>Diagrama de Arquitectura de Alto Nivel (ASCII):</strong></p>
<pre style="background-color: #f4f4f4; padding: 10px; border: 1px solid #ccc; color: black;">
+-----------------------------------------------------+
|                     Capa de Vista                   |
|  (Pantallas: Login, Escáner, Dashboard, Perfil)     |
+--------------------------+--------------------------+
                           |
+--------------------------v--------------------------+
|                  Capa de Navegación                 |
|                   (Expo Router)                     |
+--------------------------+--------------------------+
                           |
+--------------------------v--------------------------+
|                  Capa de Estado                     |
|    (AuthContext, DataContext - React Context API)   |
+--------------------------+--------------------------+
                           |
+--------------------------v--------------------------+
|              Capa de Almacenamiento Local           |
|                    (AsyncStorage)                   |
+-----------------------------------------------------+
</pre>

<h2 style="color: red;">6. Estructura del Proyecto</h2>
<p>El código fuente se organiza siguiendo las convenciones de Expo Router, donde la estructura de directorios dicta la navegación de la aplicación.</p>
<ul>
  <li><strong>app/</strong>: Directorio principal que contiene las rutas y pantallas de la aplicación.
    <ul>
      <li><strong>(docente)/</strong>: Grupo de rutas protegido correspondiente al rol docente. Incluye el Dashboard (index.tsx), Tareas (actividades.tsx), Repositorio (archivos.tsx) y Perfil.</li>
      <li><strong>_layout.tsx</strong>: Define la estructura base de navegación y engloba la app en los proveedores de contexto (Auth y Data).</li>
      <li><strong>login.tsx</strong>: Pantalla de autenticación principal.</li>
      <li><strong>escaner*.tsx</strong>: Módulo dedicado a la captura, previsualización y guardado de documentos escaneados.</li>
    </ul>
  </li>
  <li><strong>components/</strong>: Contiene componentes de interfaz de usuario reutilizables (Badge, Card, ProgressBar, NotificacionesModal, etc.).</li>
  <li><strong>contexts/</strong>: Proveedores de estado global. Incluye <code>AuthContext.tsx</code> para la autenticación y <code>DataContext.tsx</code> para el manejo de evidencias, notificaciones y tareas.</li>
  <li><strong>constants/</strong>: Variables globales, temas de colores (theme.ts) y datos estáticos (cacesData.ts).</li>
  <li><strong>hooks/</strong>: Custom hooks de React para lógica compartida.</li>
  <li><strong>utils/</strong>: Funciones auxiliares, como algoritmos de procesamiento de imágenes o detección.</li>
  <li><strong>assets/</strong>: Recursos estáticos, incluyendo imágenes e iconos de la aplicación.</li>
</ul>

<h2 style="color: red;">7. Descripción Detallada del Código</h2>

<h3 style="color: red;">7.1. Módulo de Autenticación y Estado Global</h3>
<p><strong>Archivo: <code>contexts/AuthContext.tsx</code></strong></p>
<p>Propósito: Gestiona la sesión del usuario en la aplicación. Provee la interfaz <code>User</code> que define las propiedades del docente (id, nombre, email, departamento). Expone las funciones <code>login</code>, <code>logout</code>, y <code>updateUser</code>. La autenticación actual valida contra un usuario local codificado ("docente@edu.ec", "123456") y persiste la sesión en <code>AsyncStorage</code>.</p>

<p><strong>Archivo: <code>contexts/DataContext.tsx</code></strong></p>
<p>Propósito: Módulo central para la gestión de entidades de negocio. Define las interfaces <code>Evidence</code> (Documentos), <code>Task</code> (Tareas) y <code>Notification</code> (Notificaciones). El contexto carga los datos desde <code>AsyncStorage</code> al iniciar. Provee funciones para subir evidencias (<code>uploadEvidence</code>), revisar estados (<code>reviewEvidence</code>), y completar tareas (<code>completeTask</code>). Incorpora un mecanismo de "semilla" (seed) para inicializar la aplicación con datos de prueba si el almacenamiento está vacío.</p>

<h3 style="color: red;">7.2. Enrutamiento y Layouts</h3>
<p><strong>Archivo: <code>app/_layout.tsx</code></strong></p>
<p>Propósito: Punto de entrada de la jerarquía de la interfaz. Implementa un <code>ErrorBoundary</code> basado en componentes de clase de React para capturar y mostrar fallas de ejecución sin que la app se cierre bruscamente. Envuelve la jerarquía de navegación (<code>Stack</code>) con <code>AuthProvider</code> y <code>DataProvider</code>. Define las opciones globales de navegación, como las cabeceras de los módulos de escáner.</p>

<h3 style="color: red;">7.3. Módulo de Escáner de Documentos</h3>
<p><strong>Archivo: <code>app/escaner.tsx</code></strong></p>
<p>Propósito: Utiliza la librería <code>expo-camera</code> para acceder al hardware del dispositivo. Permite al usuario capturar fotografías de documentos de forma continua. Mantiene un arreglo temporal de imágenes capturadas y gestiona los permisos de hardware.</p>
<p><strong>Archivo: <code>app/escaner-preview.tsx</code></strong></p>
<p>Propósito: Muestra la fotografía recién capturada, permitiendo al usuario decidir si desea conservarla, descartarla o añadir más páginas al mismo documento.</p>
<p><strong>Archivo: <code>app/escaner-paginas.tsx</code> y <code>app/escaner-guardar.tsx</code></strong></p>
<p>Propósito: Proveen interfaces para ordenar las páginas escaneadas y consolidar el documento. En el guardado, se capturan metadatos del documento (tipo de documento, periodo) y se invoca a la función <code>uploadEvidence</code> del <code>DataContext</code>.</p>

<h3 style="color: red;">7.4. Módulo del Docente (Dashboard y Gestión)</h3>
<p><strong>Archivo: <code>app/(docente)/index.tsx</code></strong></p>
<p>Propósito: Tablero principal (Dashboard). Muestra un resumen del estado del docente, indicadores de progreso académico y acceso rápido a tareas pendientes y notificaciones.</p>
<p><strong>Archivo: <code>app/(docente)/actividades.tsx</code></strong></p>
<p>Propósito: Lista las tareas (Tasks) asignadas al docente. Permite diferenciar entre tareas pendientes y completadas, mostrando la fecha de vencimiento y ofreciendo un botón de acción rápida para subir el documento requerido.</p>
<p><strong>Archivo: <code>app/(docente)/archivos.tsx</code></strong></p>
<p>Propósito: Funciona como el repositorio documental personal del usuario. Lista todas las evidencias (Evidences) subidas, permitiendo filtrarlas y visualizar su estado de validación mediante componentes <code>Badge</code>.</p>

<h2 style="color: red;">8. Base de Datos</h2>
<p>Aunque la aplicación actualmente persiste datos de forma local en <code>AsyncStorage</code>, el esquema relacional formal proyectado (basado en el archivo <code>dbdiagram.dbml</code>) para la sincronización con el servidor backend (PostgreSQL/MySQL) es el siguiente:</p>

<p><strong>Tablas Principales:</strong></p>
<ul>
  <li><strong>users:</strong> Almacena la información de los docentes y administradores. Campos principales: id, name, email, password_hash, role, department.</li>
  <li><strong>evidences:</strong> Representa los documentos subidos. Clave foránea: <code>docente_id</code>. Campos: document_type, periodo, file_url, status (Enum: Pendiente, Validado, Observado), comment.</li>
  <li><strong>tasks:</strong> Tareas asignadas a los usuarios. Clave foránea: <code>docente_id</code>. Campos: title, deadline, completed, completed_evidence_id.</li>
  <li><strong>notifications:</strong> Notificaciones del sistema. Clave foránea: <code>user_id</code>. Campos: title, message, is_read, type.</li>
</ul>

<p><strong>Relaciones Identificadas:</strong></p>
<ul>
  <li>Un <strong>user</strong> puede tener múltiples <strong>evidences</strong> (Relación 1 a N).</li>
  <li>Un <strong>user</strong> puede tener múltiples <strong>tasks</strong> (Relación 1 a N).</li>
  <li>Un <strong>user</strong> recibe múltiples <strong>notifications</strong> (Relación 1 a N).</li>
  <li>Una <strong>task</strong> se asocia opcionalmente a una <strong>evidence</strong> específica que acredita su culminación (Relación 1 a 1 parcial).</li>
</ul>

<h2 style="color: red;">9. APIs y Servicios</h2>
<p>El sistema en su versión 1.0.0 opera de manera completamente asíncrona ("offline-first") simulando los endpoints a través del <code>DataContext</code>. Las funciones principales actúan como métodos HTTP simulados:</p>
<ul>
  <li><strong>POST /api/auth/login:</strong> Simulado por <code>login(email, password)</code> en <code>AuthContext</code>.</li>
  <li><strong>GET /api/evidences:</strong> Simulado en la carga inicial de <code>DataContext</code> leyendo desde AsyncStorage.</li>
  <li><strong>POST /api/evidences:</strong> Simulado por <code>uploadEvidence(evidence)</code>, genera un UUID y actualiza la lista global.</li>
  <li><strong>PUT /api/evidences/{id}/status:</strong> Simulado por <code>reviewEvidence(id, status, comment)</code>. Adicionalmente, este método dispara la creación lógica de una notificación para el usuario.</li>
  <li><strong>PUT /api/tasks/{id}/complete:</strong> Simulado por <code>completeTask(taskId, evidenceId)</code>.</li>
</ul>
<p>Nota de Inferencia: Se asume que para la versión de producción se implementará Axios o Fetch API en estos métodos para conectarse a un backend Node.js o Python estructurado sobre la base de datos antes descrita.</p>

<h2 style="color: red;">10. Flujo de Funcionamiento</h2>
<ol>
  <li><strong>Inicio e Inicialización:</strong> La aplicación se ejecuta e ingresa al <code>app/_layout.tsx</code>. Se inicializan los contextos. El enrutador redirige a <code>app/index.tsx</code>, el cual limpia la sesión antigua y redirige a la pantalla de Login.</li>
  <li><strong>Autenticación:</strong> El docente introduce sus credenciales en <code>login.tsx</code>. El sistema valida las credenciales y guarda el estado en AsyncStorage, redirigiendo a la ruta segura <code>/(docente)</code>.</li>
  <li><strong>Dashboard:</strong> El sistema carga la vista <code>(docente)/index.tsx</code> mostrando las notificaciones no leídas y el resumen de tareas.</li>
  <li><strong>Resolución de Tareas:</strong> El docente navega a "Actividades", selecciona una tarea y pulsa en adjuntar documento.</li>
  <li><strong>Escaneo o Subida:</strong> Se abre el módulo de escáner. El docente toma fotografías. Al finalizar, ingresa metadatos y guarda.</li>
  <li><strong>Actualización de Estado:</strong> La nueva evidencia se inyecta en el contexto global, la tarea se marca como completada y los datos se guardan de forma persistente en disco.</li>
</ol>

<h2 style="color: red;">11. Instalación y Configuración</h2>
<p>Para configurar un entorno de desarrollo local y compilar la aplicación, siga estos pasos formales:</p>
<ol>
  <li><strong>Prerrequisitos:</strong> Instale Node.js (versión 18 o superior) y el gestor de paquetes npm o yarn.</li>
  <li><strong>Clonación del Repositorio:</strong> Obtenga el código fuente desde el repositorio institucional.</li>
  <li><strong>Instalación de Dependencias:</strong> Ejecute el comando <code>npm install</code> en la raíz del proyecto para descargar todas las dependencias listadas en el <code>package.json</code>.</li>
  <li><strong>Ejecución del Servidor de Desarrollo:</strong> Ejecute el comando <code>npm run start</code> o <code>npx expo start</code>.</li>
  <li><strong>Visualización:</strong> Instale la aplicación "Expo Go" en su dispositivo móvil físico (iOS/Android). Escanee el código QR generado en la terminal para compilar e iniciar la aplicación en el dispositivo a través de la red de área local.</li>
</ol>

<h2 style="color: red;">12. Despliegue</h2>
<p>Para la generación de los paquetes nativos de producción (APK/AAB para Android y IPA para iOS), se empleará el servicio Expo Application Services (EAS):</p>
<ul>
  <li>Instale la CLI de EAS: <code>npm install -g eas-cli</code>.</li>
  <li>Inicie sesión en Expo: <code>eas login</code>.</li>
  <li>Configure el proyecto para compilación: <code>eas build:configure</code>.</li>
  <li>Para generar el archivo de Android: <code>eas build --platform android --profile production</code>.</li>
  <li>Para generar el archivo de iOS: <code>eas build --platform ios --profile production</code> (requiere credenciales del programa de desarrolladores de Apple).</li>
</ul>

<h2 style="color: red;">13. Seguridad</h2>
<p>El sistema en su fase actual es un prototipo local. Sin embargo, se establecen las siguientes directrices de seguridad para su paso a producción:</p>
<ul>
  <li>Todas las comunicaciones con el backend deberán realizarse de manera obligatoria a través del protocolo HTTPS/TLS.</li>
  <li>La autenticación deberá transicionar a un mecanismo basado en tokens, preferentemente JSON Web Tokens (JWT), con expiración y rotación de tokens (Refresh Tokens).</li>
  <li>Las contraseñas de los usuarios no deben almacenarse en la base de datos de manera explícita, sino utilizando algoritmos de hashing criptográfico seguro como bcrypt o Argon2.</li>
  <li>Las imágenes escaneadas almacenadas temporalmente en el caché del dispositivo deben purgarse al cerrar sesión.</li>
</ul>

<h2 style="color: red;">14. Pruebas y Validaciones</h2>
<p>Se recomienda la implementación de las siguientes estrategias de aseguramiento de calidad (QA):</p>
<ul>
  <li><strong>Pruebas Unitarias:</strong> Implementación de pruebas con <code>Jest</code> para la validación de funciones lógicas dentro del archivo <code>utils/detectarMargenes.ts</code> y la lógica de validación del <code>DataContext</code>.</li>
  <li><strong>Pruebas de Integración:</strong> Validar el correcto flujo de autenticación, asegurando que un usuario no autenticado sea redirigido de las rutas seguras protegidas por el layout.</li>
  <li><strong>Pruebas E2E (End-to-End):</strong> Utilización de frameworks como Detox o Maestro para automatizar la simulación de navegación, el escaneo de documentos y la confirmación de guardado.</li>
</ul>

<h2 style="color: red;">15. Mantenimiento</h2>
<p>Las labores de mantenimiento requeridas para asegurar la operatividad a largo plazo incluyen:</p>
<ul>
  <li>Monitoreo de actualizaciones críticas de React Native y el SDK de Expo para asegurar la compatibilidad con las nuevas versiones de los sistemas operativos iOS y Android.</li>
  <li>Revisión periódica de librerías de terceros (ej., <code>expo-camera</code>, <code>react-navigation</code>) debido a posibles brechas de seguridad o deprecaciones de API.</li>
  <li>Depuración y optimización de los componentes de animación (Reanimated) en dispositivos móviles de gama baja para asegurar un rendimiento óptimo.</li>
</ul>

<h2 style="color: red;">16. Mejoras Futuras</h2>
<ul>
  <li><strong>Integración con Backend Real:</strong> Remplazar la lógica de <code>AsyncStorage</code> en <code>DataContext.tsx</code> por peticiones asíncronas a una API REST corporativa oficial.</li>
  <li><strong>Validación con Inteligencia Artificial:</strong> Integrar algoritmos de OCR (Reconocimiento Óptico de Caracteres) para extraer datos de los documentos escaneados y pre-llenar los formularios de metadatos automáticamente.</li>
  <li><strong>Soporte Multi-Rol:</strong> Desarrollar las vistas y flujos para perfiles de "Administrador" o "Revisor", permitiendo aprobar o rechazar documentos directamente desde la aplicación móvil.</li>
  <li><strong>Notificaciones Push:</strong> Configurar el servicio de notificaciones Push (APNs y FCM) a través de Expo Push Notifications para alertar al docente sobre vencimientos de tareas o rechazos documentales aun cuando la aplicación esté en segundo plano.</li>
</ul>

<h2 style="color: red;">17. Conclusiones</h2>
<p>El proyecto EduSudamericano proporciona una solución arquitectónicamente sólida para resolver la gestión documental de docentes. Su desarrollo basado en React Native y Expo garantiza tiempos de iteración rápidos, alta mantenibilidad del código bajo el paradigma de componentes reutilizables y un rendimiento cercano al de aplicaciones nativas puras. Las bases de diseño de estado global implementadas permiten una escalabilidad horizontal fluida ante futuros requerimientos corporativos.</p>

<h2 style="color: red;">18. Anexos</h2>
<p>La documentación del código base (endpoints simulados, tipados y variables de entorno) se encuentra definida en el repositorio de versionamiento Git correspondiente (<code>https://github.com/pablopablo007/REPOSITORIO-MOBILE-PROYECTO-.git</code>).</p>

</div>
