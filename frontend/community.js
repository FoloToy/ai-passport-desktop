'use strict';
/* AI Passport community account in the desktop app: sign in / register, likes, favorites,
   comments and the "我的" page. Requests go through the local /api/community endpoint, which
   keeps the site session (pkg/account). Loaded after app.js and shares its globals. */

Object.assign(I18N.zh, {
  nav_me: '我的', sign_in: '登录', sign_out: '退出登录', signed_in: '已登录', signed_out: '已退出登录', back: '返回',
  login_title: '登录', login_hero1: '把创意，', login_hero2: '变成别人拿在手里的玩法。', login_same: '和网站 ai-passport.folotoy.cn 使用同一个账号。',
  by_email: '邮箱登录', by_phone: '手机号登录', ch_phone: '手机号', ch_email: '邮箱', ph_phone: '请输入手机号',
  sms_code: '短信验证码', email_code: '邮箱验证码', ph_code: '6 位数字', send_code: '发送验证码', sending: '发送中…', code_sent: '验证码已发送',
  bad_phone: '请输入有效手机号，或包含国际区号的完整号码。', bad_email: '请输入有效的邮箱地址。', bad_code: '请输入 6 位验证码。',
  must_agree: '请先阅读并勾选同意用户服务协议和用户隐私协议。',
  agree_pre: '我已阅读并同意 ', terms: '用户服务协议', and: ' 和 ', privacy: '用户隐私协议', agree_post: '，未注册的账号将在首次登录时自动创建',
  cc_title: '国家或地区区号', cc_search: '搜索国家/地区或区号', cc_none: '没有找到',
  submit_login: '登录', welcome_back: n => `欢迎，${n}`, need_login: '请先登录', like: '点赞', liked: '已点赞', fav: '收藏', faved: '已收藏',
  tab_comments: '评论', comments_empty: '还没有评论，来写第一条吧。', comments_loading: '正在加载评论…', comments_failed: '评论加载失败',
  c_review: '评价', c_suggestion: '建议', c_ph: '说说你玩的感受，或者给作者提个建议…', c_send: '发布', c_sending: '正在发布…',
  c_rating: '评分', c_need_rating: '请选择 1–5 星', c_need_body: '请写点内容', c_posted: '已发布', c_pending_note: '已提交，审核通过后公开显示。',
  c_pending: '审核中', c_reply: '回复', c_replying: n => `回复 ${n}`, c_cancel: '取消', c_delete: '删除', c_deleted: '已删除', c_author: '作者',
  c_confirm_delete: '确定删除这条评论吗？', c_login_to_comment: '登录后可以发表评论', c_avg: (a, n) => `${a} 分 · ${n} 人评价`,
  me_title: '我的', me_loading: '正在读取账号…', me_signin_title: '登录玩法社区', me_signin_lead: '点赞、收藏、查看安装历史。与网站使用同一个账号。',
  followers: n => `关注者 ${n}`, me_profile: '编辑资料',
  me_messages: '消息', me_mine: '我的玩法', me_fav: '我的收藏', me_likes: '我的点赞', me_history: '安装历史',
  me_account: '账户设置', me_account_sub: '手机号、邮箱、密码，在网站上修改', me_settings_sub: '玩法存储目录、备份目录、语言、关于',
  terms_title: '用户服务协议', privacy_title: '用户隐私协议',
  me_empty: '这里还没有内容。', me_unavailable: '已下架', has_update: '有新版本', loading: '正在加载…',
  msg_read_all: '全部标为已读', msg_system: '系统消息', mine_note: '发布和管理玩法请使用网站创作中心。', creator_center: '创作中心',
});
Object.assign(I18N.en, {
  nav_me: 'Me', sign_in: 'Sign in', sign_out: 'Sign out', signed_in: 'Signed in', signed_out: 'Signed out', back: 'Back',
  login_title: 'Sign in', login_hero1: 'Turn your ideas ', login_hero2: 'into plays people hold in their hands.', login_same: 'Same account as the website ai-passport.folotoy.cn.',
  by_email: 'Email', by_phone: 'Mobile', ch_phone: 'Mobile number', ch_email: 'Email', ph_phone: 'Enter your mobile number',
  sms_code: 'SMS code', email_code: 'Email code', ph_code: '6 digits', send_code: 'Send code', sending: 'Sending…', code_sent: 'Code sent',
  bad_phone: 'Enter a valid mobile number, or the full number with its country code.', bad_email: 'Enter a valid email address.', bad_code: 'Enter the 6-digit code.',
  must_agree: 'Please read and agree to the Terms of Service and Privacy Policy first.',
  agree_pre: 'I have read and agree to the ', terms: 'Terms of Service', and: ' and the ', privacy: 'Privacy Policy', agree_post: '. New accounts are created on first sign-in.',
  cc_title: 'Country or region code', cc_search: 'Search a country, region or code', cc_none: 'No match',
  submit_login: 'Sign in', welcome_back: n => `Welcome, ${n}`, need_login: 'Please sign in first', like: 'Like', liked: 'Liked', fav: 'Save', faved: 'Saved',
  tab_comments: 'Comments', comments_empty: 'No comments yet. Be the first.', comments_loading: 'Loading comments…', comments_failed: "Couldn't load comments",
  c_review: 'Review', c_suggestion: 'Suggestion', c_ph: 'How did you like it? Or suggest something to the author…', c_send: 'Post', c_sending: 'Posting…',
  c_rating: 'Rating', c_need_rating: 'Choose 1–5 stars', c_need_body: 'Please write something', c_posted: 'Posted', c_pending_note: 'Sent. It will show once it is approved.',
  c_pending: 'Pending', c_reply: 'Reply', c_replying: n => `Replying to ${n}`, c_cancel: 'Cancel', c_delete: 'Delete', c_deleted: 'Deleted', c_author: 'Author',
  c_confirm_delete: 'Delete this comment?', c_login_to_comment: 'Sign in to comment', c_avg: (a, n) => `${a} · ${n} reviews`,
  me_title: 'Me', me_loading: 'Loading your account…', me_signin_title: 'Sign in to the community', me_signin_lead: 'Like and save plays, and see your install history. Same account as the website.',
  followers: n => `${n} followers`, me_profile: 'Edit profile',
  me_messages: 'Messages', me_mine: 'My plays', me_fav: 'Saved', me_likes: 'Liked', me_history: 'Install history',
  me_account: 'Account settings', me_account_sub: 'Change your mobile number, email or password on the website', me_settings_sub: 'Library folder, backup folder, language, about',
  terms_title: 'Terms of Service', privacy_title: 'Privacy Policy',
  me_empty: 'Nothing here yet.', me_unavailable: 'Removed', has_update: 'New version available', loading: 'Loading…',
  msg_read_all: 'Mark all as read', msg_system: 'System message', mine_note: 'To publish and manage plays, use the creator center on the website.', creator_center: 'Creator center',
});

