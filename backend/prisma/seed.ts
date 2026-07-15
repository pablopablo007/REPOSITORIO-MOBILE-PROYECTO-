import { PrismaClient, Role, DocumentType, EvidenceStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // ── 1. Limpiar datos existentes ─────────────────────────
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.cacesIndicator.deleteMany();
  await prisma.cacesSubcategory.deleteMany();
  await prisma.cacesCategory.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Tablas limpiadas');

  // ── 2. Crear usuarios ───────────────────────────────────
  const passwordHash = await bcrypt.hash('123456', 10);

  const docente = await prisma.user.create({
    data: {
      name: 'Prof. Pablo Mora',
      email: 'docente@edu.ec',
      passwordHash,
      phone: '+593 98 765 4321',
      department: 'Ciencias Biológicas',
      period: '2025',
      initials: 'PM',
      degree: 'Magíster en Biología',
      role: Role.DOCENTE,
      active: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Admin RRHH',
      email: 'admin@edu.ec',
      passwordHash: await bcrypt.hash('admin123', 10),
      department: 'Recursos Humanos',
      period: '2025',
      initials: 'AR',
      role: Role.ADMIN,
      active: true,
    },
  });

  console.log(`✅ Usuarios creados: ${docente.email}, ${admin.email}`);

  // ── 3. Crear evidencias (documentos) ────────────────────
  const ev1 = await prisma.evidence.create({
    data: {
      docenteId: docente.id,
      documentType: DocumentType.ACADEMICO,
      periodo: '2024',
      fileName: 'Syllabus_Biologia_2024.pdf',
      fileUrl: null,
      status: EvidenceStatus.VALIDADO,
      description: 'Syllabus del período 2024',
    },
  });

  const ev2 = await prisma.evidence.create({
    data: {
      docenteId: docente.id,
      documentType: DocumentType.TITULO,
      periodo: '2025',
      fileName: 'Titulo_Maestria.pdf',
      fileUrl: null,
      status: EvidenceStatus.PENDIENTE,
      scanned: true,
    },
  });

  const ev3 = await prisma.evidence.create({
    data: {
      docenteId: docente.id,
      documentType: DocumentType.ACTA,
      periodo: '2025',
      fileName: 'Acta_Reunion_Marzo.docx',
      fileUrl: null,
      status: EvidenceStatus.OBSERVADO,
      comment: 'Falta firma del director',
    },
  });

  console.log('✅ Evidencias creadas: 3 documentos');

  // ── 4. Crear tareas ─────────────────────────────────────
  const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.task.createMany({
    data: [
      {
        docenteId: docente.id,
        title: 'Subir título de cuarto nivel',
        description: 'Sube tu título de maestría en PDF firmado y sellado',
        deadline: daysFromNow(2),
        documentType: DocumentType.TITULO,
        completed: false,
      },
      {
        docenteId: docente.id,
        title: 'Syllabus período 2025',
        description: 'Sube el syllabus de todas tus materias actualizadas',
        deadline: daysFromNow(6),
        documentType: DocumentType.ACADEMICO,
        completed: false,
      },
      {
        docenteId: docente.id,
        title: 'Certificado de capacitación docente',
        description: 'Sube certificados de cursos realizados',
        deadline: daysFromNow(10),
        documentType: DocumentType.TITULO,
        completed: false,
      },
    ],
  });

  console.log('✅ Tareas creadas: 3 actividades pendientes');

  // ── 5. Crear notificaciones ─────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: docente.id,
        title: 'Documento observado',
        message: "Tu documento 'Acta_Reunion_Marzo.docx' fue observado. Falta firma del director.",
        type: NotificationType.WARNING,
        isRead: false,
      },
      {
        userId: docente.id,
        title: 'Nueva actividad asignada',
        message: 'Se te ha asignado: Certificado de capacitación',
        type: NotificationType.INFO,
        isRead: false,
      },
      {
        userId: docente.id,
        title: 'Documento validado',
        message: "Tu documento 'Syllabus_Biologia_2024.pdf' fue validado por RRHH.",
        type: NotificationType.SUCCESS,
        isRead: true,
      },
    ],
  });

  console.log('✅ Notificaciones creadas: 3 notificaciones');

  // ── 6. Crear catálogo CACES ─────────────────────────────
  const cacesData = [
    {
      code: '1', name: '1. Organización',
      subcategories: [
        {
          code: '1.1', name: '1.1 Planificación y desarrollo',
          indicators: [
            { code: '1.1.1', name: '1.1.1 Planificación estratégica y misión institucional' },
            { code: '1.1.2', name: '1.1.2 Relaciones interinstitucionales' },
            { code: '1.1.3', name: '1.1.3 Aseguramiento de la calidad' },
            { code: '1.1.4', name: '1.1.4 Sistema informático de gestión' },
          ],
        },
        {
          code: '1.2', name: '1.2 Gestión social',
          indicators: [
            { code: '1.2.1', name: '1.2.1 Bienestar estudiantil' },
            { code: '1.2.2', name: '1.2.2 Participación estudiantil' },
          ],
        },
      ],
    },
    {
      code: '2', name: '2. Infraestructura',
      subcategories: [
        {
          code: '2.1', name: '2.1 Infraestructura física',
          indicators: [
            { code: '2.1.1', name: '2.1.1 Espacios académicos' },
            { code: '2.1.2', name: '2.1.2 Laboratorios y talleres' },
            { code: '2.1.3', name: '2.1.3 Bibliotecas y recursos de información' },
          ],
        },
        {
          code: '2.2', name: '2.2 Tecnología',
          indicators: [
            { code: '2.2.1', name: '2.2.1 Equipamiento tecnológico' },
            { code: '2.2.2', name: '2.2.2 Conectividad y redes' },
          ],
        },
      ],
    },
    {
      code: '3', name: '3. Profesores',
      subcategories: [
        {
          code: '3.1', name: '3.1 Titulación y formación',
          indicators: [
            { code: '3.1.1', name: '3.1.1 Títulos de cuarto nivel' },
            { code: '3.1.2', name: '3.1.2 Formación y capacitación docente' },
          ],
        },
        {
          code: '3.2', name: '3.2 Dedicación y experiencia',
          indicators: [
            { code: '3.2.1', name: '3.2.1 Dedicación horaria docente' },
            { code: '3.2.2', name: '3.2.2 Experiencia profesional' },
          ],
        },
      ],
    },
    {
      code: '4', name: '4. Docencia',
      subcategories: [
        {
          code: '4.1', name: '4.1 Currículo',
          indicators: [
            { code: '4.1.1', name: '4.1.1 Pertinencia del currículo' },
            { code: '4.1.2', name: '4.1.2 Actualización curricular' },
          ],
        },
        {
          code: '4.2', name: '4.2 Proceso de aprendizaje',
          indicators: [
            { code: '4.2.1', name: '4.2.1 Metodologías de enseñanza' },
            { code: '4.2.2', name: '4.2.2 Evaluación del aprendizaje' },
          ],
        },
      ],
    },
    {
      code: '5', name: '5. I+D e Innovación',
      subcategories: [
        {
          code: '5.1', name: '5.1 Investigación',
          indicators: [
            { code: '5.1.1', name: '5.1.1 Proyectos de investigación' },
            { code: '5.1.2', name: '5.1.2 Publicaciones científicas' },
          ],
        },
        {
          code: '5.2', name: '5.2 Innovación',
          indicators: [
            { code: '5.2.1', name: '5.2.1 Transferencia tecnológica' },
            { code: '5.2.2', name: '5.2.2 Patentes y productos' },
          ],
        },
      ],
    },
    {
      code: '6', name: '6. Vinculación con la Sociedad',
      subcategories: [
        {
          code: '6.1', name: '6.1 Programas de vinculación',
          indicators: [
            { code: '6.1.1', name: '6.1.1 Proyectos comunitarios' },
            { code: '6.1.2', name: '6.1.2 Convenios interinstitucionales' },
          ],
        },
        {
          code: '6.2', name: '6.2 Prácticas preprofesionales',
          indicators: [
            { code: '6.2.1', name: '6.2.1 Seguimiento de prácticas' },
            { code: '6.2.2', name: '6.2.2 Evaluación de tutores externos' },
          ],
        },
      ],
    },
  ];

  for (const cat of cacesData) {
    const category = await prisma.cacesCategory.create({
      data: { code: cat.code, name: cat.name },
    });

    for (const sub of cat.subcategories) {
      const subcategory = await prisma.cacesSubcategory.create({
        data: { code: sub.code, name: sub.name, categoryId: category.id },
      });

      for (const ind of sub.indicators) {
        await prisma.cacesIndicator.create({
          data: { code: ind.code, name: ind.name, subcategoryId: subcategory.id },
        });
      }
    }
  }

  console.log('✅ Catálogo CACES creado: 6 categorías, 12 subcategorías, 24 indicadores');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('─────────────────────────────────────────');
  console.log('👤 Credenciales de prueba:');
  console.log('   Docente → docente@edu.ec / 123456');
  console.log('   Admin   → admin@edu.ec   / admin123');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
