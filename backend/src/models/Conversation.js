import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
  content: { type: String },
  name: { type: String }, // for tool name in tool messages
  tool_call_id: { type: String }, // for referencing the tool call
  toolCalls: [{ type: mongoose.Schema.Types.Mixed }], // OpenAI tool calls array
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  userId: { type: String }, // can map to User email/id or guest session id
  messages: [messageSchema],
  summary: { type: String },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
export { messageSchema };
