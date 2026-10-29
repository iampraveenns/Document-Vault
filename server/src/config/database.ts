import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;
let isConnecting = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    // Wait until connection finishes
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return mongoose;
  }

  isConnecting = true;
  const configuredUri = process.env.MONGODB_URI;

  try {
    if (configuredUri) {
      console.log(`Connecting to MongoDB at ${configuredUri}...`);
      try {
        await mongoose.connect(configuredUri, {
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000,
        });
        console.log('MongoDB connected successfully via MONGODB_URI.');
        isConnecting = false;
        return mongoose;
      } catch (err: any) {
        console.warn(`External MongoDB at ${configuredUri} not reachable (${err.message}).`);
      }
    }

    // If external MongoDB wasn't provided or couldn't be reached in dev/test environment:
    console.log('Initializing embedded MongoDB instance via MongoMemoryServer for reliable persistence...');
    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'document_management',
        },
      });
    }

    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    console.log(`Embedded MongoDB connected successfully at ${uri}`);
    isConnecting = false;
    return mongoose;
  } catch (error) {
    isConnecting = false;
    console.error('Fatal: Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
