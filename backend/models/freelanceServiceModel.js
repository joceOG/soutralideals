import mongoose from 'mongoose';

/**
 * Offre publiée par un freelance, rattachée à un service du catalogue (Service → Categorie → groupe Freelance).
 */
const FreelanceServiceSchema = new mongoose.Schema(
  {
    freelance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Freelance',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    titleOverride: { type: String, trim: true, default: '' },
    descriptionCourte: { type: String, trim: true, default: '' },
    coverImage: { type: String, required: true },
    startingPrice: { type: Number, required: true, min: 0 },
    deliveryTime: { type: String, trim: true, required: true },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    orderCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

FreelanceServiceSchema.index({ freelance: 1, service: 1 }, { unique: true });
FreelanceServiceSchema.index({ isActive: 1, isFeatured: -1, orderCount: -1 });

const freelanceServiceModel = mongoose.model('FreelanceService', FreelanceServiceSchema);
export default freelanceServiceModel;
