export interface Indicator {
  id: string;
  name: string;
}

export interface SubCategory {
  id: string;
  name: string;
  indicators: Indicator[];
}

export interface Category {
  id: string;
  name: string;
  subcategories: SubCategory[];
}

export const CACES_CATEGORIES: Category[] = [
  {
    id: '1',
    name: '1. Organización',
    subcategories: [
      {
        id: '1.1',
        name: '1.1 Planificación y desarrollo',
        indicators: [
          { id: '1.1.1', name: '1.1.1 Planificación estratégica y misión institucional' },
          { id: '1.1.2', name: '1.1.2 Relaciones interinstitucionales' },
          { id: '1.1.3', name: '1.1.3 Aseguramiento de la calidad' },
          { id: '1.1.4', name: '1.1.4 Sistema informático de gestión' },
        ],
      },
      {
        id: '1.2',
        name: '1.2 Gestión social',
        indicators: [
          { id: '1.2.1', name: '1.2.1 Bienestar estudiantil' },
          { id: '1.2.2', name: '1.2.2 Participación estudiantil' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: '2. Infraestructura',
    subcategories: [
      {
        id: '2.1',
        name: '2.1 Infraestructura física',
        indicators: [
          { id: '2.1.1', name: '2.1.1 Espacios académicos' },
          { id: '2.1.2', name: '2.1.2 Laboratorios y talleres' },
          { id: '2.1.3', name: '2.1.3 Bibliotecas y recursos de información' },
        ],
      },
      {
        id: '2.2',
        name: '2.2 Tecnología',
        indicators: [
          { id: '2.2.1', name: '2.2.1 Equipamiento tecnológico' },
          { id: '2.2.2', name: '2.2.2 Conectividad y redes' },
        ],
      },
    ],
  },
  {
    id: '3',
    name: '3. Profesores',
    subcategories: [
      {
        id: '3.1',
        name: '3.1 Titulación y formación',
        indicators: [
          { id: '3.1.1', name: '3.1.1 Títulos de cuarto nivel' },
          { id: '3.1.2', name: '3.1.2 Formación y capacitación docente' },
        ],
      },
      {
        id: '3.2',
        name: '3.2 Dedicación y experiencia',
        indicators: [
          { id: '3.2.1', name: '3.2.1 Dedicación horaria docente' },
          { id: '3.2.2', name: '3.2.2 Experiencia profesional' },
        ],
      },
    ],
  },
  {
    id: '4',
    name: '4. Docencia',
    subcategories: [
      {
        id: '4.1',
        name: '4.1 Currículo',
        indicators: [
          { id: '4.1.1', name: '4.1.1 Pertinencia del currículo' },
          { id: '4.1.2', name: '4.1.2 Actualización curricular' },
        ],
      },
      {
        id: '4.2',
        name: '4.2 Proceso de aprendizaje',
        indicators: [
          { id: '4.2.1', name: '4.2.1 Metodologías de enseñanza' },
          { id: '4.2.2', name: '4.2.2 Evaluación del aprendizaje' },
        ],
      },
    ],
  },
  {
    id: '5',
    name: '5. I+D e Innovación',
    subcategories: [
      {
        id: '5.1',
        name: '5.1 Investigación',
        indicators: [
          { id: '5.1.1', name: '5.1.1 Proyectos de investigación' },
          { id: '5.1.2', name: '5.1.2 Publicaciones científicas' },
        ],
      },
      {
        id: '5.2',
        name: '5.2 Innovación',
        indicators: [
          { id: '5.2.1', name: '5.2.1 Transferencia tecnológica' },
          { id: '5.2.2', name: '5.2.2 Patentes y productos' },
        ],
      },
    ],
  },
  {
    id: '6',
    name: '6. Vinculación con la Sociedad',
    subcategories: [
      {
        id: '6.1',
        name: '6.1 Programas de vinculación',
        indicators: [
          { id: '6.1.1', name: '6.1.1 Proyectos comunitarios' },
          { id: '6.1.2', name: '6.1.2 Convenios interinstitucionales' },
        ],
      },
      {
        id: '6.2',
        name: '6.2 Prácticas preprofesionales',
        indicators: [
          { id: '6.2.1', name: '6.2.1 Seguimiento de prácticas' },
          { id: '6.2.2', name: '6.2.2 Evaluación de tutores externos' },
        ],
      },
    ],
  },
];

export const YEARS = ['2025', '2024', '2023'];
