import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from './AuthSchema.js';

/**
 * Генерация JWT токена
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Регистрация нового пользователя
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    // Валидация входных данных
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Ошибка валидации',
        errors: errors.array(),
      });
    }

    const { email, password, name } = req.body;

    // Проверка существования пользователя
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'Пользователь с таким email уже существует',
      });
    }

    // Создание нового пользователя
    const user = new User({
      email,
      password,
      name,
    });

    await user.save();

    // Генерация токена
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      message: 'Ошибка при регистрации',
      error: error.message,
    });
  }
};

/**
 * Авторизация пользователя
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    // Валидация входных данных
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Ошибка валидации',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Поиск пользователя с паролем
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Неверный email или пароль',
      });
    }

    // Проверка активности аккаунта
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Аккаунт деактивирован. Обратитесь в поддержку.',
      });
    }

    // Проверка пароля
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Неверный email или пароль',
      });
    }

    // Обновление времени последнего входа
    user.lastLogin = new Date();
    await user.save();

    // Генерация токена
    const token = generateToken(user._id);

    res.json({
      message: 'Авторизация успешна',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      message: 'Ошибка при авторизации',
      error: error.message,
    });
  }
};

/**
 * Получение профиля текущего пользователя
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден',
      });
    }

    res.json({
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении профиля',
      error: error.message,
    });
  }
};

/**
 * Обновление профиля пользователя
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден',
      });
    }

    // Обновление полей
    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      message: 'Профиль обновлен',
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('UpdateProfile Error:', error);
    res.status(500).json({
      message: 'Ошибка при обновлении профиля',
      error: error.message,
    });
  }
};

/**
 * Изменение пароля
 * PUT /api/auth/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Необходимо указать текущий и новый пароль',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Новый пароль должен быть минимум 6 символов',
      });
    }

    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден',
      });
    }

    // Проверка текущего пароля
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Неверный текущий пароль',
      });
    }

    // Установка нового пароля
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Пароль успешно изменен',
    });
  } catch (error) {
    console.error('ChangePassword Error:', error);
    res.status(500).json({
      message: 'Ошибка при изменении пароля',
      error: error.message,
    });
  }
};

/**
 * Удаление аккаунта
 * DELETE /api/auth/account
 */
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: 'Необходимо указать пароль для подтверждения',
      });
    }

    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден',
      });
    }

    // Проверка пароля
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Неверный пароль',
      });
    }

    // Деактивация вместо удаления (soft delete)
    user.isActive = false;
    await user.save();

    res.json({
      message: 'Аккаунт успешно удален',
    });
  } catch (error) {
    console.error('DeleteAccount Error:', error);
    res.status(500).json({
      message: 'Ошибка при удалении аккаунта',
      error: error.message,
    });
  }
};