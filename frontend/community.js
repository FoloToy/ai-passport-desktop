'use strict';
/* AI Passport community account in the desktop app: sign in / register, likes, favorites,
   comments and the "我的" page. Requests go through the local /api/community endpoint, which
   keeps the site session (pkg/account). Loaded after app.js and shares its globals. */

Object.assign(I18N.zh, {
  nav_me: '我的', sign_in: '登录', sign_out: '退出登录', signed_in: '已登录', signed_out: '已退出登录',
  login_title: '登录 AI Passport 社区', login_code: '验证码登录', login_password: '密码登录', login_register: '注册',
  ch_phone: '手机号', ch_email: '邮箱', ph_phone: '手机号（中国大陆可直接输入）', ph_email: '邮箱地址', ph_account: '邮箱或已验证的手机号',
  ph_code: '6 位验证码', ph_password: '密码', ph_new_password: '设置密码（至少 8 位）', ph_name: '昵称',
  send_code: '获取验证码', resend_in: s => `${s} 秒后重发`, code_sent: '验证码已发送',
  agree_pre: '我已阅读并同意', terms: '《用户协议》', privacy: '《隐私政策》', and: '和', age_ok: '我已年满 14 周岁，或已取得监护人同意',
  must_agree: '请先阅读并同意用户协议和隐私政策', must_age: '请确认年龄', code_login_note: '没有账号时会自动注册。',
  submit_login: '登录', submit_register: '注册并登录', forgot: '忘记密码？在官网找回',
  welcome_back: n => `欢迎，${n}`, need_login: '请先登录', like: '点赞', liked: '已点赞', fav: '收藏', faved: '已收藏',
  tab_comments: '评论', comments_empty: '还没有评论，来写第一条吧。', comments_loading: '正在加载评论…', comments_failed: '评论加载失败',
  c_review: '评价', c_suggestion: '建议', c_ph: '说说你玩的感受，或者给作者提个建议…', c_send: '发布', c_sending: '正在发布…',
  c_rating: '评分', c_need_rating: '请选择 1–5 星', c_need_body: '请写点内容', c_posted: '已发布', c_pending_note: '已提交，审核通过后公开显示。',
  c_pending: '审核中', c_reply: '回复', c_replying: n => `回复 ${n}`, c_cancel: '取消', c_delete: '删除', c_deleted: '已删除', c_author: '作者',
  c_confirm_delete: '确定删除这条评论吗？', c_login_to_comment: '登录后可以发表评论', c_avg: (a, n) => `${a} 分 · ${n} 人评价`,
  me_title: '我的', me_login_lead: '登录后可以点赞、收藏、评论，并在电脑和手机上同步你的收藏。',
  me_fav: '收藏', me_likes: '点赞', me_history: '安装记录', me_empty: '这里还没有内容。', me_unavailable: '已下架',
  me_open_web: '在官网管理账号', loading: '正在加载…',
});
Object.assign(I18N.en, {
  nav_me: 'Me', sign_in: 'Sign in', sign_out: 'Sign out', signed_in: 'Signed in', signed_out: 'Signed out',
  login_title: 'Sign in to the AI Passport community', login_code: 'Code', login_password: 'Password', login_register: 'Register',
  ch_phone: 'Phone', ch_email: 'Email', ph_phone: 'Mobile number (with country code outside mainland China)', ph_email: 'Email address', ph_account: 'Email or verified phone number',
  ph_code: '6-digit code', ph_password: 'Password', ph_new_password: 'Choose a password (8+ characters)', ph_name: 'Nickname',
  send_code: 'Send code', resend_in: s => `Resend in ${s}s`, code_sent: 'Code sent',
  agree_pre: 'I have read and agree to the ', terms: 'Terms', privacy: 'Privacy Policy', and: ' and ', age_ok: "I'm 14 or older, or have a guardian's consent",
  must_agree: 'Please agree to the Terms and Privacy Policy first', must_age: 'Please confirm your age', code_login_note: 'A new account is created if you don\'t have one.',
  submit_login: 'Sign in', submit_register: 'Register and sign in', forgot: 'Forgot your password? Reset it on the website',
  welcome_back: n => `Welcome, ${n}`, need_login: 'Please sign in first', like: 'Like', liked: 'Liked', fav: 'Save', faved: 'Saved',
  tab_comments: 'Comments', comments_empty: 'No comments yet. Be the first.', comments_loading: 'Loading comments…', comments_failed: "Couldn't load comments",
  c_review: 'Review', c_suggestion: 'Suggestion', c_ph: 'How did you like it? Or suggest something to the author…', c_send: 'Post', c_sending: 'Posting…',
  c_rating: 'Rating', c_need_rating: 'Choose 1–5 stars', c_need_body: 'Please write something', c_posted: 'Posted', c_pending_note: 'Sent. It will show once it is approved.',
  c_pending: 'Pending', c_reply: 'Reply', c_replying: n => `Replying to ${n}`, c_cancel: 'Cancel', c_delete: 'Delete', c_deleted: 'Deleted', c_author: 'Author',
  c_confirm_delete: 'Delete this comment?', c_login_to_comment: 'Sign in to comment', c_avg: (a, n) => `${a} · ${n} reviews`,
  me_title: 'Me', me_login_lead: 'Sign in to like, save and comment, and to see your saved apps on your computer and phone.',
  me_fav: 'Saved', me_likes: 'Liked', me_history: 'Install history', me_empty: 'Nothing here yet.', me_unavailable: 'Removed',
  me_open_web: 'Manage your account on the website', loading: 'Loading…',
});

