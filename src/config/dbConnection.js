import mongoose  from "mongoose";
let isConnected = false


export const connectDB = async () => {
    if(isConnected){
        return
    }

     const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn("⚠️ MONGO_URI is not defined in environment variables. Database connection skipped.");
    return;
  }

  try {
    const conn =  await mongoose.connect(mongoUri)
    isConnected = !!conn.connections[0].readyState;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);

  } catch (error) {

    console.error("❌ MongoDB Connection Error:", error.message);
    // Do not exit in development so server can still serve fallback/health requests
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    
  }
}