import express from 'express';
import { body } from 'express-validator';
import checkAuth from '../../shared/middlewares/AuthMiddleware.js';
import * as AuthController from './AuthController.js';

const router = express.Router();

/**
 * Валидация для регистрации
 */
const registerValidation = [
  body('email').isEmail().withMessage('Введите корректный email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Имя должно быть от 2 до 50 символов')
    .trim(),
];

/**
 * Валидация для входа
 */
const loginValidation = [
  body('email').isEmail().withMessage('Введите корректный email').normalizeEmail(),
  body('password').notEmpty().withMessage('Пароль обязателен'),
];

// Публичные роуты (без авторизации)
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// Защищенные роуты (требуется авторизация)
router.get('/me', checkAuth, AuthController.getMe);
router.put('/profile', checkAuth, AuthController.updateProfile);
router.put('/change-password', checkAuth, AuthController.changePassword);
router.delete('/account', checkAuth, AuthController.deleteAccount);

export default router;
