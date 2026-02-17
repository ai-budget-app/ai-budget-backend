import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email обязателен'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => {
          return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: (props) => `${props.value} не является валидным email!`,
      },
    },
    password: {
      type: String,
      required: [true, 'Пароль обязателен'],
      minlength: [6, 'Пароль должен быть минимум 6 символов'],
      select: false, // Не возвращать пароль по умолчанию в запросах
    },
    name: {
      type: String,
      required: [true, 'Имя обязательно'],
      trim: true,
      minlength: [2, 'Имя должно быть минимум 2 символа'],
      maxlength: [50, 'Имя не должно превышать 50 символов'],
    },
    avatar: {
      type: String,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Автоматически добавляет createdAt и updatedAt
  }
);

// Индексы для оптимизации поиска
UserSchema.index({ email: 1 });

// Хук для хеширования пароля перед сохранением
UserSchema.pre('save', async function (next) {
  // Хешируем пароль только если он был изменен
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для сравнения паролей
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Метод для получения публичных данных пользователя (без пароля)
UserSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('User', UserSchema);