const C = {
  user: undefined, // undefined: not checked yet; null: signed out
  dlg: { tab: 'code', channel: 'phone', busy: false, error: '', form: {}, cooldown: 0 },
  eng: {}, // slug -> { hearts, liked, saved, busy }
  comments: {}, // slug -> { items, summary, loading, error }
  composer: { kind: 'review', rating: 0, body: '', replyTo: null, busy: false },
  me: { tab: 'fav', items: null, loading: false, error: '' },
};

class CommunityError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

/** One request to the community site through the desktop app. */
async function cm(method, path, body, query = '') {
  const r = await api('community', { method, path, query, body: body === undefined ? null : body });
  const d = r.data || {};
  if (r.status >= 400) {
    if (r.status === 401) C.user = null;
    const detail = d.detail || d.error || d.message;
    throw new CommunityError(typeof detail === 'string' ? detail : (r.status === 429 ? t('err_rate_limited') : t('err_other')), r.status);
  }
  return d;
}

const siteUrl = u => (!u ? '' : /^https?:\/\//.test(u) ? u : (S.server.origin || '') + u);
const userName = u => (u && (u.name || u.email || u.maskedPhone)) || '';

async function refreshMe() {
  try {
    const d = await cm('GET', '/api/me');
    C.user = d.user || null;
  } catch (e) {
    if (C.user === undefined) C.user = null;
  }
  renderTopRight();
  if (parseRoute().name === 'me') render();
}

function requireLogin() {
  if (C.user) return true;
  toast(t('need_login'));
  openLogin();
  return false;
}

/* ---------------- top bar ---------------- */
function accountButton() {
  if (C.user === undefined) return '';
  if (!C.user) return `<button class="btn small" data-action="login">${t('sign_in')}</button>`;
  const av = C.user.avatarUrl ? `<img src="${esc(siteUrl(C.user.avatarUrl))}" alt="">` : `<span>${esc(userName(C.user).slice(0, 1).toUpperCase())}</span>`;
  return `<a class="account-chip" href="#/me" title="${esc(userName(C.user))}">${av}<b>${esc(userName(C.user))}</b></a>`;
}

/* ---------------- sign-in dialog ---------------- */
function openLogin() {
  C.dlg = { ...C.dlg, busy: false, error: '' };
  S.modal = 'account';
  renderModal();
}

function field(name, type, ph, extra = '') {
  return `<input class="field" name="${name}" type="${type}" placeholder="${esc(ph)}" value="${esc(C.dlg.form[name] || '')}" data-account-field spellcheck="false" ${extra}>`;
}

function agreeBox(withAge) {
  const f = C.dlg.form;
  const tl = lang === 'en' ? 'terms-en' : 'terms', pl = lang === 'en' ? 'privacy-en' : 'privacy';
  return `<label class="check"><input type="checkbox" name="terms" data-account-field ${f.terms ? 'checked' : ''}> <span>${t('agree_pre')}<a href="#" data-action="open-site" data-target="${tl}">${t('terms')}</a>${t('and')}<a href="#" data-action="open-site" data-target="${pl}">${t('privacy')}</a></span></label>
    ${withAge ? `<label class="check"><input type="checkbox" name="age" data-account-field ${f.age ? 'checked' : ''}> <span>${t('age_ok')}</span></label>` : ''}`;
}

function accountBody() {
  const d = C.dlg;
  const tabs = ['code', 'password', 'register'].map(k => `<button class="${d.tab === k ? 'active' : ''}" data-action="login-tab" data-tab="${k}">${t('login_' + k)}</button>`).join('');
  const channel = `<div class="segmented">${['phone', 'email'].map(c => `<button class="${d.channel === c ? 'active' : ''}" data-action="login-channel" data-channel="${c}">${t('ch_' + c)}</button>`).join('')}</div>`;
  const target = d.channel === 'phone' ? field('phone', 'tel', t('ph_phone')) : field('email', 'email', t('ph_email'));
  const codeRow = `<div class="code-row">${field('code', 'text', t('ph_code'), 'inputmode="numeric" maxlength="8" autocomplete="one-time-code"')}<button class="btn" data-action="send-code" ${d.cooldown > 0 || d.busy ? 'disabled' : ''}>${d.cooldown > 0 ? t('resend_in', d.cooldown) : t('send_code')}</button></div>`;
  let body = '';
  if (d.tab === 'code') {
    body = `${channel}${target}${codeRow}${agreeBox(false)}<p class="hint">${t('code_login_note')}</p>
      <button class="btn primary large wide" data-action="do-login" ${d.busy ? 'disabled' : ''}>${t('submit_login')}</button>`;
  } else if (d.tab === 'password') {
    body = `${field('account', 'text', t('ph_account'), 'autocomplete="username"')}${field('password', 'password', t('ph_password'), 'autocomplete="current-password"')}
      <button class="btn primary large wide" data-action="do-login" ${d.busy ? 'disabled' : ''}>${t('submit_login')}</button>
      <p class="hint"><a href="#" data-action="open-site" data-target="account">${t('forgot')}</a></p>`;
  } else {
    body = `${channel}${target}${codeRow}${field('name', 'text', t('ph_name'), 'maxlength="40"')}${field('password', 'password', t('ph_new_password'), 'autocomplete="new-password"')}${agreeBox(true)}
      <button class="btn primary large wide" data-action="do-login" ${d.busy ? 'disabled' : ''}>${t('submit_register')}</button>`;
  }
  return `<div class="login"><div class="tabs">${tabs}</div>${d.error ? `<div class="notice red">${esc(d.error)}</div>` : ''}${body}</div>`;
}

function rerenderAccount() {
  const b = $('#modal-body');
  if (b && S.modal === 'account') b.innerHTML = accountBody();
}

function startCooldown() {
  C.dlg.cooldown = 60;
  const tick = () => {
    C.dlg.cooldown--;
    const btn = document.querySelector('[data-action="send-code"]');
    if (btn) { btn.textContent = C.dlg.cooldown > 0 ? t('resend_in', C.dlg.cooldown) : t('send_code'); btn.disabled = C.dlg.cooldown > 0; }
    if (C.dlg.cooldown > 0) setTimeout(tick, 1000);
  };
  setTimeout(tick, 1000);
}

async function sendCode() {
  const d = C.dlg, f = d.form;
  const key = d.channel;
  const value = (f[key] || '').trim();
  if (!value) { d.error = t(key === 'phone' ? 'ph_phone' : 'ph_email'); rerenderAccount(); return; }
  d.busy = true; d.error = ''; rerenderAccount();
  try {
    let path, body = { [key]: value, locale: lang === 'en' ? 'en' : 'zh' };
    if (d.tab === 'register') path = key === 'email' ? '/api/auth/verification-code/request' : '/api/auth/phone-registration/verification-code/request';
    else { path = '/api/auth/code-login/verification-code/request'; body.channel = key; }
    const r = await cm('POST', path, body);
    toast(r.message || t('code_sent'));
    startCooldown();
  } catch (e) { d.error = e.message; }
  d.busy = false; rerenderAccount();
}

async function doLogin() {
  const d = C.dlg, f = d.form;
  const code = (f.code || '').trim();
  d.error = '';
  if (d.tab !== 'password' && !f.terms) { d.error = t('must_agree'); rerenderAccount(); return; }
  if (d.tab === 'register' && !f.age) { d.error = t('must_age'); rerenderAccount(); return; }
  d.busy = true; rerenderAccount();
  try {
    const key = d.channel, value = (f[key] || '').trim();
    let r;
    if (d.tab === 'code') {
      r = await cm('POST', '/api/auth/code-login', { [key]: value, channel: key, verification_code: code, terms_accepted: true, locale: lang === 'en' ? 'en' : 'zh' });
    } else if (d.tab === 'password') {
      r = await cm('POST', '/api/auth/login', { email: (f.account || '').trim(), password: f.password || '' });
    } else {
      r = await cm('POST', key === 'email' ? '/api/auth/register' : '/api/auth/phone-register', {
        [key]: value, verification_code: code, name: (f.name || '').trim(), password: f.password || '', terms_accepted: true, age_confirmed: true,
      });
    }
    C.user = r.user || C.user;
    await refreshMe();
    C.dlg = { tab: d.tab, channel: d.channel, busy: false, error: '', form: {}, cooldown: 0 };
    S.modal = null;
    renderModal();
    toast(t('welcome_back', userName(C.user)));
    C.eng = {};
    if (S.detail.slug) loadEngagement(S.bySlug.get(S.detail.slug));
  } catch (e) {
    d.busy = false; d.error = e.message; rerenderAccount();
  }
}

async function signOut() {
  try { await cm('POST', '/api/auth/logout', {}); } catch { /* signed out locally anyway */ }
  C.user = null; C.eng = {}; C.me.items = null;
  toast(t('signed_out'));
  render();
}

/* ---------------- likes and favorites ---------------- */
const playKind = p => (p.source === 'official' || p.official ? 'official' : 'community');

async function loadEngagement(p) {
  if (!p) return;
  const e = C.eng[p.slug] || (C.eng[p.slug] = { hearts: p.hearts, favorites: p.favorites, liked: false, saved: false });
  try {
    const target = `${playKind(p)}:${p.slug}`;
    const d = await cm('GET', '/api/engagement', undefined, 'targets=' + encodeURIComponent(target));
    const x = d.engagement && d.engagement[target];
    if (x) { e.hearts = x.hearts; e.liked = !!x.liked; }
    if (C.user) {
      const f = await cm('GET', `/api/me/follows/play/${p.id}`);
      e.saved = !!f.saved;
      if (typeof f.count === 'number') e.favorites = f.count;
    }
  } catch { /* keep the offline counts */ }
  updateEngagement(p);
}

function engagementButtons(p) {
  const e = C.eng[p.slug] || { hearts: p.hearts, favorites: p.favorites, liked: false, saved: false };
  return `<button class="eng ${e.liked ? 'on' : ''}" data-action="heart" data-slug="${esc(p.slug)}" title="${t(e.liked ? 'liked' : 'like')}">${ICON.heart}${fmtNum(e.hearts)}</button>
    <button class="eng ${e.saved ? 'on' : ''}" data-action="favorite" data-slug="${esc(p.slug)}" title="${t(e.saved ? 'faved' : 'fav')}">${ICON.bookmark}${fmtNum(e.favorites)}</button>
    <button class="eng" data-action="detail-tab" data-tab="comments">${ICON.chat}${fmtNum(p.comments)}</button>
    <span>${ICON.download}${fmtNum(p.downloads)}</span>`;
}

function updateEngagement(p) {
  const box = document.querySelector('.stats[data-eng]');
  if (box && S.detail.slug === p.slug) box.innerHTML = engagementButtons(p);
}

async function toggleHeart(slug) {
  const p = S.bySlug.get(slug);
  if (!p) return;
  const e = C.eng[slug] || (C.eng[slug] = { hearts: p.hearts, favorites: p.favorites, liked: false, saved: false });
  if (e.busy) return;
  e.busy = true;
  try {
    const d = await cm(e.liked ? 'DELETE' : 'PUT', `/api/engagement/${playKind(p)}/${slug}/heart`);
    e.liked = !!d.liked;
    if (typeof d.hearts === 'number') e.hearts = d.hearts;
  } catch (err) { toast(err.message, true); }
  e.busy = false;
  updateEngagement(p);
}

async function toggleFavorite(slug) {
  if (!requireLogin()) return;
  const p = S.bySlug.get(slug);
  if (!p) return;
  const e = C.eng[slug] || (C.eng[slug] = { hearts: p.hearts, favorites: p.favorites, liked: false, saved: false });
  if (e.busy) return;
  e.busy = true;
  try {
    const on = !e.saved;
    const d = await cm(on ? 'PUT' : 'DELETE', `/api/me/follows/play/${p.id}`);
    e.saved = d.saved === undefined ? on : !!d.saved;
    if (typeof d.count === 'number') e.favorites = d.count;
    else e.favorites = Math.max(0, e.favorites + (e.saved ? 1 : -1));
    C.me.items = null;
  } catch (err) { toast(err.message, true); }
  e.busy = false;
  updateEngagement(p);
}

/* ---------------- comments ---------------- */
async function loadComments(slug, force) {
  const box = C.comments[slug];
  if (box && !force && (box.items || box.loading)) return;
  C.comments[slug] = { items: box && box.items, summary: box && box.summary, loading: true, error: '' };
  updateComments(slug);
  try {
    const d = await cm('GET', `/api/plays/${slug}/comments`, undefined, 'sort=default');
    C.comments[slug] = { items: d.comments || [], summary: d.summary || null, loading: false, error: '' };
  } catch (e) {
    C.comments[slug] = { items: null, loading: false, error: e.status === 404 ? t('comments_empty') : e.message };
  }
  updateComments(slug);
}

function updateComments(slug) {
  const el = document.querySelector('.comments');
  if (el && S.detail.slug === slug && S.detail.tab === 'comments') el.outerHTML = commentsBody(slug);
}

const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);

