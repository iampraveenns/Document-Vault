import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends MongooseDocument {
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return password by default in queries
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export function formatPublicUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
  };
}

export const UserModel = mongoose.model<IUser>('User', UserSchema);
