import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  dni: string;
  firstName: string;
  lastName: string;
  role: 'citizen' | 'operator' | 'admin';
  phone?: string;
  address: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  zone?: mongoose.Types.ObjectId;
  isActive: boolean;
  isVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    dni: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['citizen', 'operator', 'admin'], default: 'citizen' },
    phone: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    zone: { type: Schema.Types.ObjectId, ref: 'Zone' },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    emailVerificationCode: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

UserSchema.index({ location: '2dsphere' }, { sparse: true });
UserSchema.index({ zone: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
