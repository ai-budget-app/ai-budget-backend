import { validationResult } from 'express-validator';
import Expense from './ExpenseSchema.js';
import BudgetSettings from '../budget/BudgetSchema.js';

/**
 * Создание нового расхода
 * POST /api/expenses
 */
export const createExpense = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Ошибка валидации',
        errors: errors.array(),
      });
    }

    const { amount, date, category, note, receipt, isRecurring, recurringFrequency, tags } = req.body;
    const userId = req.userId;

    // Проверка наличия настроек бюджета
    const settings = await BudgetSettings.findOne({ userId });
    
    let validatedCategory = category || 'Other';
    
    // Проверка, существует ли категория в настройках
    if (settings && !settings.categories.includes(validatedCategory)) {
      return res.status(400).json({
        message: `Категория "${validatedCategory}" не найдена в ваших настройках. Доступные категории: ${settings.categories.join(', ')}`,
      });
    }

    const expense = new Expense({
      userId,
      amount,
      date: date ? new Date(date) : new Date(),
      category: validatedCategory,
      note: note || null,
      receipt: receipt || null,
      isRecurring: isRecurring || false,
      recurringFrequency: recurringFrequency || null,
      tags: tags || [],
    });

    await expense.save();

    res.status(201).json({
      message: 'Расход создан',
      expense,
    });
  } catch (error) {
    console.error('CreateExpense Error:', error);
    res.status(500).json({
      message: 'Ошибка при создании расхода',
      error: error.message,
    });
  }
};

/**
 * Получение всех расходов пользователя с фильтрацией и пагинацией
 * GET /api/expenses
 */
export const getExpenses = async (req, res) => {
  try {
    const {
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      tags,
      sort = '-date',
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { userId: req.userId };

    // Фильтр по категории
    if (category) {
      filter.category = category;
    }

    // Фильтр по датам
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // Фильтр по сумме
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) {
        filter.amount.$gte = Number(minAmount);
      }
      if (maxAmount) {
        filter.amount.$lte = Number(maxAmount);
      }
    }

    // Поиск по заметкам
    if (search) {
      filter.note = { $regex: search, $options: 'i' };
    }

    // Фильтр по тегам
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = { $in: tagsArray };
    }

    // Получение расходов с пагинацией
    const expenses = await Expense.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .exec();

    const total = await Expense.countDocuments(filter);

    // Подсчет общей суммы отфильтрованных расходов
    const totalAmount = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      expenses,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
        perPage: Number(limit),
      },
      summary: {
        totalAmount: totalAmount[0]?.total || 0,
        count: total,
      },
    });
  } catch (error) {
    console.error('GetExpenses Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении расходов',
      error: error.message,
    });
  }
};

/**
 * Получение расхода по ID
 * GET /api/expenses/:id
 */
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!expense) {
      return res.status(404).json({
        message: 'Расход не найден',
      });
    }

    res.json({
      expense,
    });
  } catch (error) {
    console.error('GetExpenseById Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении расхода',
      error: error.message,
    });
  }
};

/**
 * Обновление расхода
 * PUT /api/expenses/:id
 */
export const updateExpense = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Ошибка валидации',
        errors: errors.array(),
      });
    }

    const { amount, date, category, note, receipt, isRecurring, recurringFrequency, tags } = req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!expense) {
      return res.status(404).json({
        message: 'Расход не найден',
      });
    }

    // Проверка категории, если она изменяется
    if (category && category !== expense.category) {
      const settings = await BudgetSettings.findOne({ userId: req.userId });
      if (settings && !settings.categories.includes(category)) {
        return res.status(400).json({
          message: `Категория "${category}" не найдена в ваших настройках`,
        });
      }
    }

    // Обновление полей
    if (amount !== undefined) expense.amount = amount;
    if (date !== undefined) expense.date = new Date(date);
    if (category !== undefined) expense.category = category;
    if (note !== undefined) expense.note = note;
    if (receipt !== undefined) expense.receipt = receipt;
    if (isRecurring !== undefined) expense.isRecurring = isRecurring;
    if (recurringFrequency !== undefined) expense.recurringFrequency = recurringFrequency;
    if (tags !== undefined) expense.tags = tags;

    await expense.save();

    res.json({
      message: 'Расход обновлен',
      expense,
    });
  } catch (error) {
    console.error('UpdateExpense Error:', error);
    res.status(500).json({
      message: 'Ошибка при обновлении расхода',
      error: error.message,
    });
  }
};

/**
 * Удаление расхода
 * DELETE /api/expenses/:id
 */
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!expense) {
      return res.status(404).json({
        message: 'Расход не найден',
      });
    }

    res.json({
      message: 'Расход удален',
      expense,
    });
  } catch (error) {
    console.error('DeleteExpense Error:', error);
    res.status(500).json({
      message: 'Ошибка при удалении расхода',
      error: error.message,
    });
  }
};

/**
 * Получение статистики расходов по категориям
 * GET /api/expenses/statistics/by-category
 */
export const getExpensesByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Определение периода
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // По умолчанию - текущий месяц
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const categoryStats = await Expense.getExpensesByCategory(req.userId, start, end);

    res.json({
      period: { start, end },
      categories: categoryStats,
    });
  } catch (error) {
    console.error('GetExpensesByCategory Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении статистики по категориям',
      error: error.message,
    });
  }
};

/**
 * Получение общей статистики расходов
 * GET /api/expenses/statistics/summary
 */
export const getExpensesStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Определение периода
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // По умолчанию - текущий месяц
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const statistics = await Expense.getStatistics(req.userId, start, end);

    res.json({
      period: { start, end },
      statistics,
    });
  } catch (error) {
    console.error('GetExpensesStatistics Error:', error);
    res.status(500).json({
      message: 'Ошибка при получении статистики',
      error: error.message,
    });
  }
};

/**
 * Массовое удаление расходов
 * POST /api/expenses/bulk-delete
 */
export const bulkDeleteExpenses = async (req, res) => {
  try {
    const { expenseIds } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({
        message: 'Необходимо указать массив ID расходов',
      });
    }

    const result = await Expense.deleteMany({
      _id: { $in: expenseIds },
      userId: req.userId,
    });

    res.json({
      message: `Удалено расходов: ${result.deletedCount}`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('BulkDeleteExpenses Error:', error);
    res.status(500).json({
      message: 'Ошибка при массовом удалении',
      error: error.message,
    });
  }
};