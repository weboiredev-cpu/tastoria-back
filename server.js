  import dotenv from 'dotenv';
dotenv.config();
  import express from 'express';
  import http from 'http';
  import mongoose from 'mongoose';
  import { Server } from 'socket.io';
  import cors from 'cors';
  import helmet from 'helmet';
  import adminLoginRoutes from "./routes/adminLogin.js";
  import rateLimit from 'express-rate-limit';
  import menuRoutes from './routes/menuRoutes.js';
  import userRoutes from './routes/userRoutes.js';
  import orderRoutes from './routes/orderRoutes.js';
  import adminRoutes from './routes/adminRoutes.js';
  import { trackVisitor } from './middleware/visit.js';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import whatsappRoutes from './routes/whatapproutes.js';
  import redis from './utils/redis.js';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // ✅ Initialize Express before using it in HTTP server
  const app = express();

  // ✅ Create HTTP server after app is defined
  const server = http.createServer(app);

  // ✅ Setup Socket.IO
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000', // Replace with frontend domain in production
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  // ✅ Share Socket.IO instance across routes
  app.set('io', io);

  // ✅ Socket events
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // ✅ Middlewares
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  app.use(cors({
  origin: 'http://localhost:3000', // your Next.js frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

  app.use(express.json());
  app.use(helmet());
  app.use(limiter);
  app.use(trackVisitor);
  app.use('/whatsapp', whatsappRoutes);
  app.use("/api/admin", adminLoginRoutes);
  // ✅ MongoDB connection
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB error:', err));

  // ✅ Routes
  app.use('/api/users', userRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // ✅ Start server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));