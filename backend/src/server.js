require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3000',
  'https://reality-show-alpha.vercel.app'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: true,
  httpCompression: true,
  maxHttpBufferSize: 1e6
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting — generoso para até 25 usuários na mesma rede
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

// Limite mais restrito só para votos públicos (evita flood)
const voteLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
app.use('/api/public/vote', voteLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/participants', require('./routes/participants'));
app.use('/api/provas', require('./routes/provas'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/sincerao', require('./routes/sincerao'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/public', require('./routes/public'));
app.use('/api/queridometro', require('./routes/queridometro'));
app.use('/api/game', require('./routes/game'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'LiveReality API', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Socket.io
const socketHandler = require('./socket/index');
socketHandler(io);

// Scheduler
const scheduler = require('./services/scheduler');
scheduler.setIO(io);
scheduler.start();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🏠 LiveReality API running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, io };
