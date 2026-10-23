import "dotenv/config";
import { connectDB } from "./config/db";
import app from "./app";
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start the server:", error);
  process.exit(1);
});
