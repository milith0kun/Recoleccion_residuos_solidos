import mongoose, { Schema, Document } from 'mongoose';

/**
 * Confirmación ciudadana: "vi el camión acá". Sirve para ponderar qué
 * traza histórica es la más representativa (un ciudadano que ve pasar el
 * camión cerca de cierta traza la "vota" implícitamente). Hay un índice
 * compuesto único (citizen, route, dayKey) para evitar que un mismo
 * ciudadano sume varias confirmaciones de la misma ruta en el mismo día.
 */
export interface IRouteConfirmation extends Document {
  citizen: mongoose.Types.ObjectId;
  route?: mongoose.Types.ObjectId;
  trace?: mongoose.Types.ObjectId;
  location: { type: 'Point'; coordinates: [number, number] };
  comment?: string;
  /** YYYY-MM-DD del día en que se hizo, para el índice único. */
  dayKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const RouteConfirmationSchema = new Schema<IRouteConfirmation>(
  {
    citizen: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    route: { type: Schema.Types.ObjectId, ref: 'Route', index: true },
    trace: { type: Schema.Types.ObjectId, ref: 'RouteTrace' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    comment: { type: String, trim: true, maxlength: 280 },
    dayKey: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

RouteConfirmationSchema.index({ location: '2dsphere' });
// Un ciudadano sólo puede confirmar la misma ruta una vez por día.
RouteConfirmationSchema.index(
  { citizen: 1, route: 1, dayKey: 1 },
  { unique: true, partialFilterExpression: { route: { $exists: true } } }
);

export default (mongoose.models.RouteConfirmation as mongoose.Model<IRouteConfirmation>) ||
  mongoose.model<IRouteConfirmation>('RouteConfirmation', RouteConfirmationSchema);
