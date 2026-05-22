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
    const mongoUri = process.env.MONGODB_URI;
    
    console.log('🔍 DEBUG: MONGODB_URI value:', mongoUri ? '✅ Exists' : '❌ Undefined');
    console.log('🔍 DEBUG: All env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
    
    if (!mongoUri) {
      throw new Error('❌ MONGODB_URI is not set in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority',
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error.message);
  }
}
