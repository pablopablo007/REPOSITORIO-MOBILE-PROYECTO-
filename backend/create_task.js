const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar un usuario (el primero que sea DOCENTE)
  const user = await prisma.user.findFirst({
    where: { role: 'DOCENTE' }
  });

  if (!user) {
    console.error("No se encontró ningún docente en la base de datos.");
    return;
  }

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7); // Una semana desde hoy

  // Crear la tarea
  const task = await prisma.task.create({
    data: {
      docenteId: user.id,
      title: 'Subir Certificado de Innovación',
      description: 'Por favor, sube tu certificado de la última capacitación de innovación académica.',
      deadline: deadline,
      documentType: 'TITULO',
    }
  });

  // Crear la notificación
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Nueva actividad asignada ℹ️',
      message: `Se te ha asignado la actividad: ${task.title}`,
      type: 'INFO',
      taskId: task.id,
    }
  });

  console.log(`Actividad y notificación creadas con éxito para el usuario ${user.name}!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
