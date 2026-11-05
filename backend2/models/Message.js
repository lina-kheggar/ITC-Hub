import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    tokens: {
      type: Number,
      default: 0
    },
    feedback: {
      type: String,
      enum: ["helpful", "unhelpful", null],
      default: null
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

messageSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

messageSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.conversation_id = ret.conversation_id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
