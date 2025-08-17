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

// --- SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);

// ✅ Dynamically set the allowed origin from environment variables
//const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000' || 'https://tastoria-front.vercel.app';
const frontendURL = 'https://tastoria-front.vercel.app';

// ✅ Setup Socket.IO with the secure CORS origin
const io = new Server(server, {
  cors: {
    origin: frontendURL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// --- MIDDLEWARES ---
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

// ✅ Use the secure CORS origin for your main Express app
app.use(cors({
  origin: frontendURL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use(helmet());
app.use(limiter);
app.use(trackVisitor);

// --- ROUTES ---
app.use('/whatsapp', whatsappRoutes);
app.use("/api/admin", adminLoginRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/admin', adminRoutes);

// ⚠️ Reminder: This line will not work on Render for permanent file storage
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DATABASE CONNECTION ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
