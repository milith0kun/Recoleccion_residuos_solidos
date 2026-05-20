import mongoose, { Schema, Document } from 'mongoose';

export interface IZoneAssignmentAudit extends Document {
  user: mongoose.Types.ObjectId;
  changedBy: mongoose.Types.ObjectId;
  previousZone?: mongoose.Types.ObjectId;
  newZone?: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneAssignmentAuditSchema = new Schema<IZoneAssignmentAudit>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    previousZone: { type: Schema.Types.ObjectId, ref: 'Zone' },
    newZone: { type: Schema.Types.ObjectId, ref: 'Zone' },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

ZoneAssignmentAuditSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.ZoneAssignmentAudit ||
  mongoose.model<IZoneAssignmentAudit>('ZoneAssignmentAudit', ZoneAssignmentAuditSchema);
