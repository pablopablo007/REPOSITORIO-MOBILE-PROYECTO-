const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar a todos los docentes
  const users = await prisma.user.findMany({
    where: { role: 'DOCENTE' }
  });

  if (users.length === 0) {
    console.error("No se encontró ningún docente en la base de datos.");
    return;
  }

  // Iterar por cada docente y crear una nueva actividad de prueba
  for (const user of users) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2); // Para dentro de 2 días

    const task = await prisma.task.create({
      data: {
        docenteId: user.id,
        title: '¡Prueba en APK en Vivo!',
        description: 'Esta es una actividad de prueba que acabo de crear para verificar si te llega la notificación en tiempo real a tu celular. Por favor, intenta subir un documento aquí.',
        deadline: deadline,
        documentType: 'OTRO',
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: '¡Nueva prueba en el APK! 📱',
        message: `Actividad asignada: ${task.title}. Entra a revisar si todo carga bien.`,
        type: 'INFO',
        taskId: task.id,
      }
    });

    console.log(`Actividad de prueba creada para el docente: ${user.name}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
