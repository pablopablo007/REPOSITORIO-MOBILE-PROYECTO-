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

  // Iterar por cada docente y crearles dos actividades
  for (const user of users) {
    const deadline1 = new Date();
    deadline1.setDate(deadline1.getDate() + 3); 

    const task1 = await prisma.task.create({
      data: {
        docenteId: user.id,
        title: 'Planificación Académica 2026',
        description: 'Subir el documento de planificación académica correspondiente al nuevo ciclo lectivo.',
        deadline: deadline1,
        documentType: 'ACADEMICO',
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Nueva actividad asignada ℹ️',
        message: `Se te ha asignado la actividad: ${task1.title}`,
        type: 'INFO',
        taskId: task1.id,
      }
    });

    const deadline2 = new Date();
    deadline2.setDate(deadline2.getDate() + 15); 

    const task2 = await prisma.task.create({
      data: {
        docenteId: user.id,
        title: 'Acta de Calificaciones Parciales',
        description: 'Adjuntar el acta firmada con las calificaciones del primer parcial.',
        deadline: deadline2,
        documentType: 'ACTA',
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Nueva actividad asignada ℹ️',
        message: `Se te ha asignado la actividad: ${task2.title}`,
        type: 'INFO',
        taskId: task2.id,
      }
    });

    console.log(`2 Actividades creadas con éxito para el docente: ${user.name}`);
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
