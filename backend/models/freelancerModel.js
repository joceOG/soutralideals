import mongoose from 'mongoose';

const freelancerSchema = new mongoose.Schema({
  nomfreelancer: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
  },
  telephone: {
    type: String,
  },
  competences: {
    type: [String],
    default: [],
  },
  description: {
    type: String,
  },
  dateCreation: {
    type: Date,
    default: Date.now,
  },
});

const freelancerModel = mongoose.model('Freelancer', freelancerSchema);
export default freelancerModel;
