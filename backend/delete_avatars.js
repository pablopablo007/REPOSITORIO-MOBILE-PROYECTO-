const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Removiendo los avatares de todos los usuarios en la base de datos...");
  await prisma.user.updateMany({
    data: {
      avatar: null
    }
  });
  
  console.log("Base de datos actualizada.");

  const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
  
  if (fs.existsSync(avatarsDir)) {
    console.log("Eliminando archivos físicos de avatares...");
    const files = fs.readdirSync(avatarsDir);
    
    let count = 0;
    for (const file of files) {
      // Opcional: no borrar archivos por defecto si existen, pero aquí borramos todos
      if (file !== '.gitkeep') {
        fs.unlinkSync(path.join(avatarsDir, file));
        count++;
      }
    }
    console.log(`Se eliminaron ${count} fotos de perfil físicamente.`);
  }

  console.log("¡Limpieza de fotos de perfil completada exitosamente!");
}

main()
  .catch(e => {
    console.error("Error al limpiar avatares:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
