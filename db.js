import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    username: String,
    referrals: {
      type: Number,
      default: 0,
    },
    referredBy: {
      type: Number,
      default: null,
    },
    rewarded: {
      type: Boolean,
      default: false,
    },
    rewardCount: {
      type: Number,
      default: 0,
    },
    lastRewardType: String,
    channelsJoined: {
      channel1: { type: Boolean, default: false },
      channel2: { type: Boolean, default: false },
      channel3: { type: Boolean, default: false },
    },
    joined: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log('🔌 MongoDB disconnected');
}