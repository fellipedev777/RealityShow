# 🏠 BBB Zap — Reality Show Online em Tempo Real

Aplicativo completo inspirado no Big Brother Brasil, funcionando como um reality show 100% online com salas privadas, sistema de provas, votação, sincerão e eliminação automática.

---

## 📁 Estrutura do Projeto

```
AppBBB/
├── backend/          # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── config/   # Database (Supabase)
│   │   ├── middleware/ # Auth JWT
│   │   ├── routes/   # API REST
│   │   ├── services/ # Scheduler automático
│   │   └── socket/   # Socket.io handlers
│   └── package.json
├── frontend/         # Next.js 14 + Tailwind
│   └── src/
│       ├── app/      # Páginas
│       ├── components/ # Componentes reutilizáveis
│       ├── hooks/    # useSocket
│       └── lib/      # API, Socket, Store (Zustand)
└── database/
    └── schema.sql    # Schema completo do Supabase
```

---

## 🚀 Setup — Passo a Passo

### 1. Banco de Dados (Supabase)

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. No SQL Editor, cole e execute todo o conteúdo de `database/schema.sql`
3. Copie a **Project URL** e a **service_role key** (em Settings → API)

### 2. Backend

```bash
cd backend

# Copie o .env de exemplo
cp .env.example .env

# Preencha o .env:
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_SERVICE_KEY=seu-service-role-key
# JWT_SECRET=uma-chave-secreta-forte
# FRONTEND_URL=http://localhost:3000

# Instale dependências
npm install

# Crie o admin inicial
npm run seed

# Inicie em desenvolvimento
npm run dev
# Rodando em http://localhost:4000
```

### 3. Frontend

```bash
cd frontend

# Copie o .env
cp .env.example .env.local

# Preencha:
# NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Instale dependências
npm install

# Inicie em desenvolvimento
npm run dev
# Abrindo em http://localhost:3000
```

### 4. Acesso inicial

- **Participante:** Cadastre-se em `http://localhost:3000`
- **Admin:** Login com `admin@bbbzap.com` / `Admin@123`

---

## 🌐 Deploy Online

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Configure as variáveis de ambiente no painel do Vercel:
# NEXT_PUBLIC_API_URL = https://seu-backend.onrender.com
# NEXT_PUBLIC_SOCKET_URL = https://seu-backend.onrender.com
```

### Backend → Render.com

1. Crie conta em [render.com](https://render.com)
2. New → Web Service → Connect GitHub repo
3. Configurações:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
4. Adicione as variáveis de ambiente (mesmo conteúdo do `.env`)

---

## 🎮 Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| 🔐 Autenticação | Cadastro, login com JWT |
| 🏠 Quartos | 5 quartos com chat ao vivo |
| 💬 Chat | Mensagens em tempo real por Socket.io |
| 👑 Prova do Líder | Quiz simultâneo, ranking ao vivo |
| ⭐ Prova do Anjo | Quiz para imunidade |
| 🎤 Sincerão | Comentários em tempo real |
| 🗳️ Votação | Votos secretos, paredão automático |
| ⚡ Bate e Volta | Quiz rápido para escapar |
| ❌ Eliminação | Discurso automático, acesso revogado |
| 📅 Cronograma | Eventos automáticos por dia da semana |
| ⚙️ Painel Admin | Controle total do jogo |

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` — Cadastro
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Perfil atual

### Quartos
- `GET /api/rooms` — Listar quartos
- `GET /api/rooms/:slug` — Detalhes + mensagens
- `POST /api/rooms/join` — Entrar em quarto

### Participantes
- `GET /api/participants/active` — Ativos no jogo
- `GET /api/participants/info/game-state` — Estado do jogo

### Provas
- `GET /api/provas/active` — Prova ativa
- `POST /api/provas/:id/answer` — Responder pergunta

### Votação
- `POST /api/votes/cast` — Votar
- `GET /api/votes/status` — Status do meu voto

### Admin
- `POST /api/admin/start-game` — Iniciar jogo
- `POST /api/admin/open-sincerao` — Abrir sincerão
- `POST /api/admin/open-votacao` — Abrir votação
- `POST /api/admin/close-votacao` — Fechar e formar paredão
- `POST /api/admin/eliminate` — Eliminar participante

---

## 📡 Socket Events

### Cliente → Servidor
| Evento | Payload |
|--------|---------|
| `join_room` | `{ room_id }` |
| `send_message` | `{ room_id, content }` |
| `prova_answer` | `{ prova_id, question_id, answer }` |
| `sincerao_comment` | `{ target_id, comment }` |
| `admin_announcement` | `{ content, type }` *(admin)* |
| `admin_start_prova` | `{ prova_id }` *(admin)* |
| `admin_event` | `{ event, data }` *(admin)* |

### Servidor → Cliente
| Evento | Quando dispara |
|--------|----------------|
| `game_state` | Conexão inicial |
| `chat_message` | Nova mensagem no chat |
| `announcement` | Aviso global |
| `prova_started` | Prova iniciada |
| `prova_question` | Nova pergunta |
| `prova_scores_update` | Pontuação atualizada |
| `prova_ended` | Prova encerrada |
| `votacao_opened` | Votação aberta |
| `paredao_formed` | Paredão formado |
| `participant_eliminated` | Eliminação |
| `sincerao_new_comment` | Novo comentário |
| `new_week` | Nova semana |
| `scheduled_event` | Evento automático |

---

## 🛠️ Stack Técnica

- **Frontend:** Next.js 14, Tailwind CSS, Zustand, Framer Motion
- **Backend:** Node.js, Express, Socket.io
- **Banco:** Supabase (PostgreSQL)
- **Auth:** JWT
- **Tempo Real:** Socket.io com reconexão automática
- **Scheduler:** node-cron (eventos automáticos)
- **Deploy:** Vercel + Render + Supabase
