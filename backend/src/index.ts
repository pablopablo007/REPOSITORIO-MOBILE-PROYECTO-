import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     EduSudamericano Backend API        ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  🚀 Servidor corriendo en puerto ${PORT}   ║`);
  console.log(`║  📦 Modo: ${process.env.NODE_ENV}                 ║`);
  console.log('║  📡 Base: postgresql://localhost/sudabase║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('  Endpoints disponibles:');
  console.log('  POST   /api/auth/login');
  console.log('  GET    /api/users/me');
  console.log('  GET    /api/evidences');
  console.log('  POST   /api/evidences');
  console.log('  GET    /api/tasks');
  console.log('  GET    /api/notifications');
  console.log('  GET    /api/dashboard/summary');
  console.log('');
});
