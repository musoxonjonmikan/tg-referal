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
    
    if (!mongoUri) {
      console.error('❌ ERROR: MONGODB_URI environment variable is not set!');
      console.error('❌ Please add MONGODB_URI to your deployment environment variables.');
      console.error('❌ Format: mongodb+srv://username:password@cluster.mongodb.net/database_name');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('🔌 Connection string starts with:', mongoUri.substring(0, 30) + '...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
    });
    
    console.log('✅ MongoDB connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('❌ Please check your MONGODB_URI environment variable');
    console.error('❌ Error details:', error);
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
