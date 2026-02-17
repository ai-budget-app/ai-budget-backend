import multer from 'multer';

/**
 * Конфигурация Multer для загрузки файлов в память
 * Используется для аватаров пользователей или чеков расходов
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый формат файла. Разрешены: JPEG, PNG, GIF, WebP'), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Максимум 5MB
  },
  fileFilter: fileFilter,
});
