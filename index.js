import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './modules/auth/AuthRoutes.js';
import budgetRoutes from './modules/budget/BudgetRoutes.js';
import expenseRoutes from './modules/expenses/ExpenseRoutes.js';
import { connectDB } from './shared/config/database.js';
import { swaggerSpec } from './shared/config/swagger.js';
import { pinoHttp } from 'pino-http';
import logger from './shared/config/logger.js';

dotenv.config();
connectDB();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// HTTP логирование каждого запроса
app.use(pinoHttp({ logger }));

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/expenses', expenseRoutes);

// Базовый роут для проверки работы сервера
app.get('/', (req, res) => {
  res.json({
    message: 'AI Budget Backend API',
    version: '1.0.0',
    status: 'running',
  });
});

// Обработка несуществующих роутов
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, (err) => {
  if (err) {
    return logger.error({ err }, 'Server failed to start');
  }
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`API available at http://localhost:${PORT}`);
});
