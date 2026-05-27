// Estado global
const state = {
  currentUser: null,
  explorePage: 1,
  feedPage: 1,
  exploreHasMore: true,
  feedHasMore: true,
  currentView: 'explore',
  previousView: null,
  searchTimeout: null
};

// ========================
// Inicialização
// ========================
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  loadExplore();
  loadTrending();
  loadStats();
});

async function checkAuth() {
  const res = await fetch('/auth/me');
  const data = await res.json();
  if (data.user) {
    state.currentUser = data.user;
    updateUIForAuth();
  }
}

function updateUIForAuth() {
  const user = state.currentUser;
  if (!user) return;

  document.getElementById('auth-buttons').classList.add('hidden');
  const userInfo = document.getElementById('user-info');
  userInfo.classList.remove('hidden');

  document.getElementById('sidebar-name').textContent = user.displayName || user.username;
  document.getElementById('sidebar-handle').textContent = '@' + user.username;
  
  const avatarEl = document.getElementById('sidebar-avatar');
  avatarEl.textContent = (user.displayName || user.username)[0].toUpperCase();

  const composeArea = document.getElementById('compose-area');
  composeArea.classList.remove('hidden');
  const composeAvatar = document.getElementById('compose-avatar');
  composeAvatar.textContent = (user.displayName || user.username)[0].toUpperCase();

  document.getElementById('nav-feed').style.display = 'flex';
}

// ========================
// Navegação
// ========================
function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  document.getElementById('view-' + viewName).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
  
  state.previousView = state.currentView;
  state.currentView = viewName;

  if (viewName === 'feed') {
    if (!state.currentUser) { showModal('login'); return; }
    loadFeed();
  }
}

function showProfile(username) {
  const targetUsername = username || (state.currentUser ? state.currentUser.username : null);
  if (!targetUsername) { showModal('login'); return; }
  
  state.previousView = state.currentView;
  state.currentView = 'profile';
  
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-profile').classList.add('active');
  
  loadProfile(targetUsername);
}

function goBack() {
  showView(state.previousView || 'explore');
}

// ========================
// Posts - Carregar
// ========================
async function loadExplore(loadMore = false) {
  if (!loadMore) {
    state.explorePage = 1;
    state.exploreHasMore = true;
  }
  
  if (!state.exploreHasMore) return;

  const res = await fetch(`/posts/explore?page=${state.explorePage}`);
  const data = await res.json();
  
  const container = document.getElementById('explore-posts');
  if (!loadMore) container.innerHTML = '';
  
  data.posts.forEach(post => container.appendChild(createPostCard(post)));
  
  state.explorePage++;
  state.exploreHasMore = state.explorePage <= data.totalPages;
  
  const loadMoreBtn = document.getElementById('explore-load-more');
  loadMoreBtn.style.display = state.exploreHasMore ? 'block' : 'none';
}

async function loadFeed(loadMore = false) {
  if (!state.currentUser) return;
  if (!loadMore) {
    state.feedPage = 1;
    state.feedHasMore = true;
  }
  
  if (!state.feedHasMore) return;

  const res = await fetch(`/posts/feed?page=${state.feedPage}`);
  if (!res.ok) return;
  const data = await res.json();
  
  const container = document.getElementById('feed-posts');
  if (!loadMore) container.innerHTML = '';

  if (data.posts.length === 0 && !loadMore) {
    container.innerHTML = '<p class="muted" style="padding:20px">Siga alguém para ver posts aqui!</p>';
    return;
  }
  
  data.posts.forEach(post => container.appendChild(createPostCard(post)));
  
  state.feedPage++;
  state.feedHasMore = state.feedPage <= data.totalPages;
  
  const loadMoreBtn = document.getElementById('feed-load-more');
  loadMoreBtn.style.display = state.feedHasMore ? 'block' : 'none';
}

