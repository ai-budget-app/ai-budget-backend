import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Сумма расхода обязательна'],
      min: [0, 'Сумма не может быть отрицательной'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    category: {
      type: String,
      required: true,
      default: 'Other',
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Заметка не может превышать 500 символов'],
      default: null,
    },
    // Дополнительные поля для расширения функционала
    receipt: {
      type: String, // URL или путь к файлу чека
      default: null,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', null],
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Составные индексы для оптимизации частых запросов
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1 });
ExpenseSchema.index({ userId: 1, date: -1, category: 1 });

// Виртуальное поле для форматированной даты
ExpenseSchema.virtual('formattedDate').get(function () {
  return this.date.toISOString().split('T')[0];
});

// Метод для получения месяца и года расхода
ExpenseSchema.methods.getMonthYear = function () {
  return {
    month: this.date.getMonth() + 1,
    year: this.date.getFullYear(),
  };
};

// Статический метод для получения расходов за период
ExpenseSchema.statics.getExpensesByPeriod = async function (userId, startDate, endDate) {
  return this.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ date: -1 });
};

// Статический метод для получения расходов по категориям
ExpenseSchema.statics.getExpensesByCategory = async function (userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        expenses: { $push: '$$ROOT' },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);
};

// Статический метод для получения статистики за период
ExpenseSchema.statics.getStatistics = async function (userId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || {
    totalAmount: 0,
    avgAmount: 0,
    minAmount: 0,
    maxAmount: 0,
    count: 0,
  };
};

export default mongoose.model('Expense', ExpenseSchema);