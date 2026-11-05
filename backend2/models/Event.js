import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      required: true,
      default: "Université de Blida",
      trim: true
    },
    department: {
      type: String,
      required: true,
      default: "ITC",
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      default: 50,
      min: 1
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

eventSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

eventSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

eventSchema.set("toObject", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default Event;
