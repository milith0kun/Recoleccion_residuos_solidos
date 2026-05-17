import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  dni?: string;
  firstName: string;
  lastName: string;
  role: 'citizen' | 'operator' | 'admin';
  phone?: string;
  address?: string;
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
  googleId?: string;
  provider?: 'local' | 'google';
  avatar?: string;
  profileComplete?: boolean;
  /** Expo push token (formato `ExponentPushToken[...]`) — registrado por la app móvil. */
  pushToken?: string;
  /** Última fecha en que la app móvil actualizó el push token. */
  pushTokenUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId;
      },
      select: false,
    },
    dni: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId;
      },
      unique: true,
      sparse: true,
      trim: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['citizen', 'operator', 'admin'], default: 'citizen' },
    phone: { type: String, trim: true },
    address: {
      type: String,
      required: function (this: IUser) {
        return !this.googleId;
      },
      trim: true,
    },
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
    googleId: { type: String, unique: true, sparse: true, index: true },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    avatar: { type: String },
    profileComplete: { type: Boolean, default: true },
    pushToken: { type: String, trim: true, default: null },
    pushTokenUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ location: '2dsphere' }, { sparse: true });
UserSchema.index({ zone: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
