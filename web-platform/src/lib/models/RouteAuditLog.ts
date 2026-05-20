import mongoose, { Schema, Document } from 'mongoose';

export interface IRouteAuditLog extends Document {
  route: mongoose.Types.ObjectId;
  changedBy: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'status_change' | 'deactivate' | 'duplicate';
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const RouteAuditLogSchema = new Schema<IRouteAuditLog>(
  {
    route: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['create', 'update', 'status_change', 'deactivate', 'duplicate'],
      required: true,
    },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

RouteAuditLogSchema.index({ route: 1, createdAt: -1 });

export default mongoose.models.RouteAuditLog ||
  mongoose.model<IRouteAuditLog>('RouteAuditLog', RouteAuditLogSchema);
