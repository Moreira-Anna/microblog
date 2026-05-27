# ✦ MicroBlog

Plataforma de micro-blogging completa com Node.js e MongoDB.

## 🚀 Funcionalidades

- **Autenticação** — Cadastro, login, sessões persistentes
- **Posts** — Criar, deletar, até 280 caracteres
- **Feed personalizado** — Veja posts de quem você segue
- **Curtidas & Reposts** — Interações em posts
- **Respostas** — Responda posts (threads)
- **Seguir/Deixar de seguir** — Sistema de follows
- **Hashtags** — Extração automática e busca por hashtag
- **Busca** — Pesquise posts, usuários e hashtags
- **Trending** — Hashtags mais usadas nas últimas 24h
- **Perfil editável** — Nome de exibição e bio
- **Interface responsiva** — Funciona no mobile

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- MongoDB rodando localmente (ou MongoDB Atlas)

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# 3. Iniciar o servidor
npm run dev       # desenvolvimento (com nodemon)
npm start         # produção
```

Acesse: **http://localhost:3000**

## 🗂️ Estrutura do Projeto

```
microblog/
├── src/
│   ├── server.js              # Entrada principal
│   ├── models/
│   │   ├── User.js            # Model de usuário
│   │   └── Post.js            # Model de post
│   ├── routes/
│   │   ├── auth.js            # Login, registro, logout
│   │   ├── posts.js           # CRUD de posts, likes, reposts
│   │   ├── users.js           # Perfil, follow, busca
│   │   └── api.js             # Busca, trending, stats
│   └── middleware/
│       └── auth.js            # Proteção de rotas
└── public/
    ├── index.html             # SPA principal
    ├── css/style.css          # Estilos
    └── js/app.js              # Lógica do frontend
```

## 🔌 API Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /auth/register | Criar conta |
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| GET | /auth/me | Usuário atual |

### Posts
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /posts/explore | Todos os posts |
| GET | /posts/feed | Posts do feed (auth) |
| GET | /posts/hashtag/:tag | Posts por hashtag |
| POST | /posts | Criar post (auth) |
| GET | /posts/:id | Detalhe + replies |
| DELETE | /posts/:id | Deletar post (auth) |
| POST | /posts/:id/like | Curtir/descurtir (auth) |
| POST | /posts/:id/repost | Repostar (auth) |

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /users/search?q= | Buscar usuários |
| GET | /users/:username | Perfil do usuário |
| PUT | /users/profile/edit | Editar perfil (auth) |
| POST | /users/:username/follow | Seguir/deixar de seguir (auth) |

### API
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/search?q= | Busca geral |
| GET | /api/trending | Hashtags em alta (24h) |
| GET | /api/stats | Estatísticas |

## ⚙️ Variáveis de Ambiente

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/microblog
SESSION_SECRET=seu_segredo_aqui
NODE_ENV=development
```

## 🛠️ Tecnologias

- **Backend**: Node.js, Express.js
- **Banco de dados**: MongoDB + Mongoose
- **Autenticação**: express-session + bcryptjs
- **Sessões persistentes**: connect-mongo
- **Frontend**: HTML, CSS, JavaScript vanilla (SPA)