const C = {
  user: undefined, // undefined: not checked yet; null: signed out
  dlg: { channel: 'phone', iso: 'CN', busy: false, sending: false, error: '', form: {}, cooldown: 0, picker: false, search: '' },
  unread: undefined,
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

/* ---------------- sign-in dialog ----------------
   Same as the Android app and the website: one screen, code sign-in by mobile number
   (with a country code) or email; a new account is created on the first sign-in. */
function openLogin() {
  C.dlg = { ...C.dlg, busy: false, error: '', picker: false, search: '' };
  S.modal = 'account';
  renderModal();
}

function country(iso) {
  return PHONE_COUNTRIES.find(c => c[0] === iso) || PHONE_COUNTRIES[0];
}

let regionNames = null;
function countryName(c) {
  if (lang === 'zh') return c[2];
  try {
    regionNames = regionNames || new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(c[0]) || c[0];
  } catch { return c[0]; }
}

const foldText = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Countries in display order with their index letter ('' for the pinned four). */
function countryEntries() {
  const pinned = PHONE_COUNTRIES.slice(0, 4).map(c => ({ c, group: '' }));
  let rest = PHONE_COUNTRIES.slice(4).map(c => ({ c, group: c[3] }));
  if (lang !== 'zh') {
    rest = rest.map(e => ({ c: e.c, name: foldText(countryName(e.c)) })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map(e => ({ c: e.c, group: e.name.charAt(0).toUpperCase() }));
  }
  return pinned.concat(rest);
}

/** E.164 ("+8613800000000") or '' when the number cannot be valid. A number typed with its
    own "+" or "00" prefix wins over the picked country, as on the website. */
function normalizePhone(value, iso) {
  if (!/^[+0-9\s().-]{1,80}$/.test(value)) return '';
  let s = value.replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (/^\+861[3-9]\d{9}$/.test(s)) return s;
  if (iso === 'CN' && /^(?:86)?1[3-9]\d{9}$/.test(s)) return '+86' + s.slice(-11);
  if (s.startsWith('+')) {
    if (s.startsWith('+86')) return '';
    return /^\+[1-9]\d{6,14}$/.test(s) ? s : '';
  }
  if (iso === 'CN') return '';
  const digits = s.replace(/^0+/, '');
  const full = '+' + country(iso)[1] + digits;
  return /^\+[1-9]\d{6,14}$/.test(full) && digits.length >= 4 ? full : '';
}

function field(name, type, ph, extra = '') {
  return `<input class="field" name="${name}" type="${type}" placeholder="${esc(ph)}" value="${esc(C.dlg.form[name] || '')}" data-account-field spellcheck="false" ${extra}>`;
}

function pickerBody() {
  const q = foldText(C.dlg.search).replace(/^\+/, '');
  const list = countryEntries().filter(e => !q || foldText(countryName(e.c)).includes(q) || foldText(e.c[2]).includes(q) || e.c[0].toLowerCase() === q || e.c[1].startsWith(q));
  let last = null;
  const rows = list.map(e => {
    const head = !q && e.group && e.group !== last ? `<div class="cc-group">${e.group}</div>` : '';
    last = e.group;
    return `${head}<button class="cc-row ${C.dlg.iso === e.c[0] ? 'on' : ''}" data-action="cc-pick" data-iso="${e.c[0]}"><span>${esc(countryName(e.c))}</span><b>+${e.c[1]}</b></button>`;
  }).join('');
  return `<div class="login cc-picker"><div class="cc-head"><button class="btn ghost small" data-action="cc-close">‹ ${t('back')}</button><b>${t('cc_title')}</b></div>
    <input class="field" id="cc-search" placeholder="${esc(t('cc_search'))}" value="${esc(C.dlg.search)}" spellcheck="false">
    <div class="cc-list">${rows || `<p class="hint">${t('cc_none')}</p>`}</div></div>`;
}

function accountBody() {
  const d = C.dlg;
  if (d.picker) return pickerBody();
  const phone = d.channel === 'phone';
  const seg = `<div class="segmented wide">${['email', 'phone'].map(c => `<button class="${d.channel === c ? 'active' : ''}" data-action="login-channel" data-channel="${c}">${t('by_' + c)}</button>`).join('')}</div>`;
  const cc = country(d.iso || 'CN');
  const target = phone
    ? `<div class="phone-row"><button class="cc-btn" data-action="cc-open">+${cc[1]} ▾</button>${field('phone', 'tel', t('ph_phone'), 'autocomplete="tel-national"')}</div>`
    : field('email', 'email', 'name@example.com', 'autocomplete="email"');
  const f = d.form;
  const tl = lang === 'en' ? 'terms-en' : 'terms', pl = lang === 'en' ? 'privacy-en' : 'privacy';
  return `<div class="login">
    <h3 class="login-hero">${t('login_hero1')}<em>${t('login_hero2')}</em></h3><p class="hint">${t('login_same')}</p>
    ${seg}
    <label class="lbl">${t(phone ? 'ch_phone' : 'ch_email')}</label>${target}
    <label class="lbl">${t(phone ? 'sms_code' : 'email_code')}</label>
    <div class="code-row">${field('code', 'text', t('ph_code'), 'inputmode="numeric" maxlength="6" autocomplete="one-time-code"')}<button class="btn" data-action="send-code" ${d.cooldown > 0 || d.busy ? 'disabled' : ''}>${d.cooldown > 0 ? d.cooldown + 's' : d.sending ? t('sending') : t('send_code')}</button></div>
    ${d.error ? `<div class="notice red">${esc(d.error)}</div>` : ''}
    <button class="btn primary large wide" data-action="do-login" ${d.busy ? 'disabled' : ''}>${t('submit_login')}</button>
    <label class="check small"><input type="checkbox" name="terms" data-account-field ${f.terms ? 'checked' : ''}> <span>${t('agree_pre')}<a href="#" data-action="open-site" data-target="${tl}">${t('terms')}</a>${t('and')}<a href="#" data-action="open-site" data-target="${pl}">${t('privacy')}</a>${t('agree_post')}</span></label>
  </div>`;
}

function rerenderAccount() {
  const b = $('#modal-body');
  if (b && S.modal === 'account') b.innerHTML = accountBody();
  const s = $('#cc-search');
  if (s && C.dlg.picker) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}

function startCooldown() {
  C.dlg.cooldown = 60;
  const tick = () => {
    C.dlg.cooldown--;
    const btn = document.querySelector('[data-action="send-code"]');
    if (btn) { btn.textContent = C.dlg.cooldown > 0 ? C.dlg.cooldown + 's' : t('send_code'); btn.disabled = C.dlg.cooldown > 0; }
    if (C.dlg.cooldown > 0) setTimeout(tick, 1000);
  };
  setTimeout(tick, 1000);
}

/** The account to send: {phone} in E.164 or {email}; '' when invalid. */
function loginTarget() {
  const d = C.dlg, f = d.form;
  if (d.channel === 'phone') {
    const p = normalizePhone((f.phone || '').trim(), d.iso || 'CN');
    return p ? { phone: p } : null;
  }
  const e = (f.email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? { email: e } : null;
}

async function sendCode() {
  const d = C.dlg;
  const target = loginTarget();
  if (!target) { d.error = t(d.channel === 'phone' ? 'bad_phone' : 'bad_email'); rerenderAccount(); return; }
  d.busy = true; d.sending = true; d.error = ''; rerenderAccount();
  try {
    const r = await cm('POST', '/api/auth/code-login/verification-code/request', { ...target, channel: d.channel, locale: lang === 'en' ? 'en' : 'zh' });
    toast(r.message || t('code_sent'));
    startCooldown();
  } catch (e) { d.error = e.message; }
  d.busy = false; d.sending = false; rerenderAccount();
}

async function doLogin() {
  const d = C.dlg, f = d.form;
  d.error = '';
  const target = loginTarget();
  const code = (f.code || '').trim();
  if (!target) d.error = t(d.channel === 'phone' ? 'bad_phone' : 'bad_email');
  else if (!/^\d{6}$/.test(code)) d.error = t('bad_code');
  else if (!f.terms) d.error = t('must_agree');
  if (d.error) { rerenderAccount(); return; }
  d.busy = true; rerenderAccount();
  try {
    const r = await cm('POST', '/api/auth/code-login', { ...target, channel: d.channel, verification_code: code, terms_accepted: true, locale: lang === 'en' ? 'en' : 'zh' });
    C.user = r.user || C.user;
    await refreshMe();
    C.dlg = { channel: d.channel, iso: d.iso, busy: false, error: '', form: {}, cooldown: 0, picker: false, search: '' };
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
  C.user = null; C.eng = {}; C.me.items = null; C.unread = undefined;
  toast(t('signed_out'));
  render();
}

/* ---------------- likes and favorites ---------------- */
const playKind = p => (p.source === 'official' || p.official ? 'official' : 'community');

/** Counts a view of a play's detail page, as the website and the Android app do. The site
    ignores repeats from the same visitor; offline the request simply fails. */
function recordView(p) {
  if (!p) return;
  cm('POST', `/api/engagement/${playKind(p)}/${p.slug}/view`, {}).catch(() => {});
}

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

/* ---------------- 我的 ----------------
   Laid out like the Android app: account card, the member lists, then settings. */
const ME_LISTS = ['messages', 'mine', 'fav', 'likes', 'history'];

function renderMe() {
  const r = parseRoute();
  if (r.list) return renderMeList(r.list);
  const u = C.user;
  if (u && C.unread === undefined) { C.unread = 0; loadUnread(); }
  let account;
  if (u === undefined) account = `<section class="panel"><p class="hint">${t('me_loading')}</p></section>`;
  else if (!u) {
    account = `<section class="panel me-signin"><h2>${t('me_signin_title')}</h2><p>${t('me_signin_lead')}</p>
      <button class="btn primary large" data-action="login">${t('sign_in')}</button></section>`;
  } else {
    const av = u.avatarUrl ? `<img class="me-avatar" src="${esc(siteUrl(u.avatarUrl))}" alt="">` : `<span class="me-avatar">${esc(userName(u).slice(0, 1).toUpperCase())}</span>`;
    const sub = [u.maskedPhone || u.email, typeof u.followers === 'number' ? t('followers', u.followers) : ''].filter(Boolean).join(' · ');
    account = `<section class="panel me-head">${av}<div><h2>${esc(userName(u))}</h2><p>${esc(sub)}</p></div>
      <button class="btn ghost small" data-action="open-site" data-target="account">${t('me_profile')} ↗</button></section>`;
  }
  const row = (k, extra = '') => `<a class="list-row" href="#/me/${k}" ${u ? '' : 'data-action="login"'}><span>${t('me_' + k)}</span>${extra}<i>›</i></a>`;
  const lists = `<section class="panel list-card">${row('messages', C.unread ? `<span class="badge">${C.unread}</span>` : '')}${row('mine')}${row('fav')}${row('likes')}${row('history')}</section>`;
  const tl = lang === 'en' ? 'terms-en' : 'terms', pl = lang === 'en' ? 'privacy-en' : 'privacy';
  const settings = `<section class="panel list-card">
    ${u ? `<a class="list-row" href="#" data-action="open-site" data-target="account"><span>${t('me_account')}</span><small>${t('me_account_sub')}</small><i>↗</i></a>` : ''}
    <a class="list-row" href="#/settings"><span>${t('nav_settings')}</span><small>${t('me_settings_sub')}</small><i>›</i></a>
    <a class="list-row" href="#" data-action="open-site" data-target="${tl}"><span>${t('terms_title')}</span><i>↗</i></a>
    <a class="list-row" href="#" data-action="open-site" data-target="${pl}"><span>${t('privacy_title')}</span><i>↗</i></a>
    ${u ? `<button class="list-row danger" data-action="sign-out"><span>${t('sign_out')}</span></button>` : ''}
  </section>`;
  return `<div class="settings me"><h1>${t('me_title')}</h1>${account}${lists}${settings}</div>`;
}

async function loadUnread() {
  try {
    const d = await cm('GET', '/api/me/notifications', undefined, 'category=all&status=unread&limit=30');
    C.unread = d.unreadCount || (d.notifications || []).length || 0;
    if (parseRoute().name === 'me') render();
  } catch { /* keep 0 */ }
}

function renderMeList(kind) {
  if (!ME_LISTS.includes(kind)) return '';
  const back = `<a class="btn ghost small" href="#/me">‹ ${t('me_title')}</a>`;
  if (!C.user) {
    return `<div class="settings me">${back}<h1>${t('me_' + kind)}</h1><section class="panel me-signin"><p>${t('me_signin_lead')}</p><button class="btn primary" data-action="login">${t('sign_in')}</button></section></div>`;
  }
  if (C.me.tab !== kind) C.me = { tab: kind, items: null, loading: false, error: '' };
  if (!C.me.items && !C.me.loading) loadMe();
  let list;
  if (C.me.loading && !C.me.items) list = `<p class="hint">${t('loading')}</p>`;
  else if (C.me.error) list = `<div class="notice red">${esc(C.me.error)}</div>`;
  else if (!C.me.items || !C.me.items.length) list = `<p class="hint">${t('me_empty')}</p>`;
  else if (kind === 'messages') list = `<div class="msg-list">${C.me.items.map(msgItem).join('')}</div>`;
  else if (kind === 'mine') list = `<div class="msg-list">${C.me.items.map(mineItem).join('')}</div>`;
  else list = `<div class="me-list">${C.me.items.map(it => meItem(it, kind)).join('')}</div>`;
  const tools = kind === 'messages' && C.me.items && C.me.items.some(m => !m.readAt) ? `<button class="btn small" data-action="msg-read-all">${t('msg_read_all')}</button>` : '';
  const note = kind === 'mine' ? `<p class="lead">${t('mine_note')} <a href="#" data-action="open-site" data-target="creator">${t('creator_center')} ↗</a></p>` : '';
  return `<div class="settings me">${back}<div class="me-list-head"><h1>${t('me_' + kind)}</h1>${tools}</div>${note}${list}</div>`;
}

const textOf = v => (v && typeof v === 'object' ? pick(v) : v || '');
const dateOf = s => (s ? new Date(s).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') : '');

function msgItem(m) {
  return `<div class="msg ${m.readAt ? '' : 'unread'}" ${m.readAt ? '' : `data-action="msg-read" data-id="${m.id}"`}>
    <div><b>${esc(textOf(m.title) || t('msg_system'))}</b><small>${esc(dateOf(m.createdAt))}</small></div>
    <p>${esc(textOf(m.body))}</p></div>`;
}

const SUBMISSION_STATUS = {
  zh: { pending: '审核中', approved: '已通过', published: '已发布', rejected: '未通过', draft: '草稿', withdrawn: '已撤回' },
  en: { pending: 'In review', approved: 'Approved', published: 'Published', rejected: 'Not approved', draft: 'Draft', withdrawn: 'Withdrawn' },
};
function mineItem(s) {
  return `<div class="msg"><div><b>${esc(textOf(s.title) || s.slug || '—')}</b><small>${esc(SUBMISSION_STATUS[lang][s.status] || s.status || '')}</small></div>
    ${s.updatedAt || s.createdAt ? `<p>${esc(dateOf(s.updatedAt || s.createdAt))}</p>` : ''}</div>`;
}

function meItem(it, kind) {
  const slug = it.slug || (it.play && it.play.slug) || '';
  const local = S.bySlug.get(slug) || (it.id && S.byId.get(Number(it.id)));
  const title = local ? pick(local.title) : textOf(it.title || (it.play && it.play.title)) || slug || '—';
  const when = kind === 'history' ? (it.hasUpdate ? t('has_update') : dateOf(it.installedAt)) : dateOf(it.createdAt || it.created_at);
  const img = local && (local.thumb || local.cover) ? `<img src="${media(local.thumb || local.cover)}" alt="">` : '<span></span>';
  return `<button class="me-item" ${local ? `data-action="open-play" data-slug="${esc(local.slug)}"` : 'disabled'}>${img}<b>${esc(title)}</b>${!local || it.available === false ? `<small>${t('me_unavailable')}</small>` : ''}${when ? `<small>${esc(when)}</small>` : ''}</button>`;
}

async function loadMe() {
  C.me.loading = true; C.me.error = '';
  const path = {
    messages: ['/api/me/notifications', 'category=all&status=all&limit=30'],
    mine: ['/api/me/submissions', ''],
    fav: ['/api/me/follows', 'kind=play&page=1'],
    likes: ['/api/me/likes', 'page=1'],
    history: ['/api/me/install-history', 'page=1'],
  }[C.me.tab];
  try {
    const d = await cm('GET', path[0], undefined, path[1]);
    C.me.items = d.items || d.notifications || d.submissions || d.history || [];
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
  'login-channel': el => { C.dlg.channel = el.dataset.channel; C.dlg.error = ''; C.dlg.form = { terms: C.dlg.form.terms }; rerenderAccount(); },
  'cc-open': () => { C.dlg.picker = true; C.dlg.search = ''; rerenderAccount(); },
  'cc-close': () => { C.dlg.picker = false; rerenderAccount(); },
  'cc-pick': el => { C.dlg.iso = el.dataset.iso; C.dlg.picker = false; rerenderAccount(); },
  'msg-read': async el => {
    const m = (C.me.items || []).find(x => String(x.id) === el.dataset.id);
    if (!m || m.readAt) return;
    m.readAt = new Date().toISOString();
    C.unread = Math.max(0, (C.unread || 1) - 1);
    render();
    cm('PATCH', `/api/me/notifications/${m.id}/read`).catch(() => {});
  },
  'msg-read-all': async () => {
    try { await cm('PATCH', '/api/me/notifications/read-all', undefined, 'category=all'); } catch (e) { toast(e.message, true); return; }
    for (const m of C.me.items || []) m.readAt = m.readAt || new Date().toISOString();
    C.unread = 0;
    render();
  },
  'send-code': () => sendCode(),
  'do-login': () => doLogin(),
  'sign-out': () => signOut(),
  'open-site': (el, ev) => { ev.preventDefault(); api('open-site', { target: el.dataset.target }).catch(showError); },
  'heart': el => toggleHeart(el.dataset.slug),
  'favorite': el => toggleFavorite(el.dataset.slug),
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
  if (el.id === 'cc-search') { C.dlg.search = el.value; rerenderAccount(); }
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.matches && el.matches('input[type=checkbox][data-account-field]')) C.dlg.form[el.name] = el.checked;
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('[data-account-field]') && !C.dlg.picker) doLogin();
});

refreshMe();
