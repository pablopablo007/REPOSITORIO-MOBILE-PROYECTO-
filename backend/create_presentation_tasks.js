const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'DOCENTE' }
  });

  if (users.length === 0) {
    console.error("No se encontró ningún docente en la base de datos.");
    return;
  }

  for (const user of users) {
    // 1. Entrega del Sílabo del Semestre
    const deadline1 = new Date();
    deadline1.setDate(deadline1.getDate() + 3); 

    const task1 = await prisma.task.create({
      data: {
        docenteId: user.id,
        title: 'Subir Sílabo y Planificación - Semestre 2026',
        description: 'Por favor, sube en formato PDF el sílabo actualizado de las materias asignadas para este nuevo periodo, debidamente firmado.',
        deadline: deadline1,
        documentType: 'ACADEMICO',
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Nueva actividad 📚',
        message: `Se te ha asignado la actividad: ${task1.title}`,
        type: 'INFO',
        taskId: task1.id,
      }
    });

    // 2. Acta de Calificaciones
    const deadline2 = new Date();
    deadline2.setDate(deadline2.getDate() + 7); 

    const task2 = await prisma.task.create({
      data: {
        docenteId: user.id,
        title: 'Acta de Calificaciones del 1er Parcial',
        description: 'Adjunta el acta oficial de calificaciones del primer parcial. Asegúrate de que las firmas físicas sean visibles.',
        deadline: deadline2,
        documentType: 'ACTA',
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Nueva actividad 📝',
        message: `Se te ha asignado la actividad: ${task2.title}`,
        type: 'INFO',
        taskId: task2.id,
      }
    });

    // 3. Certificación de Actualización
    const deadline3 = new Date();
    deadline3.setDate(deadline3.getDate() + 15); 

    const task3 = await prisma.task.create({
      data: {
        docenteId: user.id,
        title: 'Certificado de Capacitación Pedagógica',
        description: 'Como parte de la evaluación docente, sube el certificado o diploma de la última capacitación avalada a la que asististe.',
        deadline: deadline3,
        documentType: 'TITULO',
      }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Nueva actividad 🎓',
        message: `Se te ha asignado la actividad: ${task3.title}`,
        type: 'INFO',
        taskId: task3.id,
      }
    });

    console.log(`Las 3 actividades fueron creadas para el docente: ${user.name}`);
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
