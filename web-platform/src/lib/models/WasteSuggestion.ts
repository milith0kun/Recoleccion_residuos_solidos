import mongoose, { Schema, Document } from 'mongoose';

export interface IWasteSuggestion extends Document {
  name: string;
  notes?: string;
  suggestedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'reviewed';
  createdAt: Date;
  updatedAt: Date;
}

const WasteSuggestionSchema = new Schema<IWasteSuggestion>(
  {
    name: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    suggestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending', index: true },
  },
  { timestamps: true }
);

WasteSuggestionSchema.index({ name: 1, status: 1 });

export default mongoose.models.WasteSuggestion ||
  mongoose.model<IWasteSuggestion>('WasteSuggestion', WasteSuggestionSchema);
