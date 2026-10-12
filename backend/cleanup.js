const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando limpieza...");

  // Eliminar notificaciones (tienen foreign keys a Task y Evidence)
  await prisma.notification.deleteMany({});
  console.log("✅ Notificaciones eliminadas");

  // Eliminar tareas (Actividades)
  await prisma.task.deleteMany({});
  console.log("✅ Tareas eliminadas");

  // Eliminar evidencias (Archivos)
  await prisma.evidence.deleteMany({});
  console.log("✅ Evidencias eliminadas");

  // Eliminar archivos físicos
  const uploadsDir = path.join(__dirname, 'uploads', 'documents');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    let deletedCount = 0;
    for (const file of files) {
      if (file !== '.gitkeep') { // No eliminar archivos ocultos/gitkeep si los hay
        fs.unlinkSync(path.join(uploadsDir, file));
        deletedCount++;
      }
    }
    console.log(`✅ ${deletedCount} archivos PDF eliminados de la carpeta uploads/documents`);
  } else {
    console.log("⚠️ La carpeta uploads/documents no existe.");
  }

  console.log("Limpieza completada con éxito. Todo está en 0.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
