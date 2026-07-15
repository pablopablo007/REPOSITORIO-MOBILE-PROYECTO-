import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Función auxiliar para crear directorios si no existen
const createDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const baseUploadDir = path.join(__dirname, '..', '..', 'uploads');
const avatarsDir = path.join(baseUploadDir, 'avatars');
const documentsDir = path.join(baseUploadDir, 'documents');

createDir(avatarsDir);
createDir(documentsDir);

// Función para crear un storage específico
const createStorage = (folderPath: string) => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, folderPath);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
};

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Use PDF, JPG, PNG o DOCX.'));
  }
};

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20');

// Middleware para subir avatares (fotos de perfil)
export const uploadAvatar = multer({
  storage: createStorage(avatarsDir),
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

// Middleware para subir documentos (evidencias)
export const uploadDocument = multer({
  storage: createStorage(documentsDir),
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});
