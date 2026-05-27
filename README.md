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
