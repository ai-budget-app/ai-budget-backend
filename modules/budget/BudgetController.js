import { validationResult } from 'express-validator';
import BudgetSettings from './BudgetSchema.js';
import Expense from '../expenses/ExpenseSchema.js';

/**
 * Создание или обновление настроек бюджета
 * POST /api/budget/settings
 */
export const createOrUpdateSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Ошибка валидации',
        errors: errors.array(),
      });
    }

    const { monthlyBudget, currencyCode, monthStart, notifications, categories } = req.body;
    const userId = req.userId;

    // Проверяем существование настроек
    let settings = await BudgetSettings.findOne({ userId });

    if (settings) {
      // Обновление существующих настроек
      if (monthlyBudget !== undefined) settings.monthlyBudget = monthlyBudget;
      if (currencyCode !== undefined) settings.currencyCode = currencyCode.toUpperCase();
      if (monthStart !== undefined) settings.monthStart = new Date(monthStart);
      if (notifications !== undefined) settings.notifications = notifications;
      if (categories !== undefined) settings.categories = categories;

      await settings.save();

      return res.json({
        message: 'Настройки бюджета обновлены',
        settings,
      });
    }

    // Создание новых настроек
    settings = new BudgetSettings({
      userId,
      monthlyBudget: monthlyBudget || 0,
      currencyCode: (currencyCode || 'EUR').toUpperCase(),
      monthStart: monthStart ? new Date(monthStart) : new Date(),
      notifications: notifications || { enabled: true, thresholdPercent: 80 },
      categories: categories || ['Food', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Other'],
    });

    await settings.save();

    res.status(201).json({
      message: 'Настройки бюджета созданы',
      settings,
    });
  } catch (error) {
    console.error('CreateOrUpdateSettings Error:', error);
    res.status(500).json({
      message: 'Ошибка при создании/обновлении настроек',
      error: error.message,
    });
  }
};

/**
 * Получение настроек бюджета текущего пользователя
 * GET /api/budget/settings
 */
export const getSettings = async (req, res) => {
  try {
    const settings = await BudgetSettings.findOne({ userId: req.userId });

    if (!settings) {
      return res.status(404).json({
        message: 'Настройки бюджета не найдены. Создайте настройки.',
      });
    }

    res.json({
      settings,
    });
  } catch (error) {
    console.error('GetSettings Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении настроек',
      error: error.message,
    });
  }
};

/**
 * Получение сводки по бюджету (расходы за текущий период)
 * GET /api/budget/summary
 */
export const getBudgetSummary = async (req, res) => {
  try {
    const settings = await BudgetSettings.findOne({ userId: req.userId });

    if (!settings) {
      return res.status(404).json({
        message: 'Настройки бюджета не найдены. Создайте настройки.',
      });
    }

    // Получаем текущий период
    const { periodStart, periodEnd } = settings.getCurrentPeriod();

    // Получаем все расходы за текущий период
    const expenses = await Expense.find({
      userId: req.userId,
      date: {
        $gte: periodStart,
        $lte: periodEnd,
      },
    });

    // Подсчет общих расходов
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Подсчет расходов по категориям
    const spentByCategory = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});

    // Расчет оставшегося бюджета
    const remaining = settings.monthlyBudget - totalSpent;
    const percentUsed = settings.monthlyBudget > 0 
      ? (totalSpent / settings.monthlyBudget) * 100 
      : 0;

    // Проверка, нужно ли отправить уведомление
    const shouldNotify = settings.notifications.enabled && 
                        percentUsed >= settings.notifications.thresholdPercent;

    res.json({
      summary: {
        monthlyBudget: settings.monthlyBudget,
        totalSpent,
        remaining,
        percentUsed: Math.round(percentUsed * 100) / 100,
        currencyCode: settings.currencyCode,
        period: {
          start: periodStart,
          end: periodEnd,
        },
        spentByCategory,
        expensesCount: expenses.length,
        shouldNotify,
        notificationMessage: shouldNotify 
          ? `Вы потратили ${percentUsed.toFixed(1)}% вашего бюджета!` 
          : null,
      },
    });
  } catch (error) {
    console.error('GetBudgetSummary Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении сводки',
      error: error.message,
    });
  }
};

/**
 * Обновление списка категорий
 * PUT /api/budget/categories
 */
export const updateCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        message: 'Категории должны быть непустым массивом',
      });
    }

    const settings = await BudgetSettings.findOne({ userId: req.userId });

    if (!settings) {
      return res.status(404).json({
        message: 'Настройки бюджета не найдены',
      });
    }

    settings.categories = categories;
    await settings.save();

    res.json({
      message: 'Категории обновлены',
      categories: settings.categories,
    });
  } catch (error) {
    console.error('UpdateCategories Error:', error);
    res.status(500).json({
      message: 'Ошибка при обновлении категорий',
      error: error.message,
    });
  }
};

/**
 * Удаление настроек бюджета
 * DELETE /api/budget/settings
 */
export const deleteSettings = async (req, res) => {
  try {
    const settings = await BudgetSettings.findOneAndDelete({ userId: req.userId });

    if (!settings) {
      return res.status(404).json({
        message: 'Настройки бюджета не найдены',
      });
    }

    res.json({
      message: 'Настройки бюджета удалены',
    });
  } catch (error) {
    console.error('DeleteSettings Error:', error);
    res.status(500).json({
      message: 'Ошибка при удалении настроек',
      error: error.message,
    });
  }
};

/**
 * Получение истории изменений бюджета (за разные периоды)
 * GET /api/budget/history
 */
export const getBudgetHistory = async (req, res) => {
  try {
    const { months = 6 } = req.query; // По умолчанию 6 месяцев

    const settings = await BudgetSettings.findOne({ userId: req.userId });

    if (!settings) {
      return res.status(404).json({
        message: 'Настройки бюджета не найдены',
      });
    }

    const history = [];
    const now = new Date();
    const startDay = settings.monthStart.getDate();

    // Генерируем данные за последние N месяцев
    for (let i = 0; i < Number(months); i++) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - i, startDay);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, startDay - 1, 23, 59, 59, 999);

      // Получаем расходы за период
      const expenses = await Expense.find({
        userId: req.userId,
        date: {
          $gte: periodStart,
          $lte: periodEnd,
        },
      });

      const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const remaining = settings.monthlyBudget - totalSpent;

      history.push({
        period: {
          start: periodStart,
          end: periodEnd,
        },
        monthlyBudget: settings.monthlyBudget,
        totalSpent,
        remaining,
        expensesCount: expenses.length,
      });
    }

    res.json({
      history,
      currencyCode: settings.currencyCode,
    });
  } catch (error) {
    console.error('GetBudgetHistory Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении истории',
      error: error.message,
    });
  }
};