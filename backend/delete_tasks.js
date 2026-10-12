const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Eliminando todas las notificaciones...");
  await prisma.notification.deleteMany({});
  
  console.log("Eliminando todas las actividades (tareas)...");
  await prisma.task.deleteMany({});
  
  console.log("¡Limpieza de actividades completada exitosamente!");
}

main()
  .catch(e => {
    console.error("Error al limpiar:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
