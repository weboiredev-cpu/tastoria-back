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
const app = express(); // ✅ Define app first
const server = http.createServer(app);

// ✅ Frontend URL for CORS
const frontendURL = ["http://localhost:3000", "https://www.tastoria.in"];

// ✅ Socket.IO
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
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }); // ✅ Only declare once

app.use(cors({
  origin: frontendURL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], 
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"], 
      },
    },
    referrerPolicy: { policy: "no-referrer-when-downgrade" },
    frameguard: { action: "sameorigin" },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    noSniff: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()" 
  );
  next();
});
app.use(limiter);
app.use(trackVisitor);

// --- ROUTES ---
app.use('/whatsapp', whatsappRoutes);
app.use("/api/admin", adminLoginRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/admin', adminRoutes);

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DATABASE CONNECTION ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
