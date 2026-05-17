import mongoose, { Schema, Document } from 'mongoose';

/**
 * Una "salida programada" — el operador (planner) asigna una jornada a un
 * conductor (driver). El driver acepta o rechaza. Al aceptar y arrancar,
 * se crea la `RouteExecution` técnica que registra el GPS + paradas.
 *
 * Estados:
 *   pending → accepted → in_progress → completed
 *           ↘ rejected
 *           ↘ cancelled (por el planner antes de iniciarse)
 */
export const DISPATCH_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export interface IDispatch extends Document {
  /** Código corto visible al usuario (DSP-2026-0001). */
  code: string;
  route: mongoose.Types.ObjectId;
  driver: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  scheduledFor: Date;
  vehicle?: mongoose.Types.ObjectId; // override opcional del vehículo de la ruta
  notes?: string;
  status: DispatchStatus;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectReason?: string;
  startedAt?: Date;
  endedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  /** RouteExecution creada cuando el driver inicia la salida. */
  execution?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DispatchSchema = new Schema<IDispatch>(
  {
    code: { type: String, required: true, unique: true, index: true },
    route: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledFor: { type: Date, required: true, index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: DISPATCH_STATUSES,
      default: 'pending',
      index: true,
    },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectReason: { type: String, trim: true },
    startedAt: { type: Date },
    endedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
    execution: { type: Schema.Types.ObjectId, ref: 'RouteExecution' },
  },
  { timestamps: true }
);

DispatchSchema.index({ driver: 1, status: 1, scheduledFor: -1 });
DispatchSchema.index({ status: 1, scheduledFor: 1 });

export default mongoose.models.Dispatch ||
  mongoose.model<IDispatch>('Dispatch', DispatchSchema);
