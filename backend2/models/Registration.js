import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event"
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

registrationSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

registrationSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

registrationSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.user_id = (ret.user_id || ret.user)?.toString();
    ret.event_id = (ret.event_id || ret.event)?.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.user;
    delete ret.event;
    return ret;
  }
});

const Registration =
  mongoose.models.Registration ||
  mongoose.model("Registration", registrationSchema);

export default Registration;