// ========================
// Posts - Criar
// ========================
async function createPost(replyTo = null) {
  const textarea = document.getElementById(replyTo ? 'reply-content' : 'post-content');
  const content = textarea.value.trim();
  
  if (!content) return;

  const body = { content };
  if (replyTo) body.replyTo = replyTo;

  const res = await fetch('/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) { alert(data.error); return; }

  textarea.value = '';
  updateCharCount();

  if (replyTo) {
    // Reload post detail
    loadPostDetail(replyTo);
  } else {
    // Prepend to explore
    const container = document.getElementById('explore-posts');
    const card = createPostCard(data.post);
    container.prepend(card);
  }
}

// ========================
// Posts - Criar card HTML
// ========================
function createPostCard(post) {
  const div = document.createElement('div');
  div.className = 'post-card';
  div.dataset.postId = post._id;

  const author = post.author || {};
  const avatarLetter = (author.displayName || author.username || '?')[0].toUpperCase();
  const timeAgo = formatTime(post.createdAt);

  const isLiked = state.currentUser && post.likes && 
    post.likes.some(id => id === state.currentUser._id || id._id === state.currentUser._id);
  const isReposted = state.currentUser && post.reposts && 
    post.reposts.some(id => id === state.currentUser._id || id._id === state.currentUser._id);

  div.innerHTML = `
    <div class="post-header">
      <div class="user-avatar" onclick="event.stopPropagation(); showProfile('${author.username}')">${avatarLetter}</div>
      <div class="post-author-info">
        <span class="post-author-name" onclick="event.stopPropagation(); showProfile('${author.username}')" style="cursor:pointer">${author.displayName || author.username}</span>
        <span class="post-author-handle"> @${author.username}</span>
      </div>
      <span class="post-time">${timeAgo}</span>
      ${state.currentUser && author._id === state.currentUser._id ? `<button onclick="event.stopPropagation(); deletePost('${post._id}', this)" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;margin-left:8px" title="Deletar">🗑</button>` : ''}
    </div>
    <div class="post-content">${renderContent(post.content)}</div>
    <div class="post-actions">
      <button class="post-action like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); likePost('${post._id}', this)">
        ${isLiked ? '❤️' : '🤍'} <span>${post.likesCount || 0}</span>
      </button>
      <button class="post-action repost-btn ${isReposted ? 'reposted' : ''}" onclick="event.stopPropagation(); repostPost('${post._id}', this)">
        🔁 <span>${post.repostsCount || 0}</span>
      </button>
      <button class="post-action" onclick="loadPostDetail('${post._id}')">
        💬 <span>${post.repliesCount || 0}</span>
      </button>
    </div>
  `;

  div.addEventListener('click', () => loadPostDetail(post._id));
  return div;
}

// ========================
// Post detail
// ========================
async function loadPostDetail(postId) {
  state.previousView = state.currentView;
  
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-post-detail').classList.add('active');
  state.currentView = 'post-detail';

  const res = await fetch(`/posts/${postId}`);
  const data = await res.json();
  if (!res.ok) return;

  const post = data.post;
  const author = post.author || {};
  const avatarLetter = (author.displayName || author.username || '?')[0].toUpperCase();

  const isLiked = state.currentUser && post.likes && 
    post.likes.some(id => (id._id || id) === state.currentUser._id);

  const container = document.getElementById('post-detail-content');
  container.innerHTML = `
    <div class="post-detail-main">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
        <div class="user-avatar" onclick="showProfile('${author.username}')" style="cursor:pointer">${avatarLetter}</div>
        <div>
          <div class="post-author-name" onclick="showProfile('${author.username}')" style="cursor:pointer">${author.displayName || author.username}</div>
          <div class="post-author-handle">@${author.username}</div>
        </div>
      </div>
      <div class="post-detail-content">${renderContent(post.content)}</div>
      <div class="post-detail-time">${new Date(post.createdAt).toLocaleString('pt-BR')}</div>
      <div class="post-detail-stats">
        <div class="post-detail-stat"><strong>${post.likesCount || 0}</strong> <span>curtidas</span></div>
        <div class="post-detail-stat"><strong>${post.repostsCount || 0}</strong> <span>reposts</span></div>
        <div class="post-detail-stat"><strong>${post.repliesCount || 0}</strong> <span>respostas</span></div>
      </div>
      <div class="post-actions" style="margin-top:8px">
        <button class="post-action like-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post._id}', this)">
          ${isLiked ? '❤️' : '🤍'} <span>${post.likesCount || 0}</span>
        </button>
        <button class="post-action repost-btn" onclick="repostPost('${post._id}', this)">🔁 <span>${post.repostsCount || 0}</span></button>
      </div>
    </div>
    ${state.currentUser ? `
    <div class="compose-reply">
      <div style="display:flex;gap:12px">
        <div class="user-avatar">${(state.currentUser.displayName || state.currentUser.username)[0].toUpperCase()}</div>
        <div style="flex:1">
          <textarea id="reply-content" placeholder="Escreva sua resposta..." rows="2" maxlength="280"></textarea>
          <div class="compose-footer">
            <button class="btn btn-primary btn-sm" onclick="createPost('${post._id}')">Responder</button>
          </div>
        </div>
      </div>
    </div>` : ''}
    <div class="replies-section">
      <h3>Respostas</h3>
      ${post.replies && post.replies.length > 0 
        ? post.replies.map(reply => createPostCard(reply).outerHTML).join('')
        : '<p class="muted" style="padding:16px 20px">Nenhuma resposta ainda.</p>'}
    </div>
  `;
}

// ========================
// Like / Repost
// ========================
async function likePost(postId, btn) {
  if (!state.currentUser) { showModal('login'); return; }

  const res = await fetch(`/posts/${postId}/like`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return;

  const countEl = btn.querySelector('span');
  if (data.liked) {
    btn.classList.add('liked');
    btn.innerHTML = `❤️ <span>${data.likesCount}</span>`;
  } else {
    btn.classList.remove('liked');
    btn.innerHTML = `🤍 <span>${data.likesCount}</span>`;
  }
}

async function repostPost(postId, btn) {
  if (!state.currentUser) { showModal('login'); return; }

  const res = await fetch(`/posts/${postId}/repost`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return;

  if (data.reposted) {
    btn.classList.add('reposted');
    btn.innerHTML = `🔁 <span>${data.repostsCount}</span>`;
  } else {
    btn.classList.remove('reposted');
    btn.innerHTML = `🔁 <span>${data.repostsCount}</span>`;
  }
}

async function deletePost(postId, btn) {
  if (!confirm('Deletar este post?')) return;

  const res = await fetch(`/posts/${postId}`, { method: 'DELETE' });
  if (res.ok) {
    const card = btn.closest('.post-card');
    if (card) card.remove();
  }
}

// ========================
// Profile
// ========================
async function loadProfile(username) {
  const res = await fetch(`/users/${username}`);
  const data = await res.json();
  if (!res.ok) return;

  const { user, posts } = data;
  const avatarLetter = (user.displayName || user.username)[0].toUpperCase();
  const isMe = state.currentUser && state.currentUser._id === user._id;
  const isFollowing = state.currentUser && user.followers.some(f => (f._id || f) === state.currentUser._id);

  const container = document.getElementById('profile-content');
  container.innerHTML = `
    <div class="profile-header">
      <div class="profile-top">
        <div class="profile-avatar-lg">${avatarLetter}</div>
        <div>
          ${isMe 
            ? `<button class="btn btn-outline" onclick="openEditProfile()">Editar perfil</button>`
            : state.currentUser 
              ? `<button class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'}" id="follow-btn" onclick="toggleFollow('${user.username}', this)">${isFollowing ? 'Seguindo' : 'Seguir'}</button>`
              : ''}
        </div>
      </div>
      <div class="profile-name">${user.displayName || user.username}</div>
      <div class="profile-handle">@${user.username}</div>
      ${user.bio ? `<div class="profile-bio">${user.bio}</div>` : ''}
      <div class="profile-stats">
        <div class="profile-stat"><strong>${user.postsCount || 0}</strong> <span>posts</span></div>
        <div class="profile-stat"><strong>${user.following?.length || 0}</strong> <span>seguindo</span></div>
        <div class="profile-stat"><strong>${user.followers?.length || 0}</strong> <span>seguidores</span></div>
      </div>
    </div>
    <div id="profile-posts">
      ${posts.length === 0 
        ? '<p class="muted" style="padding:20px">Nenhum post ainda.</p>'
        : posts.map(post => {
            const card = createPostCard({...post, author: user});
            return card.outerHTML;
          }).join('')}
    </div>
  `;

  // Re-bind click events since we used innerHTML
  container.querySelectorAll('.post-card').forEach((card, i) => {
    card.addEventListener('click', () => loadPostDetail(posts[i]._id));
  });
}

async function toggleFollow(username, btn) {
  if (!state.currentUser) { showModal('login'); return; }

  const res = await fetch(`/users/${username}/follow`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return;

  if (data.following) {
    btn.textContent = 'Seguindo';
    btn.className = 'btn btn-outline';
  } else {
    btn.textContent = 'Seguir';
    btn.className = 'btn btn-primary';
  }
}

function openEditProfile() {
  document.getElementById('edit-displayname').value = state.currentUser.displayName || '';
  document.getElementById('edit-bio').value = state.currentUser.bio || '';
  showModal('edit-profile');
}

async function saveProfile() {
  const displayName = document.getElementById('edit-displayname').value;
  const bio = document.getElementById('edit-bio').value;

  const res = await fetch('/users/profile/edit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, bio })
  });

  const data = await res.json();
  if (!res.ok) { alert(data.error); return; }

  state.currentUser = data.user;
  closeModal('edit-profile');
  loadProfile(state.currentUser.username);
  updateUIForAuth();
}

// ========================
// Busca
// ========================
function debounceSearch() {
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(doSearch, 400);
}

async function doSearch() {
  const query = document.getElementById('search-input').value.trim();
  const container = document.getElementById('search-results');
  
  if (!query || query.length < 2) { container.innerHTML = ''; return; }

  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  container.innerHTML = '';

  if (data.users && data.users.length > 0) {
    const title = document.createElement('div');
    title.className = 'search-section-title';
    title.textContent = 'Usuários';
    container.appendChild(title);

    data.users.forEach(user => {
      const div = document.createElement('div');
      div.className = 'user-result';
      div.innerHTML = `
        <div class="user-avatar">${(user.displayName || user.username)[0].toUpperCase()}</div>
        <div class="user-result-info">
          <div class="user-result-name">${user.displayName || user.username}</div>
          <div class="user-result-handle">@${user.username}</div>
          ${user.bio ? `<div class="user-result-bio">${user.bio}</div>` : ''}
        </div>
      `;
      div.onclick = () => showProfile(user.username);
      container.appendChild(div);
    });
  }

  if (data.posts && data.posts.length > 0) {
    const title = document.createElement('div');
    title.className = 'search-section-title';
    title.textContent = 'Posts';
    container.appendChild(title);
    data.posts.forEach(post => container.appendChild(createPostCard(post)));
  }

  if ((!data.users || !data.users.length) && (!data.posts || !data.posts.length)) {
    container.innerHTML = '<p class="muted" style="padding:20px">Nenhum resultado encontrado.</p>';
  }
}

// ========================
// Trending & Stats
// ========================
async function loadTrending() {
  const res = await fetch('/api/trending');
  const data = await res.json();
  const container = document.getElementById('trending-list');

  if (!data.trending || data.trending.length === 0) {
    container.innerHTML = '<p class="muted">Nada em alta ainda.</p>';
    return;
  }

  container.innerHTML = data.trending.map(item => `
    <div class="trending-item" onclick="searchHashtag('${item._id}')">
      <span class="trending-tag">#${item._id}</span>
      <span class="trending-count">${item.count} posts</span>
    </div>
  `).join('');
}

async function loadStats() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  const container = document.getElementById('stats-box');
  container.innerHTML = `
    <h3>📊 Estatísticas</h3>
    <div class="stats-item"><span>Usuários</span><span class="stats-value">${data.totalUsers}</span></div>
    <div class="stats-item"><span>Posts</span><span class="stats-value">${data.totalPosts}</span></div>
  `;
}

function searchHashtag(tag) {
  document.getElementById('search-input').value = '#' + tag;
  showView('search');
  doSearch();
}

// ========================
// Auth
// ========================
async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error;
    errorEl.classList.remove('hidden');
    return;
  }

  state.currentUser = data.user;
  closeAllModals();
  updateUIForAuth();
  showView('feed');
  loadFeed();
}

async function register() {
  const username = document.getElementById('reg-username').value;
  const displayName = document.getElementById('reg-displayname').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const errorEl = document.getElementById('register-error');

  const res = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, displayName, email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error;
    errorEl.classList.remove('hidden');
    return;
  }

  state.currentUser = data.user;
  closeAllModals();
  updateUIForAuth();
  showView('explore');
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  state.currentUser = null;
  document.getElementById('auth-buttons').classList.remove('hidden');
  document.getElementById('user-info').classList.add('hidden');
  document.getElementById('compose-area').classList.add('hidden');
  showView('explore');
  loadExplore();
}

// ========================
// Modais
// ========================
function showModal(name) {
  document.getElementById('modal-' + name).classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal(name) {
  document.getElementById('modal-' + name).classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-overlay').classList.add('hidden');
}

function switchModal(from, to) {
  closeModal(from);
  showModal(to);
}

// ========================
// Utilitários
// ========================
function updateCharCount() {
  const textarea = document.getElementById('post-content');
  const count = 280 - textarea.value.length;
  const el = document.getElementById('char-count');
  el.textContent = count;
  el.className = 'char-count' + (count < 20 ? ' danger' : count < 50 ? ' warning' : '');
}

function renderContent(content) {
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/#(\w+)/g, '<span class="hashtag" onclick="event.stopPropagation(); searchHashtag(\'$1\')">#$1</span>')
    .replace(/\n/g, '<br>');
}

function formatTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}
