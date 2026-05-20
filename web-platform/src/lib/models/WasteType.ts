import mongoose, { Schema, Document } from 'mongoose';

export interface IWasteType extends Document {
  name: string;
  category: 'organic' | 'recyclable' | 'non_recyclable' | 'hazardous';
  description: string;
  descriptionQuechua?: string;
  examples: string[];
  handlingInstructions: string;
  handlingInstructionsQuechua?: string;
  iconUrl?: string;
  iconMimeType?: 'image/png' | 'image/jpeg';
  colorCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WasteTypeSchema = new Schema<IWasteType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      enum: ['organic', 'recyclable', 'non_recyclable', 'hazardous'],
      required: true,
    },
    description: { type: String, required: true },
    descriptionQuechua: { type: String },
    examples: [{ type: String }],
    handlingInstructions: { type: String, required: true },
    handlingInstructionsQuechua: { type: String },
    iconUrl: { type: String },
    iconMimeType: { type: String, enum: ['image/png', 'image/jpeg'] },
    colorCode: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WasteTypeSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.WasteType || mongoose.model<IWasteType>('WasteType', WasteTypeSchema);
