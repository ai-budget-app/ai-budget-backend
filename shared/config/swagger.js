import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем YAML файлы
const loadYaml = (filename) => {
  const filePath = path.join(__dirname, '../docs', filename);
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
};

const schemas = loadYaml('schemas.yaml');
const authDocs = loadYaml('auth.yaml');
const budgetDocs = loadYaml('budget.yaml');
const expensesDocs = loadYaml('expenses.yaml');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'AI Budget Backend API',
    version: '1.0.0',
    description: 'API документация для AI Budget приложения',
    contact: {
      name: 'AI Budget Team',
      url: 'https://github.com/ai-budget-app/ai-budget-backend',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
  ],
  tags: [...(authDocs.tags || []), ...(budgetDocs.tags || []), ...(expensesDocs.tags || [])],
  components: {
    ...schemas.components,
  },
  paths: {
    ...authDocs.paths,
    ...budgetDocs.paths,
    ...expensesDocs.paths,
  },
};

export const swaggerSpec = swaggerDocument;
