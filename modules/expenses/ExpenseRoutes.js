import express from 'express';
import { body } from 'express-validator';
import checkAuth from '../../shared/middlewares/AuthMiddleware.js';
import * as ExpenseController from './ExpenseController.js';

const router = express.Router();

/**
 * Валидация для создания/обновления расхода
 */
const expenseValidation = [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Сумма должна быть положительным числом'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Дата должна быть в формате ISO 8601'),
  body('category')
    .optional()
    .isString()
    .trim()
    .withMessage('Категория должна быть строкой'),
  body('note')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Заметка не должна превышать 500 символов'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Теги должны быть массивом'),
];

// Все роуты требуют авторизации

// CRUD операции
router.post('/', checkAuth, expenseValidation, ExpenseController.createExpense);
router.get('/', checkAuth, ExpenseController.getExpenses);
router.get('/:id', checkAuth, ExpenseController.getExpenseById);
router.put('/:id', checkAuth, expenseValidation, ExpenseController.updateExpense);
router.delete('/:id', checkAuth, ExpenseController.deleteExpense);

// Статистика
router.get('/statistics/by-category', checkAuth, ExpenseController.getExpensesByCategory);
router.get('/statistics/summary', checkAuth, ExpenseController.getExpensesStatistics);

// Массовые операции
router.post('/bulk-delete', checkAuth, ExpenseController.bulkDeleteExpenses);

export default router;