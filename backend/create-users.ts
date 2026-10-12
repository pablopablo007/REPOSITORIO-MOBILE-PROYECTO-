import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando creación de usuarios...');
  const passwordHash = await bcrypt.hash('123456', 10);
  
  const users = [
    { name: 'Eras Eras Nancy Maribel', subject: 'Probabilidades y Procesos Estocásticos', email: 'neras@edu.ec', initials: 'NE' },
    { name: 'Perez Ochoa Joaquin Andres', subject: 'Software Aplicativo', email: 'jperez@edu.ec', initials: 'JP' },
    { name: 'Tigre Avila Henry Paul', subject: 'Aplicaciones Tecnológicas Autónomas', email: 'htigre@edu.ec', initials: 'HT' },
    { name: 'Vacacela Saca Jhostin Omar', subject: 'Herramientas Informáticas para el Despliegue de Diagramas', email: 'jvacacela@edu.ec', initials: 'JV' },
    { name: 'Aldas Perez Stephany Carolina', subject: 'Programación de Aplicaciones para Dispositivos Móviles', email: 'saldas@edu.ec', initials: 'SA' },
  ];

  for (const u of users) {
    // Check if exists
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          passwordHash,
          department: u.subject,
          period: '2025',
          initials: u.initials,
          role: Role.DOCENTE,
          active: true,
        },
      });
      console.log(`✅ Creado: ${u.name} -> ${u.email} / 123456`);
    } else {
      console.log(`⚠️ Ya existe: ${u.name} -> ${u.email}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
