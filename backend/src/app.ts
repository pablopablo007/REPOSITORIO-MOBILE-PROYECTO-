import express from 'express';
import cors from 'cors';
import path from 'path';

// Rutas
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import evidencesRoutes from './modules/evidences/evidences.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

// Middleware de error global
import { errorHandler } from './middlewares/errorHandler.middleware';

const app = express();

// ── Middlewares globales ────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  if (req.method === 'POST') console.log('Body:', req.body);
  next();
});

app.use(cors({
  origin: '*', // En producción, restringir al dominio de la app
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos (archivos subidos)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rutas ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/evidences', evidencesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'EduSudamericano API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ── Error handler global ────────────────────────────────────
app.use(errorHandler);

export default app;
