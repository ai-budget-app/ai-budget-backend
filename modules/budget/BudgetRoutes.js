import express from 'express';
import { body } from 'express-validator';
import checkAuth from '../../shared/middlewares/AuthMiddleware.js';
import * as BudgetController from './BudgetController.js';

const router = express.Router();

/**
 * Валидация для создания/обновления настроек
 */
const settingsValidation = [
  body('monthlyBudget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Месячный бюджет должен быть положительным числом'),
  body('currencyCode')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Код валюты должен содержать 3 символа')
    .isAlpha()
    .withMessage('Код валюты должен содержать только буквы'),
  body('monthStart')
    .optional()
    .isISO8601()
    .withMessage('Дата начала месяца должна быть в формате ISO 8601'),
];

// Все роуты требуют авторизации
router.post('/settings', checkAuth, settingsValidation, BudgetController.createOrUpdateSettings);
router.get('/settings', checkAuth, BudgetController.getSettings);
router.get('/summary', checkAuth, BudgetController.getBudgetSummary);
router.get('/history', checkAuth, BudgetController.getBudgetHistory);
router.put('/categories', checkAuth, BudgetController.updateCategories);
router.delete('/settings', checkAuth, BudgetController.deleteSettings);

export default router;
