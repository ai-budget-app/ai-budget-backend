import jwt from 'jsonwebtoken';

/**
 * Middleware для проверки JWT токена
 * Защищает приватные роуты от неавторизованного доступа
 */
const checkAuth = async (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Токен не предоставлен. Доступ запрещен.',
      });
    }

    // Проверяем формат: "Bearer TOKEN"
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return res.status(401).json({
        message: 'Неверный формат токена. Используйте Bearer token.',
      });
    }

    // Верифицируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Добавляем данные пользователя в запрос
    req.userId = decoded.userId;
    req.user = decoded;

    next();
  } catch (error) {
    // Обработка различных ошибок JWT
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Недействительный токен',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Токен истек. Пожалуйста, войдите снова.',
      });
    }

    return res.status(500).json({
      message: 'Ошибка авторизации',
      error: error.message,
    });
  }
};

export default checkAuth;
