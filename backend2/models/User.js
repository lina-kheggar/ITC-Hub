import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password_hash: {
      type: String,
      required: true
    },
    
    password: {
      type: String
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member"
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

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

userSchema.methods.getPasswordHash = function () {
  return this.password_hash || this.password;
};

userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    delete ret.password;
    return ret;
  }
});

userSchema.set("toObject", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    delete ret.password;
    return ret;
  }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
