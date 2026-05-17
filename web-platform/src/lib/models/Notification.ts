import mongoose, { Schema, Document } from 'mongoose';

/**
 * Tipos (kinds) de notificación. Mantener coherente con
 * `mobile-app/src/components/...` y `lib/utils/push.ts`.
 */
export const NOTIFICATION_KINDS = [
  'route_started',
  'route_delayed',
  'incident_created',
  'incident_status',
  'dispatch_assigned',
  'dispatch_accepted',
  'dispatch_rejected',
  'dispatch_cancelled',
  'system',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Datos extra (ej. url para deep-link, ids relacionados). */
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true, default: 'system' },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