function commentItem(slug, c, reply) {
  const when = c.createdAt ? new Date(c.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const av = c.avatarUrl ? `<img class="avatar" src="${esc(siteUrl(c.avatarUrl))}" alt="">` : '<span class="avatar"></span>';
  return `<div class="comment ${reply ? 'reply' : ''}">
    ${av}
    <div class="c-main">
      <div class="c-head"><b>${esc(c.authorName || '—')}</b>${c.isAuthor ? `<span class="tag">${t('c_author')}</span>` : ''}${c.status === 'pending' ? `<span class="tag amber">${t('c_pending')}</span>` : ''}${c.rating ? `<span class="c-stars">${stars(c.rating)}</span>` : ''}<span class="c-time">${esc(when)}</span></div>
      <div class="c-body">${esc(c.body || '')}</div>
      <div class="c-actions">
        <button class="${c.liked ? 'on' : ''}" data-action="comment-like" data-id="${c.id}">${ICON.heart}${c.likes || 0}</button>
        ${reply ? '' : `<button data-action="comment-reply" data-id="${c.id}" data-name="${esc(c.authorName || '')}">${t('c_reply')}</button>`}
        ${c.canDelete ? `<button data-action="comment-delete" data-id="${c.id}">${t('c_delete')}</button>` : ''}
      </div>
    </div>
  </div>`;
}

function composerHtml() {
  if (!C.user) return `<div class="composer signed-out"><span>${t('c_login_to_comment')}</span><button class="btn small" data-action="login">${t('sign_in')}</button></div>`;
  const k = C.composer;
  const kinds = k.replyTo ? `<span class="hint">${t('c_replying', esc(k.replyTo.name))} · <a href="#" data-action="comment-cancel-reply">${t('c_cancel')}</a></span>`
    : `<div class="segmented">${['review', 'suggestion'].map(x => `<button class="${k.kind === x ? 'active' : ''}" data-action="comment-kind" data-kind="${x}">${t('c_' + x)}</button>`).join('')}</div>
       ${k.kind === 'review' ? `<span class="c-rate">${[1, 2, 3, 4, 5].map(n => `<button class="${n <= k.rating ? 'on' : ''}" data-action="comment-rate" data-n="${n}" aria-label="${n}">★</button>`).join('')}</span>` : ''}`;
  return `<div class="composer"><div class="c-opts">${kinds}</div>
    <textarea id="comment-body" rows="3" maxlength="2000" placeholder="${esc(t('c_ph'))}">${esc(k.body)}</textarea>
    <div class="c-send"><button class="btn primary small" data-action="comment-send" ${k.busy ? 'disabled' : ''}>${k.busy ? t('c_sending') : t('c_send')}</button></div></div>`;
}

function commentsBody(slug) {
  const box = C.comments[slug] || {};
  let list = '';
  if (box.loading && !box.items) list = `<p class="hint">${t('comments_loading')}</p>`;
  else if (box.error) list = `<p class="hint">${esc(box.error)}</p>`;
  else if (box.items && !box.items.length) list = `<p class="hint">${t('comments_empty')}</p>`;
  else if (box.items) list = box.items.map(c => commentItem(slug, c, false) + (c.replies || []).map(r => commentItem(slug, r, true)).join('')).join('');
  const sm = box.summary;
  const avg = sm && sm.averageRating ? `<p class="hint">${stars(Math.round(sm.averageRating))} ${t('c_avg', sm.averageRating, sm.ratingCount)}</p>` : '';
  return `<div class="comments">${composerHtml()}${avg}${list}</div>`;
}

function findComment(slug, id) {
  for (const c of (C.comments[slug] || {}).items || []) {
    if (String(c.id) === String(id)) return c;
    for (const r of c.replies || []) if (String(r.id) === String(id)) return r;
  }
  return null;
}

async function sendComment() {
  const slug = S.detail.slug;
  const k = C.composer;
  k.body = ($('#comment-body') || {}).value || k.body;
  const text = k.body.trim();
  if (!text) { toast(t('c_need_body'), true); return; }
  const body = { body: text, kind: k.replyTo ? 'suggestion' : k.kind };
  if (k.replyTo) body.parentCommentId = k.replyTo.id;
  else if (k.kind === 'review') {
    if (!k.rating) { toast(t('c_need_rating'), true); return; }
    body.rating = k.rating;
  }
  k.busy = true; updateComments(slug);
  try {
    const d = await cm('POST', `/api/plays/${slug}/comments`, body);
    const pending = d.comment && d.comment.status === 'pending';
    C.composer = { kind: k.kind, rating: 0, body: '', replyTo: null, busy: false };
    toast(pending ? t('c_pending_note') : t('c_posted'));
    await loadComments(slug, true);
  } catch (e) {
    k.busy = false; toast(e.message, true); updateComments(slug);
  }
}

/* ---------------- 我的 ---------------- */
function renderMe() {
  if (C.user === undefined) return `<div class="center-page"><p class="hint">${t('loading')}</p></div>`;
  if (!C.user) {
    return `<div class="center-page"><div class="welcome"><img class="logo" src="/logo.svg" alt=""><h1>${t('me_title')}</h1><p>${t('me_login_lead')}</p>
      <div class="actions"><button class="btn primary large" data-action="login">${t('sign_in')}</button></div></div></div>`;
  }
  const u = C.user;
  if (!C.me.items && !C.me.loading) loadMe();
  const av = u.avatarUrl ? `<img class="me-avatar" src="${esc(siteUrl(u.avatarUrl))}" alt="">` : `<span class="me-avatar">${esc(userName(u).slice(0, 1).toUpperCase())}</span>`;
  const tabs = ['fav', 'likes', 'history'].map(k => `<button class="${C.me.tab === k ? 'active' : ''}" data-action="me-tab" data-tab="${k}">${t('me_' + k)}</button>`).join('');
  let list;
  if (C.me.loading && !C.me.items) list = `<p class="hint">${t('loading')}</p>`;
  else if (C.me.error) list = `<div class="notice red">${esc(C.me.error)}</div>`;
  else if (!C.me.items || !C.me.items.length) list = `<p class="hint">${t('me_empty')}</p>`;
  else list = `<div class="me-list">${C.me.items.map(meItem).join('')}</div>`;
  return `<div class="settings me">
    <section class="panel me-head">${av}<div><h1>${esc(userName(u))}</h1><p>${esc([u.email, u.maskedPhone].filter(Boolean).join(' · '))}</p></div>
      <div class="buttons"><button class="btn ghost small" data-action="open-site" data-target="account">${t('me_open_web')} ↗</button><button class="btn small" data-action="sign-out">${t('sign_out')}</button></div></section>
    <div class="tabs">${tabs}</div>
    ${list}
  </div>`;
}

function meItem(it) {
  const slug = it.slug || (it.play && it.play.slug) || '';
  const local = S.bySlug.get(slug) || (it.id && S.byId.get(Number(it.id)));
  const title = local ? pick(local.title) : pick(it.title || (it.play && it.play.title)) || slug || '—';
  const when = it.createdAt || it.installedAt || it.created_at || '';
  const img = local && (local.thumb || local.cover) ? `<img src="${media(local.thumb || local.cover)}" alt="">` : '<span></span>';
  return `<button class="me-item" ${local ? `data-action="open-play" data-slug="${esc(local.slug)}"` : 'disabled'}>${img}<b>${esc(title)}</b>${it.available === false ? `<small>${t('me_unavailable')}</small>` : ''}${when ? `<small>${esc(new Date(when).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US'))}</small>` : ''}</button>`;
}

async function loadMe() {
  C.me.loading = true; C.me.error = '';
  const path = { fav: ['/api/me/follows', 'kind=play&page=1'], likes: ['/api/me/likes', 'page=1'], history: ['/api/me/install-history', 'page=1'] }[C.me.tab];
  try {
    const d = await cm('GET', path[0], undefined, path[1]);
    C.me.items = d.items || d.history || [];
  } catch (e) { C.me.error = e.message; C.me.items = []; }
  C.me.loading = false;
  if (parseRoute().name === 'me') render();
}

/** After a successful install, add it to the signed-in user's install history. */
function recordInstall(slug) {
  const p = S.bySlug.get(slug);
  if (!C.user || !p) return;
  cm('POST', `/api/me/install-history/${p.id}`, { revisionId: p.revisionId, firmwareSha256: (p.firmware && p.firmware.sha256) || '' }).catch(() => {});
  C.me.items = null;
}

/* ---------------- actions ---------------- */
Object.assign(actions, {
  'login': () => openLogin(),
  'login-tab': el => { C.dlg.tab = el.dataset.tab; C.dlg.error = ''; rerenderAccount(); },
  'login-channel': el => { C.dlg.channel = el.dataset.channel; C.dlg.error = ''; rerenderAccount(); },
  'send-code': () => sendCode(),
  'do-login': () => doLogin(),
  'sign-out': () => signOut(),
  'open-site': (el, ev) => { ev.preventDefault(); api('open-site', { target: el.dataset.target }).catch(showError); },
  'heart': el => toggleHeart(el.dataset.slug),
  'favorite': el => toggleFavorite(el.dataset.slug),
  'me-tab': el => { C.me = { tab: el.dataset.tab, items: null, loading: false, error: '' }; render(); },
  'comment-kind': el => { C.composer.body = ($('#comment-body') || {}).value || ''; C.composer.kind = el.dataset.kind; updateComments(S.detail.slug); },
  'comment-rate': el => { C.composer.body = ($('#comment-body') || {}).value || ''; C.composer.rating = Number(el.dataset.n); updateComments(S.detail.slug); },
  'comment-reply': el => {
    if (!requireLogin()) return;
    C.composer.body = ($('#comment-body') || {}).value || '';
    C.composer.replyTo = { id: Number(el.dataset.id), name: el.dataset.name };
    updateComments(S.detail.slug);
    const ta = $('#comment-body'); if (ta) ta.focus();
  },
  'comment-cancel-reply': (el, ev) => { ev.preventDefault(); C.composer.replyTo = null; updateComments(S.detail.slug); },
  'comment-send': () => sendComment(),
  'comment-like': async el => {
    const slug = S.detail.slug, c = findComment(slug, el.dataset.id);
    if (!c || !requireLogin()) return;
    try {
      const d = await cm(c.liked ? 'DELETE' : 'PUT', `/api/plays/${slug}/comments/${c.id}/like`);
      c.liked = !!d.liked; if (typeof d.likes === 'number') c.likes = d.likes;
      updateComments(slug);
    } catch (e) { toast(e.message, true); }
  },
  'comment-delete': async el => {
    const slug = S.detail.slug;
    if (!confirm(t('c_confirm_delete'))) return;
    try {
      await cm('DELETE', `/api/plays/${slug}/comments/${el.dataset.id}`);
      toast(t('c_deleted'));
      await loadComments(slug, true);
    } catch (e) { toast(e.message, true); }
  },
});

document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.matches && el.matches('[data-account-field]')) C.dlg.form[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  if (el.id === 'comment-body') C.composer.body = el.value;
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.matches && el.matches('input[type=checkbox][data-account-field]')) C.dlg.form[el.name] = el.checked;
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('[data-account-field]')) doLogin();
});

refreshMe();
