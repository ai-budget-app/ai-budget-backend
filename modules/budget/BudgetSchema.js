import mongoose from 'mongoose';

const BudgetSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    monthlyBudget: {
      type: Number,
      required: [true, 'Месячный бюджет обязателен'],
      min: [0, 'Бюджет не может быть отрицательным'],
      default: 0,
    },
    currencyCode: {
      type: String,
      required: [true, 'Код валюты обязателен'],
      uppercase: true,
      trim: true,
      default: 'EUR',
      validate: {
        validator: (v) => {
          // Проверка на валидный код валюты (ISO 4217)
          return /^[A-Z]{3}$/.test(v);
        },
        message: (props) => `${props.value} не является валидным кодом валюты (ISO 4217)!`,
      },
    },
    monthStart: {
      type: Date,
      required: [true, 'Дата начала месяца обязательна'],
      default: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
      },
    },
    // Дополнительные настройки для расширения функционала
    notifications: {
      enabled: {
        type: Boolean,
        default: true,
      },
      thresholdPercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 80, // Уведомление при достижении 80% бюджета
      },
    },
    categories: {
      type: [String],
      default: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Other'],
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для оптимизации
BudgetSettingsSchema.index({ userId: 1 }, { unique: true });

// Виртуальное поле для получения дня начала месяца
BudgetSettingsSchema.virtual('monthStartDay').get(function () {
  return this.monthStart.getDate();
});

// Метод для проверки, нужно ли сбросить период
BudgetSettingsSchema.methods.shouldResetPeriod = function () {
  const now = new Date();
  const startDay = this.monthStart.getDate();
  const currentDay = now.getDate();
  
  // Если текущий день >= дня начала месяца в настройках
  return currentDay >= startDay;
};

// Метод для получения текущего периода бюджета
BudgetSettingsSchema.methods.getCurrentPeriod = function () {
  const now = new Date();
  const startDay = this.monthStart.getDate();
  
  let periodStart;
  let periodEnd;
  
  if (now.getDate() >= startDay) {
    // Текущий период начался в этом месяце
    periodStart = new Date(now.getFullYear(), now.getMonth(), startDay);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, startDay - 1, 23, 59, 59, 999);
  } else {
    // Текущий период начался в прошлом месяце
    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
    periodEnd = new Date(now.getFullYear(), now.getMonth(), startDay - 1, 23, 59, 59, 999);
  }
  
  return { periodStart, periodEnd };
};

export default mongoose.model('BudgetSettings', BudgetSettingsSchema);