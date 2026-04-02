// AirdriftSignals Comment System v15
// https://airdriftsignals.com

var allComments  = [];
var currentUser  = null;
var googleSignInInProgress = false;
var GOOGLE_CLIENT_ID  = ‘25837822849-luu4qkdt8ojlpgsnefl7387743r808cl.apps.googleusercontent.com’;
var MODERATOR_EMAIL   = ‘helloimstefan@gmail.com’;
var searchQuery       = ‘’;
var currentFilter     = ‘all’;
var sessionNewCommentId      = null;
var sessionSortSnapshot      = null; // hot sort position snapshot – prevents re-sort on vote
var sessionSortSnapshotFilter = null;
var visibleCount     = 20;  // Show More: how many top-level comments are visible
var REPLIES_PER_PAGE  = 10;
var REPLIES_PREVIEW   = 3;
var replyPages        = {};  // tracks current reply page per comment id
var threadStack       = [];  // stack of {commentId, replyId} for thread navigation
var COMMENT_TYPE_KEY  = ‘airdriftCommentTypes:’ + window.location.pathname;
var commentTypes      = {};  // { email: ‘article’ | ‘interview’ } for this page
var NOTIF_KEY         = ‘airdriftNotifications’;
var NOTIF_CLEARED_KEY  = ‘airdriftNotificationsCleared’;
var SUBSCRIPTIONS_KEY  = ‘airdriftSubscriptions’; // { ‘pageUrl’: true/false }
var notifications     = [];  // [{ id, pageUrl, pageTitle, commentId, replyId, fromName, preview, time, read }]
var clearedNotifIds   = {};  // permanent record of all notif IDs ever seen/cleared
var repliesExpanded   = {};  // tracks expanded state per comment id
var branchPages       = {};  // tracks current page per nested branch
var VOTES_KEY         = ‘airdriftVotes:’ + window.location.pathname;
var userVotes         = {};
var FLAIRS_KEY      = ‘airdriftFlairs’;
var FLAIRS_PAGE_KEY = ‘airdriftFlairs:’ + window.location.pathname;
var flairData       = {};
var flairPageData   = {};
// FLAIR_CODES: read from Blogger config block if defined, else use defaults
window.FLAIR_CODES = window.FLAIR_CODES || {
supporter:  ‘CODE_SUPPORTER’,
subscriber: ‘CODE_SUBSCRIBER’,
newcomer:   ‘CODE_DRIFTER’,
member:     ‘CODE_MEMBER’,
collector:  ‘CODE_COLLECTOR’,
artist:     ‘CODE_ARTIST’,
writer:     ‘CODE_WRITER’
};
var FLAIR_CODES = window.FLAIR_CODES;
var FLAIR_DISPLAY = {
newcomer:   { symbol: ‘꩜’, label: ‘Drifter’,       css: ‘flair-newcomer’ },
supporter:  { symbol: ‘★’, label: ‘Supporter’,      css: ‘flair-supporter’ },
subscriber: { symbol: ‘✵’, label: ‘Subscriber’,     css: ‘flair-subscriber’ },
member:     { symbol: ‘◆’, label: ‘Member’,          css: ‘flair-member’ },
collector:  { symbol: ‘❖’, label: ‘Collector’,       css: ‘flair-collector’ },
artist:     { symbol: ‘✦’, label: ‘Featured Artist’, css: ‘flair-artist’ },
writer:     { symbol: ‘✒’, label: ‘Featured Writer’, css: ‘flair-writer’ }
};

// ── FEATURE TIER GATES ───────────────────────────────
// Edit these arrays to change which tiers unlock each feature.
var REACTION_TIERS    = [‘supporter’,‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];   // can add reactions
var BIO_TIERS         = [‘supporter’,‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];   // can set bio
var FORMATTING_TIERS  = [‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];               // markdown formatting
var PRIORITY_TIERS    = [‘member’,‘collector’,‘artist’,‘writer’];                            // reply priority border
var COLOR_BASIC_TIERS = [‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];               // basic username colors
var COLOR_PREMIUM_TIERS = [‘member’,‘collector’,‘artist’,‘writer’];                         // premium username colors

var USERNAME_COLORS_BASIC = [
{ label:‘Coral’,     value:’#e87060’ },
{ label:‘Sky’,       value:’#60a8e8’ },
{ label:‘Sage’,      value:’#7ab87a’ },
{ label:‘Lavender’,  value:’#a88cd4’ },
{ label:‘Amber’,     value:’#d4a840’ },
{ label:‘Default’,   value:’’ },
];
var USERNAME_COLORS_PREMIUM = [
{ label:‘Gold’,         value:’#b89f37’ },
{ label:‘Deep Teal’,    value:’#2aada0’ },
{ label:‘Rose Gold’,    value:’#d4807a’ },
{ label:‘Electric’,     value:’#4a8aff’ },
{ label:‘Crimson’,      value:’#c03040’ },
{ label:‘Forest’,       value:’#3a8a50’ },
];

var REACTIONS_AVAILABLE = [‘🔥’,‘💯’,‘🧡’,‘😹’,‘🎵’,‘👀’,‘🦾’];

var PAGE_KEY = ‘airdriftComments:’ + window.location.pathname;
// Session-only store for shadow-banned user’s own comments (never saved to localStorage)
var shadowSessionComments = {}; // { pageUrl: [comment, …] }

// Show widget only on blog posts (not homepage or static pages)
(function() {
var path = window.location.pathname;
var isHome = (path === ‘/’ || path === ‘/index.html’ || path === ‘’);
var isPage = /^/p//.test(path);
var isSearch = /^/search/.test(path);
var isLabel = /^/search/label/.test(path);
if (isHome || isPage || isSearch || isLabel) {
var widget = document.getElementById(‘airdrift-comments’);
if (widget) widget.style.display = ‘none’;
}
})();

function loadComments() {
var stored = localStorage.getItem(PAGE_KEY);
if (stored) {
try { allComments = JSON.parse(stored); } catch(e) { allComments = []; }
}
// Apply any saved highlight state to comments and replies
try {
var hl = JSON.parse(localStorage.getItem(‘airdriftHighlights’) || ‘{}’);
allComments.forEach(function(c) {
if (hl[c.id]) c.highlighted = true;
(c.replies || []).forEach(function(r) { if (hl[r.id]) r.highlighted = true; });
});
} catch(e) {}
// If current user is banned, inject their session-only shadow comments into the view
// These never touch localStorage – they vanish on sign-out
if (currentUser && isUserBanned(currentUser.email)) {
var mySession = shadowSessionComments[window.location.pathname] || [];
mySession.forEach(function(sc) {
if (!allComments.find(function(c) { return c.id === sc.id; })) {
allComments.push(sc);
}
});
}
}

function saveComments() {
// Strip session-only shadow comments before persisting – they must never reach localStorage
var toSave = allComments.filter(function(c) { return !c.shadowSession; });
localStorage.setItem(PAGE_KEY, JSON.stringify(toSave));
}

function loadVotes() {
var stored = localStorage.getItem(VOTES_KEY);
if (stored) {
try { userVotes = JSON.parse(stored); } catch(e) { userVotes = {}; }
}
}

function saveVotes() {
localStorage.setItem(VOTES_KEY, JSON.stringify(userVotes));
}

function loadFlairs() {
var s = localStorage.getItem(FLAIRS_KEY);
if (s) { try { flairData = JSON.parse(s); } catch(e) { flairData = {}; } }
var sp = localStorage.getItem(FLAIRS_PAGE_KEY);
if (sp) { try { flairPageData = JSON.parse(sp); } catch(e) { flairPageData = {}; } }
}

function saveFlairs(scope) {
if (scope === ‘page’) {
localStorage.setItem(FLAIRS_PAGE_KEY, JSON.stringify(flairPageData));
} else {
localStorage.setItem(FLAIRS_KEY, JSON.stringify(flairData));
}
// PATREON API CONTRACT: when Patreon tier sync is implemented, it must ONLY write
// to flairData (FLAIRS_KEY / all-pages). It must NEVER write to flairPageData
// (FLAIRS_PAGE_KEY) so that manually assigned page-specific flairs are preserved.
// getUserFlair() checks flairPageData first, so page-specific always wins.
// GAS HOOKUP: sync flair assignments so any device shows correct flair:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveFlairs’, scope: scope, flairData: flairData,
//     flairPageData: flairPageData, pageUrl: window.location.pathname }) }).catch(function(){});
}

function loadCommentTypes() {
var s = localStorage.getItem(COMMENT_TYPE_KEY);
if (s) { try { commentTypes = JSON.parse(s); } catch(e) { commentTypes = {}; } }
}

function saveCommentTypes() {
localStorage.setItem(COMMENT_TYPE_KEY, JSON.stringify(commentTypes));
}

function getCommentType(email) {
return commentTypes[email] || null;
}

// Check if current user can reply to a comment by authorEmail
function canReply(authorEmail) {
if (!currentUser) return true; // will be caught by sign-in check
if (currentUser.email === MODERATOR_EMAIL) return true; // author can always reply
var type = getCommentType(authorEmail);
if (!type) return true; // no restriction set
var userTier = flairPageData[currentUser.email] || flairData[currentUser.email];
if (type === ‘article’) {
// Drifter has no privileges – only tiers above it can reply on restricted pages
return !!userTier && userTier !== ‘newcomer’;
}
if (type === ‘interview’) {
return [‘member’,‘collector’,‘artist’,‘writer’].indexOf(userTier) !== -1;
}
return true;
}

function canMentionUser(mentionedEmail) {
// Moderator can mention anyone
if (currentUser && currentUser.email === MODERATOR_EMAIL) return true;
return canReply(mentionedEmail);
}

function getReplyBlockedMessage(authorEmail) {
var type = getCommentType(authorEmail);
if (type === ‘article’)   return ‘Upgrade to any tier to reply or mention.’;
if (type === ‘interview’) return ‘Upgrade to a Member tier to reply or mention.’;
return ‘’;
}

function getUserFlair(email) {
var tier = flairPageData[email] || flairData[email];
if (!tier || !FLAIR_DISPLAY[tier]) return ‘’;
var f   = FLAIR_DISPLAY[tier];
// Per-user stamp takes priority; fall back to tier-wide override
var ovr = FLAIR_COLOR_BY_USER[email] || FLAIR_COLOR_OVERRIDES[tier];
// Only apply color override styles when a custom color is explicitly set.
// If ovr only has a tooltip, leave the CSS gradient intact.
var hasColor = ovr && ovr.color && ovr.color.length > 0;
var symStyle = hasColor
? ’ style=“color:’ + ovr.color + ‘;-webkit-text-fill-color:’ + ovr.color + ‘;background-image:none;filter:none;”’
: ‘’;
var txtStyle = hasColor
? ’ style=“color:’ + ovr.color + ‘;-webkit-text-fill-color:’ + ovr.color + ‘;background-image:none;”’
: ‘’;
var symTitle = (ovr && ovr.tooltip) ? ’ title=”’ + escapeHTML(ovr.tooltip) + ‘”’ : ‘’;
return ‘<span class="flair ' + f.css + '">’ +
‘<span class=“flair-symbol”’ + symStyle + symTitle + ‘>’ + f.symbol + ‘</span>’ +
‘<span class=“flair-text”’  + txtStyle  + ‘>’ + f.label + ‘</span>’ +
getTenureBadge(email) +
‘</span>’;
}

function loadCurrentUser() {
var stored = sessionStorage.getItem(‘airdriftCurrentUser’) || localStorage.getItem(‘airdriftCurrentUser’);
if (stored) {
try {
currentUser = JSON.parse(stored);
// Apply any username override from map
if (currentUser && usernameMap[currentUser.email]) {
currentUser.name = usernameMap[currentUser.email];
}
// Keep both in sync
sessionStorage.setItem(‘airdriftCurrentUser’, JSON.stringify(currentUser));
localStorage.setItem(‘airdriftCurrentUser’, JSON.stringify(currentUser));
} catch(e) { currentUser = null; }
}
}

function updateUI() {
if (currentUser) {
document.getElementById(‘auth-section’).style.display = ‘none’;
document.getElementById(‘user-info-section’).style.display = ‘block’;
document.getElementById(‘signout-btn’).style.display = ‘flex’;
document.getElementById(‘flair-input-section’).style.display = ‘flex’;
document.getElementById(‘flair-admin-panel’).style.display =
currentUser.email === MODERATOR_EMAIL ? ‘block’ : ‘none’;

```
  var modBtn = document.getElementById('mod-dashboard-btn');
  if (modBtn) modBtn.style.display = isMod(currentUser.email) ? 'inline-block' : 'none';
  updateDashboardBtn();
  renderNotifBell();
  renderModDashboard();
  updateSubscribeBtn();
  updateHeaderProfileBtn();
  updateViewerCount();
  updateOpenDmBtn();
  // Init sticky after form is visible
  setTimeout(initStickyCommentBox, 100);
} else {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('user-info-section').style.display = 'none';
  document.getElementById('signout-btn').style.display = 'none';
  document.getElementById('flair-input-section').style.display = 'none';
  document.getElementById('flair-admin-panel').style.display = 'none';

  var bellEl = document.getElementById('notif-bell');
  if (bellEl) bellEl.style.display = 'none';
  var vBtn = document.getElementById('notif-view-btn');
  if (vBtn) vBtn.style.display = 'none';
  var sticky = document.getElementById('sticky-comment-box');
  if (sticky) sticky.style.display = 'none';
  var subBtn = document.getElementById('subscribe-btn');
  if (subBtn) subBtn.style.display = 'none';
  var hpBtn = document.getElementById('header-profile-btn');
  if (hpBtn) hpBtn.style.display = 'none';
  var modBtn2 = document.getElementById('mod-dashboard-btn');
  if (modBtn2) modBtn2.style.display = 'none';
}
```

}

function signOut() {
currentUser = null;
// Clear in-memory notifications so next user doesn’t see previous user’s
notifications   = [];
clearedNotifIds = {};
sessionStorage.removeItem(‘airdriftCurrentUser’);
localStorage.removeItem(‘airdriftCurrentUser’);
if (window.google && window.google.accounts) {
google.accounts.id.disableAutoSelect();
}
if (notifPollInterval) { clearInterval(notifPollInterval); notifPollInterval = null; }
stopTypingPoll();
sessionNewCommentId = null;
sessionSortSnapshot = null; sessionSortSnapshotFilter = null;
dashboardSeenThisSession = false;
// Clear in-memory shadow session comments – banned user’s comments vanish on sign-out
shadowSessionComments = {};
// Also purge any shadow comments from allComments in memory
allComments = allComments.filter(function(c) { return !c.shadowSession; });
// Clear DM state
activeDmEmail = null; activeDmThread = null; activeDmMod = null;
closeDmWindow();
// Clear toast key for this user so next sign-in on this tab shows toast
if (currentUser) { var tk = ‘airdriftToastShown:’ + currentUser.email; sessionStorage.removeItem(tk); }
sessionStorage.removeItem(‘airdriftDashSeen’);
updateUI();
}

// Google Sign-In
function signInWithGoogle() {
if (googleSignInInProgress) return;
if (!window.google || !window.google.accounts) {
alert(‘Google Sign-In is still loading. Please try again in a moment.’);
return;
}
googleSignInInProgress = true;
try {
google.accounts.id.cancel();
google.accounts.id.initialize({
client_id: GOOGLE_CLIENT_ID,
callback: handleGoogleSignInResponse,
ux_mode: ‘popup’,
auto_select: false
});
google.accounts.id.prompt(function(notification) {
googleSignInInProgress = false;
if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
// Prompt was dismissed – fall back to renderButton
google.accounts.id.renderButton(
document.getElementById(‘google-signin-btn’),
{ theme: ‘filled_black’, size: ‘large’, text: ‘signin_with’, shape: ‘rectangular’, width: 220 }
);
}
});
} catch(e) {
googleSignInInProgress = false;
console.error(‘Google Sign-In error:’, e);
alert(‘Error signing in. Please try again.’);
}
}

function handleGoogleSignInResponse(response) {
if (response.credential) {
try {
var base64Url = response.credential.split(’.’)[1];
var base64 = base64Url.replace(/-/g, ‘+’).replace(/_/g, ‘/’);
var jsonPayload = decodeURIComponent(atob(base64).split(’’).map(function(c) {
return ‘%’ + (‘00’ + c.charCodeAt(0).toString(16)).slice(-2);
}).join(’’));
var decoded = JSON.parse(jsonPayload);
var googleName = decoded.name;
loadUsernames();
var chosenName = usernameMap[decoded.email] || googleName;
currentUser = { name: chosenName, email: decoded.email, provider: ‘google’ };
dismissWelcomeModal();
sessionStorage.setItem(‘airdriftCurrentUser’, JSON.stringify(currentUser));
localStorage.setItem(‘airdriftCurrentUser’, JSON.stringify(currentUser));
updateUI();
loadRateTimestamps();
showSignedInToast(true); // force show on fresh sign-in
loadNotifications();
scanForNotifications();
scanForMentionNotifications();
startNotifPolling();
var warnCount=localStorage.getItem(‘airdriftWarn:’+decoded.email);
if(warnCount){localStorage.removeItem(‘airdriftWarn:’+decoded.email);
setTimeout(function(){alert(‘You have received a warning from the moderator. You now have ‘+warnCount+’ warning’+(parseInt(warnCount)>1?‘s’:’’)+’. ’);},1000);}
var reinstated=localStorage.getItem(‘airdriftReinstate:’+decoded.email);
if(reinstated){localStorage.removeItem(‘airdriftReinstate:’+decoded.email);
setTimeout(function(){alert(‘Your account has been reinstated. Welcome back!’);},1000);}
startTypingPoll();
// Show username modal only if never seen before
if (!usernameMap[decoded.email + ‘_seen’]) {
showUsernameModal(googleName);
}
} catch(e) {
console.error(‘Error processing Google sign-in:’, e);
}
}
}

// Init
function initComments() {
var input = document.getElementById(‘comment-input’);
if (input) {
input.addEventListener(‘input’, function() {
document.getElementById(‘char-count’).textContent = this.value.length;
});
}
loadCurrentUser();
loadComments();
loadVotes();
loadFlairs();
loadCommentTypes();
loadUsernames();
scanPostBodyMentions(); // replace @[Name] in post body with clickable profile links
loadNotifications();
loadFilterData();
loadFlairTenure();
loadRateTimestamps();
loadPendingItems();
loadReportedItems();
updateUI();
if (currentUser) showSignedInToast(false); // suppress if already shown this session
if (currentUser) updateSubscribeBtn();
renderComments();
// First visit (no WELCOME_SEEN_KEY) → welcome modal on scroll
// Return visits → sign-in banner
// Signed-in → neither
if (!currentUser) {
var isFirstVisit = !localStorage.getItem(WELCOME_SEEN_KEY);
if (isFirstVisit) {
// First ever visit – trigger welcome modal on scroll (22% threshold)
var welcomeScrollHandler = function() {
var scrolled = window.scrollY || window.pageYOffset;
var docH = document.documentElement.scrollHeight - window.innerHeight;
if (docH <= 0) { showWelcomeModal(); window.removeEventListener(‘scroll’, welcomeScrollHandler); return; }
var pct = scrolled / docH;
if (pct >= 0.22) {
showWelcomeModal();
window.removeEventListener(‘scroll’, welcomeScrollHandler);
}
};
window.addEventListener(‘scroll’, welcomeScrollHandler, { passive: true });
} else {
// Return visitor – show the sign-in banner instead
showSignInBanner();
}
}
var mainTa = document.getElementById(‘comment-input’);
if (mainTa) {
setupMentionListener(mainTa);
mainTa.addEventListener(‘input’, function() { onTypingInput(‘main’, ‘main’); });
}
if (currentUser) { loadNotifications(); scanForNotifications(); scanForMentionNotifications(); }
startNotifPolling();
// Handle cross-page notification scroll
var pendingScroll = sessionStorage.getItem(‘airdriftScrollTo’);
if (pendingScroll) {
sessionStorage.removeItem(‘airdriftScrollTo’);
try {
var scrollData = JSON.parse(pendingScroll);
// Find the parent comment index using same sort order as renderComments
var sorted = getSortedComments();
var targetReplyId = scrollData.targetId && scrollData.targetId.indexOf(‘reply-’) === 0
? scrollData.targetId.replace(‘reply-’, ‘’) : null;
var idx = sorted.findIndex(function(c) {
if (c.id === scrollData.commentId) return true;
return (c.replies || []).some(function(r) { return r.id === targetReplyId; });
});
if (idx !== -1) visibleCount = Math.max(visibleCount, idx + 1);
// Let expandReplyChain handle rendering – no premature renderComments() here
expandReplyChain(scrollData.commentId, targetReplyId, function() {
scrollToElement(scrollData.targetId);
});
} catch(e) {}
}
}

if (document.readyState === ‘loading’) {
document.addEventListener(‘DOMContentLoaded’, initComments);
} else {
initComments();
}

function submitComment() {
if (!currentUser) { showSignInModal(‘Sign in to join the conversation.’); return; }
var text = document.getElementById(‘comment-input’).value.trim();
if (!text) return;
if (!isMod(currentUser.email)) {
var rateErr = checkCommentRateLimit();
if (rateErr) { alert(rateErr); return; }
}

```
var comment = {
  id: Date.now().toString(),
  name: currentUser.name,
  email: currentUser.email,
  text: text,
  time: new Date().toISOString(),
  upvotes: 0,
  downvotes: 0
};

var isBanned = isUserBanned(currentUser.email);

if (isBanned) {
  // Shadow banned: comment is session-only, never touches localStorage
  // Spam filter is completely silent for banned users -- no alerts, no mod queue
  comment.shadowSession = true; // marker so saveComments strips it
  allComments.push(comment);
  // Store in session memory keyed by page
  var page = window.location.pathname;
  if (!shadowSessionComments[page]) shadowSessionComments[page] = [];
  shadowSessionComments[page].push(comment);
  // Do NOT saveComments -- never persist banned user comments
  recordCommentTimestamp(); // still rate-limit them
  document.getElementById('comment-input').value = '';
  document.getElementById('char-count').textContent = '0';
  sessionNewCommentId = comment.id;
  sessionSortSnapshot = null; sessionSortSnapshotFilter = null;
  if (currentFilter === 'all') {
    visibleCount = Math.max(visibleCount, allComments.length);
  } else { visibleCount = 20; }
  renderComments();
  setTimeout(function() { scrollToElement('comment-' + comment.id); }, 150);
  return;
}

// Spam/content filter check (non-banned users only)
if (currentUser.email !== MODERATOR_EMAIL && checkContentFilter(text)) {
  comment.pending = true;
  allComments.push(comment);
  saveComments();
  flagForPending(comment.id, null, currentUser.email, currentUser.name, text);
  document.getElementById('comment-input').value = '';
  document.getElementById('char-count').textContent = '0';
  renderComments();
  return;
}
// Run spam filter
var flaggedWord = checkFilter(text, currentUser.email);
if (flaggedWord) {
  comment.pending = true;
  allComments.push(comment);
  saveComments();
  addToPending({ id: comment.id, email: comment.email, name: comment.name,
    text: comment.text, time: comment.time,
    pageUrl: window.location.pathname, commentId: comment.id, isReply: false });
  document.getElementById('comment-input').value = '';
  document.getElementById('char-count').textContent = '0';
  renderComments(); // ensure pending comment is hidden from others immediately
  alert('Your comment is pending moderator approval.');
  return;
}

allComments.push(comment);
recordCommentTimestamp();
saveComments();
notifySubscribers(comment);
sessionNewCommentId = comment.id;
// Reset hot sort snapshot so new comment is included in sort evaluation
sessionSortSnapshot = null; sessionSortSnapshotFilter = null;
document.getElementById('comment-input').value = '';
document.getElementById('char-count').textContent = '0';

// Ensure new comment is visible
if (currentFilter === 'all') {
  visibleCount = Math.max(visibleCount, allComments.length);
} else {
  visibleCount = 20; // pin is at top, so top 20 always shows it
}
updateStreak(currentUser.email);
renderComments();
setTimeout(function() {
  scrollToElement('comment-' + comment.id);
}, 150);
```

}

function filterComments(type, e) {
currentFilter = type;
visibleCount = 20;
sessionSortSnapshot = null; sessionSortSnapshotFilter = null;
if (e && e.target) {
document.querySelectorAll(’.filter-btn’).forEach(function(btn) { btn.classList.remove(‘active’); });
e.target.classList.add(‘active’);
}
renderComments();
}

function searchComments(query) {
searchQuery = query.toLowerCase();
visibleCount = 20;
renderComments();
}

function getFilteredComments() {
var filtered = allComments.filter(function(c) { return !c.deleted; });
if (currentFilter === ‘hot’) {
filtered.sort(function(a,b) { return ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0)); });
} else if (currentFilter === ‘newest’) {
filtered.sort(function(a,b) { return new Date(b.time) - new Date(a.time); });
} else {
filtered.sort(function(a,b) { return new Date(a.time) - new Date(b.time); });
}
if (searchQuery) {
var q = searchQuery.toLowerCase();
filtered = filtered.filter(function(c) {
if ((c.text||’’).toLowerCase().indexOf(q) !== -1 || (c.name||’’).toLowerCase().indexOf(q) !== -1) return true;
return (c.replies||[]).some(function(r) {
return !r.deleted && ((r.text||’’).toLowerCase().indexOf(q) !== -1 || (r.name||’’).toLowerCase().indexOf(q) !== -1);
});
});
}
return filtered;
}

function renderComments() {
threadStack = [];
var filtered = allComments.slice();

```
if (searchQuery) {
  var sq = searchQuery.toLowerCase();
  filtered = filtered.filter(function(c) {
    // Include if top-level matches
    if ((c.text || '').toLowerCase().indexOf(sq) !== -1 || (c.name || '').toLowerCase().indexOf(sq) !== -1) return true;
    // Include if any reply matches
    return (c.replies || []).some(function(r) {
      return !r.deleted && ((r.text || '').toLowerCase().indexOf(sq) !== -1 || (r.name || '').toLowerCase().indexOf(sq) !== -1);
    });
  });
}

// Session pin: current user's own new comment always floats to top for them only
// Other devices/users see the comment in its natural sorted position
var myPin = sessionNewCommentId && currentUser
  ? filtered.find(function(c) { return c.id === sessionNewCommentId; })
  : null;

if (currentFilter === 'hot') {
  // Hot: sort by net score -- snapshot the order, don't re-sort while browsing
  if (!sessionSortSnapshot || sessionSortSnapshotFilter !== 'hot') {
    filtered.sort(function(a, b) {
      return ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0));
    });
    sessionSortSnapshot = filtered.map(function(c) { return c.id; });
    sessionSortSnapshotFilter = 'hot';
  } else {
    // Preserve snapshot order -- only re-sort if new comments arrived
    var snapshotIds = sessionSortSnapshot;
    filtered.sort(function(a, b) {
      var ai = snapshotIds.indexOf(a.id), bi = snapshotIds.indexOf(b.id);
      if (ai === -1 && bi === -1) return ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0));
      if (ai === -1) return -1; // new comment goes to top
      if (bi === -1) return 1;
      return ai - bi;
    });
  }
} else if (currentFilter === 'newest') {
  sessionSortSnapshot = null; sessionSortSnapshotFilter = null;
  filtered.sort(function(a, b) { return new Date(b.time) - new Date(a.time); });
} else {
  sessionSortSnapshot = null; sessionSortSnapshotFilter = null;
  // All: highlighted float to top, then oldest first
  filtered.sort(function(a, b) {
    if (a.highlighted && !b.highlighted) return -1;
    if (!a.highlighted && b.highlighted) return  1;
    return new Date(a.time) - new Date(b.time);
  });
}

// Pin own session comment to top regardless of sort (for poster only)
if (myPin) {
  filtered = filtered.filter(function(c) { return c.id !== myPin.id; });
  filtered.unshift(myPin);
}

// Show More: slice to visibleCount, no pagination
var pageItems   = filtered.slice(0, visibleCount);

var html = '';
for (var i = 0; i < pageItems.length; i++) {
  var c = pageItems[i];
  var voteKey = currentUser ? currentUser.email + ':' + c.id : '';
  var myVote  = voteKey ? (userVotes[voteKey] || '') : '';

  var isDeleted  = c.deleted === true;
  var isOwner    = currentUser && currentUser.email === c.email;
  var canEdit    = isOwner && !isDeleted && (Date.now() - new Date(c.time).getTime()) < 600000;
  // Shadow session: visible ONLY to the banned user themselves -- not mods, not anyone else
  if (c.shadowSession) {
    if (!currentUser || currentUser.email !== c.email) continue;
  }
  // Legacy shadowHidden flag (kept for any old comments)
  if (c.shadowHidden && (!currentUser || currentUser.email !== c.email)) continue;
  if (c.pending && !isMod(currentUser ? currentUser.email : '') && !isOwner) continue;
  // Flagged for owner: hidden from all except master mod
  if (c.flaggedForOwner && currentUser && currentUser.email !== MODERATOR_EMAIL) continue;
  if (c.flaggedForOwner && !currentUser) continue;

  var isPending = c.pending === true;
  // isMod() function used instead of local var
  // Hide pending from non-mod non-authors entirely (no empty div)
  if (isPending && !isMod(currentUser ? currentUser.email : '') && !isOwner) { continue; }
  if (isDeleted) {
    html += '<div class="comment-item' + (c.highlighted ? ' is-highlighted' : '') + '" id="comment-' + c.id + '">' +
      '<div class="deleted-comment">[Deleted]</div>' +
      renderReplies(c) +
    '</div>';
  } else {
    html += '<div class="comment-item" id="comment-' + c.id + '">' +
      '<div class="comment-header">' +
        '<div class="comment-author">' +
          '<span class="comment-name user-link" data-email="' + c.email + '" data-name="' + escapeHTML(c.name) + '"' + getUsernameColorStyle(c.email) + '>' + escapeHTML(c.name) + '</span>' +
          (c.highlighted ? '<span class="highlight-badge">&#x2605; Highlighted</span>' : '') +
          (c.email === MODERATOR_EMAIL ? '<span class="comment-badge">&#x270D;&#xFE0F; Author</span>' : '') +
          (getStreak(c.email) >= 4 ? '<span class="streak-badge" title="' + getStreak(c.email) + '-week streak">&#x1F525;</span>' : '') +
          (function(){ var sp=getSpotlight(); return (sp && sp.email===c.email) ? '<span class="spotlight-badge" title="Monthly top contributor">&#x2605; Top Monthly</span>' : ''; })() +
        (c.email !== MODERATOR_EMAIL && isMod(c.email) ? '<span class="mod-badge">&#x1F6E1;&#xFE0F; Moderator</span>' : '') +
          getUserFlair(c.email) +
        '</div>' +
      '</div>' +
      '<div class="comment-meta">' + formatDate(c.time) + (c.edited ? ' <span style="color:#555;font-size:10px;">(edited)</span>' : '') + (isPending ? ' <span style="color:#FF6B35;font-size:10px;">(pending approval)</span>' : '') + '</div>' +
      '<div class="comment-text" id="comment-text-' + c.id + '">' + renderMentions(renderFormatted(c.text, c.email)) +
        (isLikelyNonEnglish(c.text) ? ' <button class="translate-btn" data-translated="0" onclick="window.translateComment(this,\'comment-text-' + c.id + '\',this.dataset.orig)" data-orig="' + c.text.replace(/"/g,'&quot;') + '">\uD83C\uDF10 Translate</button>' : '') +
        '</div>' +
      '<div class="comment-actions">' +
        '<button class="' + (myVote === 'up' ? 'vote-button active-up' : 'vote-button') + '" data-id="' + c.id + '" data-dir="up" onclick="voteItem(this)">▲' + ((c.upvotes || 0) > 0 ? ' ' + c.upvotes : '') + '</button>' +
        '<button class="' + (myVote === 'down' ? 'vote-button active-down' : 'vote-button') + '" data-id="' + c.id + '" data-dir="down" onclick="voteItem(this)">▼' + ((c.downvotes || 0) > 0 ? ' ' + c.downvotes : '') + '</button>' +
        (function(){ var s=(c.upvotes||0)-(c.downvotes||0); return s===0 ? '' : '<span style="color:' + (s>0?'#4CAF50':'#ff1744') + ';font-size:13px;font-weight:600;margin-left:2px;">' + s + '</span>'; })()+
        '<button class="action-btn" data-id="' + c.id + '" onclick="toggleReplyForm(this)">💬 Reply</button>' +
        (canEdit ? '<button class="action-btn" data-id="' + c.id + '" onclick="startEditComment(this)">✏️ Edit</button>' : '') +
        (isOwner && !isDeleted ? '<button class="action-btn" style="color:#ff4444;" data-id="' + c.id + '" onclick="deleteComment(this)">🗑 Delete</button>' : '') +
        (!isOwner ? '<button class="action-btn" data-id="' + c.id + '" data-email="' + c.email + '" onclick="reportComment(this)">🚩 Report</button>' : '') +
        renderReactionsBar(c.id) +
        (currentUser && currentUser.email === MODERATOR_EMAIL ? '<button class="highlight-btn' + (c.highlighted ? ' highlighted' : '') + '" data-id="' + c.id + '" onclick="toggleHighlight(this)" title="Highlight comment">&#x2605;</button>' : '') +
      '</div>' +
      '<div class="reply-form" id="reply-form-' + c.id + '">' +
        '<textarea class="reply-textarea" id="reply-input-' + c.id + '" placeholder="Write a reply... (use @ to mention)" maxlength="2000"></textarea>' +
        '<div class="reply-actions">' +
          '<button class="reply-btn" data-id="' + c.id + '" onclick="submitReply(this)">Post Reply</button>' +
          '<button class="cancel-btn" data-id="' + c.id + '" onclick="toggleReplyForm(this)">Cancel</button>' +
        '</div>' +
      '</div>' +
      renderReplies(c) +
    '</div>';
  }
}
document.getElementById('comments-list').innerHTML = html;
// Wire up mention and typing listeners on all textareas
document.querySelectorAll('.reply-textarea, .form-textarea').forEach(function(ta) {
  setupMentionListener(ta);
  (function(textarea) {
    var ctx = textarea.id.replace('reply-input-', '').replace('comment-input', 'main');
    textarea.addEventListener('input', function() { onTypingInput(textarea.id, ctx); });
  })(ta);
});
// Show More button
var showMoreEl = document.getElementById('show-more-btn');
if (!showMoreEl) {
  showMoreEl = document.createElement('div');
  showMoreEl.id = 'show-more-btn';
  showMoreEl.style.cssText = 'text-align:center;margin:16px 0 4px;';
  var listEl = document.getElementById('comments-list');
  if (listEl && listEl.parentNode) listEl.parentNode.insertBefore(showMoreEl, listEl.nextSibling);
}
if (filtered.length > visibleCount) {
  var remaining = filtered.length - visibleCount;
  var showCount = Math.min(remaining, 20);
  var label = showCount === remaining
    ? 'Show ' + remaining + ' more comment' + (remaining === 1 ? '' : 's')
    : 'Show ' + showCount + ' more comments (' + remaining + ' remaining)';
  showMoreEl.innerHTML = '<button onclick="window.showMoreComments()" style="' +
    'background:none;border:1px solid #2a5f7f;color:#2a5f7f;padding:8px 24px;' +
    'border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit;' +
    'transition:border-color 0.2s,color 0.2s;">' + label + '</button>';
} else {
  showMoreEl.innerHTML = '';
}
// Render reply search results (above comment list in DOM)
renderSearchReplyResults();
```

}

function showMoreComments() {
visibleCount += 20;
renderComments();
}
window.showMoreComments = showMoreComments;

// ── SEARCH IN REPLIES ─────────────────────────────

function highlightMatch(text, query) {
if (!query) return escapeHTML(text);
var escaped = escapeHTML(text);
var escapedQ = escapeHTML(query);
var re = new RegExp(’(’ + escapedQ.replace(/[.*+?^${}()|[]\]/g, ‘\$&’) + ‘)’, ‘gi’);
return escaped.replace(re, ‘<em>$1</em>’);
}

function renderSearchReplyResults() {
var el = document.getElementById(‘search-reply-results’);
if (!el) return;
if (!searchQuery) { el.innerHTML = ‘’; return; }
var q = searchQuery.toLowerCase();
var replyMatches = [];

```
allComments.forEach(function(c) {
  if (c.deleted) return;
  // Search ALL replies including deeply nested ones
  (c.replies || []).forEach(function(r) {
    if (r.deleted || r.shadowSession) return;
    if (r.text.toLowerCase().indexOf(q) !== -1 || (r.name || '').toLowerCase().indexOf(q) !== -1) {
      replyMatches.push({ reply: r, comment: c });
    }
  });
});

if (replyMatches.length === 0) { el.innerHTML = ''; return; }

var html = '<div id="search-reply-header">&#8626; ' + replyMatches.length +
  ' matching repl' + (replyMatches.length === 1 ? 'y' : 'ies') + ' in threads &mdash; click to jump</div>';

replyMatches.forEach(function(m) {
  var r = m.reply, c = m.comment;
  var preview = r.text.length > 120 ? r.text.substring(0, 120) + '...' : r.text;
  html += '<div class="search-reply-item"' +
    ' data-cid="' + c.id + '"' +
    ' data-rid="' + r.id + '"' +
    ' onclick="window._sri(this)">' +
    '<div class="search-reply-meta">' +
      '<span class="sri-label">&#8626; Reply</span>' +
      '<span class="search-reply-name">' + escapeHTML(r.name) + '</span>' +
      ' &middot; <span style="color:#555;font-size:10px;">in ' + escapeHTML(c.name) + '\'s comment</span>' +
    '</div>' +
    '<div class="search-reply-text">' + highlightMatch(preview, searchQuery) + '</div>' +
  '</div>';
});

el.innerHTML = html;
```

}

window.jumpToSearchReply = function(commentId, replyId) {
// Expand the reply chain first (with search still active so parent is visible)
var sorted = getSortedComments();
var idx = sorted.findIndex(function(c) { return c.id === commentId; });
if (idx !== -1) visibleCount = Math.max(visibleCount, idx + 1);
expandReplyChain(commentId, replyId, function() {
// Clear search AFTER chain is expanded so full thread is visible
searchQuery = ‘’;
var searchEl = document.getElementById(‘search-input’);
if (searchEl) searchEl.value = ‘’;
renderComments();
setTimeout(function() { scrollToElement(‘reply-’ + replyId); }, 200);
});
};

// Search reply item click – walk up to find data attributes in case child element was clicked
window._sri = function(el) {
var t = el;
while (t && !t.getAttribute(‘data-cid’)) { t = t.parentElement; }
if (!t) return;
window.jumpToSearchReply(t.getAttribute(‘data-cid’), t.getAttribute(‘data-rid’));
};

// Returns top-level comments in the same order renderComments would display them
// (respects hot sort snapshot so visibleCount expansion is accurate)
function getSortedComments() {
var arr = allComments.slice();
if (currentFilter === ‘hot’) {
if (sessionSortSnapshot) {
var snap = sessionSortSnapshot;
arr.sort(function(a, b) {
var ai = snap.indexOf(a.id), bi = snap.indexOf(b.id);
if (ai === -1 && bi === -1) return ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0));
if (ai === -1) return -1;
if (bi === -1) return 1;
return ai - bi;
});
} else {
arr.sort(function(a, b) {
return ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0));
});
}
} else if (currentFilter === ‘newest’) {
arr.sort(function(a, b) { return new Date(b.time) - new Date(a.time); });
} else {
arr.sort(function(a, b) { return new Date(a.time) - new Date(b.time); });
}
return arr;
}

function expandReplyChain(commentId, replyId, callback) {
var comment = allComments.find(function(c) { return c.id === commentId; });
if (!comment) { renderComments(); setTimeout(function() { if (callback) callback(); }, 500); return; }
var replies = comment.replies || [];
// Expand the top-level reply list for this comment
repliesExpanded[commentId] = true;
if (!replyId) { renderComments(); setTimeout(function() { if (callback) callback(); }, 500); return; }
var target = replies.find(function(r) { return r.id === replyId; });
if (!target) { renderComments(); setTimeout(function() { if (callback) callback(); }, 500); return; }
// Walk the full parentId chain upward, expanding every branch using the correct key format:
// branchKey = ‘branch-’ + parentReplyId  (matches what renderReplies reads)
var cur = target;
while (cur && cur.parentId) {
// Expand the branch that contains this reply
repliesExpanded[‘branch-’ + cur.parentId] = true;
branchPages[‘branch-’ + cur.parentId] = 1;
cur = replies.find(function(r) { return r.id === cur.parentId; });
}
renderComments();
setTimeout(function() { if (callback) callback(); }, 500);
}

function scrollToComments() {
var el = document.getElementById(‘airdrift-comments’);
if (el) el.scrollIntoView({ behavior: ‘smooth’, block: ‘start’ });
}

function scrollToElement(id, attempt) {
var el = document.getElementById(id);
if (el) {
el.scrollIntoView({ behavior: ‘smooth’, block: ‘center’ });
// Flash highlight so user can see which item was scrolled to
el.style.transition = ‘background 0.3s’;
el.style.background = ‘rgba(42,95,127,0.15)’;
setTimeout(function() { el.style.background = ‘’; }, 1500);
} else if (!attempt || attempt < 3) {
// Retry up to 3 times with increasing delay
setTimeout(function() { scrollToElement(id, (attempt || 0) + 1); }, 400);
}
}

// ── REPLY FUNCTIONS ──────────────────────────────

function toggleReplyForm(btn) {
var commentId = btn.getAttribute(‘data-id’);
var form = document.getElementById(‘reply-form-’ + commentId);
if (!form) return;
if (!currentUser) { showSignInModal(‘Sign in to reply.’); return; }
// Check comment type restriction
var comment = allComments.find(function(c) { return c.id === commentId; });
if (comment && !canReply(comment.email)) {
showUpgradeModal(getReplyBlockedMessage(comment.email));
return;
}
form.classList.toggle(‘open’);
if (form.classList.contains(‘open’)) {
// Hide sticky box when a reply form opens
var sticky = document.getElementById(‘sticky-comment-box’);
if (sticky) sticky.style.display = ‘none’;
document.getElementById(‘reply-input-’ + commentId).focus();
}
}

function submitReply(btn) {
var commentId      = btn.getAttribute(‘data-id’);
var parentReplyId  = btn.getAttribute(‘data-reply-id’) || null;
if (!currentUser) { showSignInModal(‘Sign in to reply.’); return; }
if (!isMod(currentUser.email)) {
var replyRateErr = checkCommentRateLimit();
if (replyRateErr) { alert(replyRateErr); return; }
}

```
// Find input -- keyed by commentId + optional parentReplyId
var inputKey = parentReplyId ? commentId + '-' + parentReplyId : commentId;
var input    = document.getElementById('reply-input-' + inputKey);
var text     = input ? input.value.trim() : '';
if (!text) return;

// Find root comment
var comment = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;

var newReplyId = Date.now().toString();

// Shadow banned: reply is session-only, never touches localStorage
if (isUserBanned(currentUser.email)) {
  var shadowReply = {
    id: newReplyId, parentId: parentReplyId,
    name: currentUser.name, email: currentUser.email,
    text: text, time: new Date().toISOString(),
    upvotes: 0, downvotes: 0, shadowSession: true
  };
  if (!comment.replies) comment.replies = [];
  comment.replies.push(shadowReply);
  // Do NOT saveComments
  recordCommentTimestamp();
  if (input) input.value = '';
  repliesExpanded[commentId] = true;
  if (threadStack.length > 0) { renderThreadView(); } else { renderComments(); }
  return;
}

// Spam/content filter check
if (currentUser.email !== MODERATOR_EMAIL && checkContentFilter(text)) {
  var flaggedReply = {
    id: newReplyId, parentId: parentReplyId,
    name: currentUser.name, email: currentUser.email,
    text: text, time: new Date().toISOString(),
    upvotes: 0, downvotes: 0, pending: true
  };
  if (!comment.replies) comment.replies = [];
  comment.replies.push(flaggedReply);
  saveComments();
  flagForPending(commentId, newReplyId, currentUser.email, currentUser.name, text);
  if (input) input.value = '';
  renderComments();
  return;
}
// Run spam filter on reply
var replyFlagged = checkFilter(text, currentUser.email);

if (!comment.replies) comment.replies = [];
recordCommentTimestamp();
comment.replies.push({
  id: newReplyId,
  parentId: parentReplyId,
  name: currentUser.name,
  email: currentUser.email,
  text: text,
  time: new Date().toISOString(),
  upvotes: 0,
  downvotes: 0
});

if (replyFlagged) {
  var newR = (comment.replies || []).find(function(r) { return r.id === newReplyId; });
  if (newR) newR.pending = true;
  saveComments();
  addToPending({ id: newReplyId, email: currentUser.email, name: currentUser.name,
    text: text, time: new Date().toISOString(),
    pageUrl: window.location.pathname, commentId: commentId, isReply: true, parentId: parentReplyId });
  if (input) input.value = '';
  alert('Your reply is pending moderator approval.');
  if (threadStack.length > 0) { renderThreadView(); } else { renderComments(); }
  return;
}

saveComments();
if (currentUser) scanForNotifications();
if (input) input.value = '';
repliesExpanded[commentId] = true;
replyPages[commentId] = 1;
// Stay in thread view if we're in one, otherwise normal render
if (threadStack.length > 0) {
  renderThreadView();
} else {
  renderComments();
}
// Scroll to the new reply
scrollToElement('reply-' + newReplyId);
```

}

function renderReplies(c) {
var allReplies = c.replies || [];
if (allReplies.length === 0) return ‘’;

```
var expanded   = repliesExpanded[c.id] || false;
var page       = replyPages[c.id] || 1;

// Get top-level replies (parentId === null)
var topReplies = allReplies.filter(function(r) { return !r.parentId; });
// Sort replies based on current sort mode
if (currentFilter === 'hot') {
  topReplies.sort(function(a, b) {
    return ((b.upvotes||0)-(b.downvotes||0)) - ((a.upvotes||0)-(a.downvotes||0));
  });
} else if (currentFilter === 'newest') {
  topReplies.sort(function(a, b) { return new Date(b.time) - new Date(a.time); });
} else {
  // All: highlighted replies float to top, then chronological
  topReplies.sort(function(a, b) {
    if (a.highlighted && !b.highlighted) return -1;
    if (!a.highlighted && b.highlighted) return  1;
    return new Date(a.time) - new Date(b.time);
  });
}
var totalPages = Math.max(1, Math.ceil(topReplies.length / REPLIES_PER_PAGE));

var html = '<div class="replies-section">';

if (!expanded) {
  // Preview: show first REPLIES_PREVIEW top-level replies with their children
  var preview = topReplies.slice(0, REPLIES_PREVIEW);
  for (var i = 0; i < preview.length; i++) {
    html += renderReplyNode(preview[i], allReplies, c.id, 1);
  }
  if (topReplies.length > REPLIES_PREVIEW) {
    html += '<button class="show-replies-btn" data-id="' + c.id + '" onclick="expandReplies(this)">' +
      '▼ Show all ' + topReplies.length + ' replies' +
    '</button>';
  }
} else {
  // Expanded with pagination on top-level replies
  var start   = (page - 1) * REPLIES_PER_PAGE;
  var visible = topReplies.slice(start, start + REPLIES_PER_PAGE);
  for (var j = 0; j < visible.length; j++) {
    html += renderReplyNode(visible[j], allReplies, c.id, 1);
  }
  if (topReplies.length > REPLIES_PER_PAGE) {
    html += '<div class="reply-pagination">' +
      '<button class="reply-page-btn" data-id="' + c.id + '" data-dir="prev" onclick="replyPage(this)" ' + (page === 1 ? 'disabled' : '') + '>&#8592;</button>' +
      '<span class="reply-page-indicator">' + page + ' / ' + totalPages + '</span>' +
      '<button class="reply-page-btn" data-id="' + c.id + '" data-dir="next" onclick="replyPage(this)" ' + (page === totalPages ? 'disabled' : '') + '>&#8594;</button>' +
    '</div>';
  }
  if (topReplies.length > REPLIES_PREVIEW) {
    html += '<button class="show-replies-btn" data-id="' + c.id + '" onclick="collapseReplies(this)">▲ Hide replies</button>';
  }
}

html += '</div>';
return html;
```

}

function getMaxDepth() {
var w = window.innerWidth;
if (w < 640)  return 3;
if (w < 1024) return 6;
return 8;
}

// ── NOTIFICATION FUNCTIONS ──────────────────────────

function notifKey()        { return currentUser ? NOTIF_KEY         + ‘:’ + currentUser.email : NOTIF_KEY; }
function notifClearedKey() { return currentUser ? NOTIF_CLEARED_KEY + ‘:’ + currentUser.email : NOTIF_CLEARED_KEY; }

function loadNotifications() {
notifications   = [];
clearedNotifIds = {};
if (!currentUser) return;
var s = localStorage.getItem(notifKey());
if (s) { try { notifications = JSON.parse(s); } catch(e) { notifications = []; } }
var c = localStorage.getItem(notifClearedKey());
if (c) { try { clearedNotifIds = JSON.parse(c); } catch(e) { clearedNotifIds = {}; } }
notifications.forEach(function(n) { if (n.read) clearedNotifIds[n.id] = true; });
}

function saveNotifications() {
if (!currentUser) return;
localStorage.setItem(notifKey(),        JSON.stringify(notifications));
localStorage.setItem(notifClearedKey(), JSON.stringify(clearedNotifIds));
// GAS HOOKUP: persist notifications server-side for cross-device delivery:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveNotifications’, email: currentUser.email, notifications: notifications }) }).catch(function(){});
}

function scanForNotifications() {
if (!currentUser) return;
var seenIds = {};
notifications.forEach(function(n) { seenIds[n.id] = true; });
// Also skip any permanently cleared notification IDs
Object.keys(clearedNotifIds).forEach(function(id) { seenIds[id] = true; });

```
// Scan ALL pages stored in localStorage (not just current page)
for (var i = 0; i < localStorage.length; i++) {
  var key = localStorage.key(i);
  if (!key || key.indexOf('airdriftComments:') !== 0) continue;
  var pageUrl = key.replace('airdriftComments:', '').split('?')[0];
  var stored;
  try { stored = JSON.parse(localStorage.getItem(key)); } catch(e) { continue; }
  if (!stored || !stored.length) continue;

  stored.forEach(function(comment) {
    var replies = comment.replies || [];
    var isModerator = currentUser.email === MODERATOR_EMAIL;

    // Moderator ONLY gets notified of ALL new top-level comments (unless suppressed)
    var suppressTopLevel = localStorage.getItem('airdriftSuppressTopLevelNotif') === '1';
    if (isModerator && !suppressTopLevel && comment.email !== currentUser.email) {
      var modKey = comment.id + '_notif';
      if (!seenIds[modKey]) {
        notifications.unshift({
          id:        modKey,
          pageUrl:   pageUrl,
          pageTitle: pageUrl,
          commentId: comment.id,
          replyId:   comment.id + '_top',
          elementId: 'comment-' + comment.id,
          fromName:  comment.name,
          preview:   (comment.text || '').substring(0, 80) + ((comment.text || '').length > 80 ? '...' : ''),
          time:      comment.time,
          read:      false
        });
        seenIds[modKey] = true;
      }
    }

    // Direct replies to current user's top-level comments
    if (comment.email === currentUser.email) {
      replies.filter(function(r) { return !r.parentId; }).forEach(function(r) {
        if (!seenIds[r.id + '_notif'] && r.email !== currentUser.email) {
          notifications.unshift({
            id:        r.id + '_notif',
            pageUrl:   pageUrl,
            pageTitle: pageUrl,
            commentId: comment.id,
            replyId:   r.id,
            elementId: 'reply-' + r.id,
            fromName:  r.name,
            preview:   r.text.substring(0, 80) + (r.text.length > 80 ? '...' : ''),
            time:      r.time,
            read:      false
          });
          seenIds[r.id + '_notif'] = true;
        }
      });
    }


    // Replies to current user's replies
    replies.forEach(function(r) {
      if (r.email === currentUser.email) {
        replies.filter(function(child) { return child.parentId === r.id; }).forEach(function(child) {
          if (!seenIds[child.id + '_notif'] && child.email !== currentUser.email) {
            notifications.unshift({
              id:        child.id + '_notif',
              pageUrl:   pageUrl,
              pageTitle: pageUrl,
              commentId: comment.id,
              replyId:   child.id,
              elementId: 'reply-' + child.id,
              fromName:  child.name,
              preview:   child.text.substring(0, 80) + (child.text.length > 80 ? '...' : ''),
              time:      child.time,
              read:      false
            });
            seenIds[child.id + '_notif'] = true;
          }
        });
      }
    });
  });
}

// Sort by time desc, keep max 50
notifications.sort(function(a, b) { return new Date(b.time) - new Date(a.time); });
if (notifications.length > 50) notifications = notifications.slice(0, 50);
saveNotifications();
renderNotifBell();
```

}

var notifPollInterval = null;

function startNotifPolling() {
if (notifPollInterval) clearInterval(notifPollInterval);
notifPollInterval = setInterval(function() {
if (!currentUser) return;
// Reload comments from localStorage in case another tab updated them
loadComments();
scanForNotifications();
scanForMentionNotifications();
// TODO: replace with GAS fetch when backend is live:
// fetch(GAS_URL + ‘?action=getNotifications&email=’ + currentUser.email)
//   .then(function(r) { return r.json(); })
//   .then(function(data) { mergeNotifications(data.notifications); });
}, 30000); // 30 seconds
}

function renderNotifBell() {
var bellEl  = document.getElementById(‘notif-bell’);
var countEl = document.getElementById(‘notif-count’);
var listEl  = document.getElementById(‘notif-list’);
if (!bellEl || !currentUser) return;

```
var userNotifs = notifications.filter(function(n) { return true; });
var unread     = userNotifs.filter(function(n) { return !n.read; }).length;

var viewBtn = document.getElementById('notif-view-btn');
if (unread > 0) {
  bellEl.style.opacity = '1';
  bellEl.style.display = 'block';
  if (viewBtn) viewBtn.style.display = 'none';
} else if (bellEl.style.display !== 'none') {
  bellEl.style.opacity = '0';
  setTimeout(function() {
    if (bellEl.style.opacity === '0') {
      bellEl.style.display = 'none';
      if (viewBtn) viewBtn.style.display = 'inline-block';
    }
  }, 7000);
} else {
  if (viewBtn) viewBtn.style.display = notifications.filter(function(n){return !n.read;}).length === 0 && notifications.length > 0 ? 'inline-block' : 'none';
}
countEl.style.display = unread > 0 ? 'inline-block' : 'none';
countEl.textContent   = unread > 99 ? '99+' : unread;

if (!listEl) return;
if (userNotifs.length === 0) {
  listEl.innerHTML = '<div class="notif-empty">No notifications yet</div>';
  return;
}
var html = '';
for (var i = 0; i < userNotifs.length; i++) {
  var n = userNotifs[i];
  html += '<div class="notif-item ' + (n.read ? 'read' : 'unread') + '" data-notif-id="' + n.id + '" onclick="goToNotification(this)">' +
    '<div class="notif-name">' + escapeHTML(n.fromName) + ' replied</div>' +
    '<div class="notif-text">' + escapeHTML(n.preview) + '</div>' +
    '<div class="notif-meta">' + formatDate(n.time) + (n.pageTitle ? ' &middot; ' + escapeHTML(n.pageTitle) : '') + '</div>' +
  '</div>';
}
listEl.innerHTML = html;
```

}

function toggleNotifPanel() {
var bell  = document.getElementById(‘notif-bell’);
var panel = document.getElementById(‘notif-panel’);
if (!panel) return;
// Only open if bell is actually visible
if (bell && bell.style.display === ‘none’ && !panel.classList.contains(‘open’)) return;
panel.classList.toggle(‘open’);
if (panel.classList.contains(‘open’)) {
renderNotifBell();
attachNotifOutsideClose();
}
}

function showNotifBell() {
var bell = document.getElementById(‘notif-bell’);
if (!bell) return;
if (bell._fadeTimer) { clearTimeout(bell._fadeTimer); bell._fadeTimer = null; }
bell.classList.remove(‘fading’);
bell.style.opacity = ‘1’;
bell.style.display = ‘block’;
bell.style.pointerEvents = ‘auto’;
var panel = document.getElementById(‘notif-panel’);
if (panel) {
panel.classList.add(‘open’);
renderNotifBell();
attachNotifOutsideClose();
}
}

// Attach outside-click and outside-touch listener to close notification panel.
// Stored on window so it can be removed cleanly; safe to call multiple times.
function attachNotifOutsideClose() {
if (window._notifOutsideHandler) {
document.removeEventListener(‘pointerdown’, window._notifOutsideHandler, true);
document.removeEventListener(‘click’,       window._notifOutsideHandler, true);
window._notifOutsideHandler = null;
}
setTimeout(function() {
window._notifOutsideHandler = function(e) {
var p = document.getElementById(‘notif-panel’);
if (!p || !p.classList.contains(‘open’)) return;
// Walk up the DOM from the tap target – if we never hit the panel it’s outside
var node = e.target;
while (node && node !== document.body) {
if (node === p) return; // inside panel
if (node.id === ‘notif-bell-btn’ || node.id === ‘notif-view-btn’) return; // bell buttons
node = node.parentNode;
}
p.classList.remove(‘open’);
document.removeEventListener(‘pointerdown’, window._notifOutsideHandler, true);
document.removeEventListener(‘click’,       window._notifOutsideHandler, true);
window._notifOutsideHandler = null;
};
document.addEventListener(‘pointerdown’, window._notifOutsideHandler, true);
document.addEventListener(‘click’,       window._notifOutsideHandler, true);
}, 50);
}

function dismissNotifBell() {
// Close panel and fade bell
var panel = document.getElementById(‘notif-panel’);
var bell  = document.getElementById(‘notif-bell’);
var viewBtn = document.getElementById(‘notif-view-btn’);
if (panel) panel.classList.remove(‘open’);
if (bell) {
bell.classList.add(‘fading’);
bell.style.opacity = ‘0’;
// Hide completely after transition – no clicks possible during or after fade
var bellFadeTimer = setTimeout(function() {
bell.style.display = ‘none’;
bell.classList.remove(‘fading’);
}, 7100);
// If bell is shown again before timer fires, cancel
bell._fadeTimer = bellFadeTimer;
}
// Show the notification button in header so user can get back
if (viewBtn) viewBtn.style.display = ‘inline-block’;
}

function clearNotifications() {
notifications.forEach(function(n) { n.read = true; clearedNotifIds[n.id] = true; });
saveNotifications();
renderNotifBell();
}

function clearAllNotifications() {
notifications.forEach(function(n) { clearedNotifIds[n.id] = true; });
notifications = [];
saveNotifications();
renderNotifBell();
document.getElementById(‘notif-panel’).classList.remove(‘open’);
}

function goToNotification(el) {
var notifId = el.getAttribute(‘data-notif-id’);
var notif   = notifications.find(function(n) { return n.id === notifId; });
if (!notif) return;
// Mark as read
notif.read = true;
clearedNotifIds[notif.id] = true;
saveNotifications();
renderNotifBell();
// Close panel
document.getElementById(‘notif-panel’).classList.remove(‘open’);

```
// Handle DM notifications -- open the chat window
if (notif.type === 'dm' || notif.type === 'dm_invite') {
  if (!currentUser) return;
  var dmEmailTarget = notif.dmEmail;
  var dmEmailMod    = notif.dmMod || MODERATOR_EMAIL;
  var dmName = notif.fromName || dmEmailTarget || 'Moderator';
  // Figure out who the other person is
  var isCurrentUserMod = isMod(currentUser.email);
  // Set the thread correctly: user always connects to the mod
  activeDmEmail  = isCurrentUserMod ? dmEmailTarget : dmEmailMod;
  activeDmMod    = isCurrentUserMod ? currentUser.email : dmEmailMod;
  activeDmThread = getDmKey(dmEmailTarget || currentUser.email, dmEmailMod);
  var win = document.getElementById('dm-window');
  if (!win) return;
  var titleEl   = document.getElementById('dm-title');
  var subEl     = document.getElementById('dm-subtitle');
  var changeBtn = document.getElementById('dm-change-username-btn');
  var endBtn    = document.getElementById('dm-end-btn');
  if (titleEl)  titleEl.textContent  = dmName;
  if (subEl)    subEl.textContent    = isCurrentUserMod ? 'mod chat' : 'private';
  if (changeBtn) changeBtn.style.display = isCurrentUserMod ? 'inline-block' : 'none';
  if (endBtn)    endBtn.style.display    = isCurrentUserMod ? 'inline-block' : 'none';
  win.style.display = 'flex';
  renderDmMessages();
  var inp = document.getElementById('dm-input');
  if (inp) setTimeout(function() { inp.focus(); }, 50);
  return;
}
// If on same page, find which page the comment is on and navigate there
// Normalize URLs for comparison -- strip query params and trailing slashes
var normUrl = function(u) { return (u || '').split('?')[0].replace(/\/+$/, '') || '/'; };
if (normUrl(notif.pageUrl) === normUrl(window.location.pathname)) {
  // Expand replies for the parent comment
  if (notif.commentId) repliesExpanded[notif.commentId] = true;

  // Determine the best targetId
  var targetId = notif.elementId;
  // elementId ending in _top means it's a top-level comment notif -- strip _top suffix
  if (!targetId || targetId.indexOf('_top') !== -1) {
    targetId = 'comment-' + notif.commentId;
  }

  // Find which pagination page the parent comment is on
  // Use same sort order as renderComments so visibleCount expansion is accurate
  var sorted = getSortedComments();
  var commentIdx = sorted.findIndex(function(c) { return c.id === notif.commentId; });
  // Ensure parent comment is within the visible range
  if (commentIdx !== -1) {
    visibleCount = Math.max(visibleCount, commentIdx + 1);
  } else {
    // Comment not found in filtered list -- expand to full
    visibleCount = Math.max(visibleCount, allComments.length);
  }
  // expandReplyChain handles all nesting: expands top-level replies,
  // walks full parentId chain, calls renderComments, then scrolls
  expandReplyChain(notif.commentId, notif.replyId, function() {
    scrollToElement(targetId);
  });
} else {
  // Store target in sessionStorage so destination page can scroll to it
  var targetId = notif.elementId ||
    (notif.replyId ? 'reply-' + notif.replyId : 'comment-' + notif.commentId);
  sessionStorage.setItem('airdriftScrollTo', JSON.stringify({
    targetId:  targetId,
    commentId: notif.commentId
  }));
  // Navigate to the stored URL (use normalized path to avoid ?m=1 loops)
  window.location.href = notif.pageUrl.split('?')[0];
}
```

}

// ── WELCOME MODAL ──────────────────────────────────

var WELCOME_SEEN_KEY = ‘airdriftWelcomeSeen’;

function showWelcomeModal() {
var seen = localStorage.getItem(WELCOME_SEEN_KEY);
if (seen) return;
var modal = document.getElementById(‘welcome-modal’);
if (modal) modal.style.display = ‘flex’;
}

function dismissWelcomeModal() {
// Sets WELCOME_SEEN_KEY so future visits show the sign-in banner instead
localStorage.setItem(WELCOME_SEEN_KEY, ‘1’);
// TODO: sync to GAS when backend is live
var modal = document.getElementById(‘welcome-modal’);
if (modal) modal.style.display = ‘none’;
}

function welcomeSignIn() {
dismissWelcomeModal();
signInWithGoogle();
}

// ── USERNAME FUNCTIONS ──────────────────────────────

var USERNAMES_KEY = ‘airdriftUsernames’; // { email: username }
var usernameMap   = {};

function loadUsernames() {
var s = localStorage.getItem(USERNAMES_KEY);
if (s) { try { usernameMap = JSON.parse(s); } catch(e) { usernameMap = {}; } }
}

function saveUsernames() {
localStorage.setItem(USERNAMES_KEY, JSON.stringify(usernameMap));
// TODO: sync to GAS when backend is live
}

function getDisplayName(email, googleName) {
return usernameMap[email] || googleName;
}

function showUsernameModal(googleName) {
var modal = document.getElementById(‘username-modal’);
var defEl = document.getElementById(‘modal-default-name’);
var input = document.getElementById(‘username-input’);
if (!modal) return;
defEl.textContent = googleName;
input.value       = ‘’;
document.getElementById(‘username-error’).textContent = ‘’;
modal.style.display = ‘flex’;
setTimeout(function() { input.focus(); }, 100);
}

function dismissUsernameModal() {
// Mark as seen so we don’t show again
if (currentUser) {
usernameMap[currentUser.email + ‘_seen’] = true;
saveUsernames();
}
document.getElementById(‘username-modal’).style.display = ‘none’;
}

function confirmUsername() {
var input   = document.getElementById(‘username-input’);
var errorEl = document.getElementById(‘username-error’);
var name    = input.value.trim();
if (!name) { errorEl.textContent = ‘Please enter a username.’; return; }
if (name.length < 2) { errorEl.textContent = ‘Username must be at least 2 characters.’; return; }
if (containsBannedContent(name)) {
errorEl.textContent = ‘That username is not allowed. Please choose a different name.’;
if (currentUser) {
recordStrike(currentUser.email);
// Track the attempted username for mod review
var attempts = JSON.parse(localStorage.getItem(‘airdriftUsernameAttempts’) || ‘{}’);
if (!attempts[currentUser.email]) attempts[currentUser.email] = [];
if (attempts[currentUser.email].indexOf(name) === -1) attempts[currentUser.email].push(name);
localStorage.setItem(‘airdriftUsernameAttempts’, JSON.stringify(attempts));
}
return;
}
if (!currentUser) return;
usernameMap[currentUser.email] = name;
usernameMap[currentUser.email + ‘_seen’] = true;
currentUser.name = name;
sessionStorage.setItem(‘airdriftCurrentUser’, JSON.stringify(currentUser));
saveUsernames();
document.getElementById(‘username-modal’).style.display = ‘none’;
renderComments();
}

function adminChangeUsername(oldName, newName) {
if (!currentUser || currentUser.email !== MODERATOR_EMAIL) {
return ‘Error: moderator only.’;
}
oldName = oldName.trim();
newName = newName.trim();
if (!oldName || !newName) return ‘Error: both names required.’;

```
// Find email by old name in usernameMap
var targetEmail = null;
Object.keys(usernameMap).forEach(function(k) {
  if (!k.endsWith('_seen') && usernameMap[k] === oldName) targetEmail = k;
});
// Also check Google names in comments
if (!targetEmail) {
  allComments.forEach(function(c) {
    if (c.name === oldName) targetEmail = c.email;
    (c.replies || []).forEach(function(r) {
      if (r.name === oldName) targetEmail = r.email;
    });
  });
}
if (!targetEmail) return 'Error: user "' + oldName + '" not found.';

// Update usernameMap
usernameMap[targetEmail] = newName;
saveUsernames();

// Update all comments and replies across ALL localStorage pages
var pagesUpdated = 0;
for (var i = 0; i < localStorage.length; i++) {
  var key = localStorage.key(i);
  if (!key || key.indexOf('airdriftComments:') !== 0) continue;
  var stored;
  try { stored = JSON.parse(localStorage.getItem(key)); } catch(e) { continue; }
  if (!stored) continue;
  var changed = false;
  stored.forEach(function(c) {
    if (c.email === targetEmail) { c.name = newName; changed = true; }
    (c.replies || []).forEach(function(r) {
      if (r.email === targetEmail) { r.name = newName; changed = true; }
    });
  });
  if (changed) {
    localStorage.setItem(key, JSON.stringify(stored));
    pagesUpdated++;
  }
}
// Reload current page comments
loadComments();
renderComments();
return 'Done. Updated "' + oldName + '" to "' + newName + '" across ' + pagesUpdated + ' page(s).';
```

}

// ── @MENTION FUNCTIONS ──────────────────────────────

var mentionActiveInput = null;
var mentionAtPos       = -1;

function getPageCommenters() {
var seen  = {};
var users = [];
// Always include the site author so users can @mention them on any page
var modName = usernameMap[MODERATOR_EMAIL] || ‘Stefan’;
seen[MODERATOR_EMAIL] = true;
users.push({ name: modName, email: MODERATOR_EMAIL });
allComments.forEach(function(c) {
if (!c.deleted && c.email && !seen[c.email]) {
seen[c.email] = true;
users.push({ name: c.name, email: c.email });
}
(c.replies || []).forEach(function(r) {
if (!r.deleted && r.email && !seen[r.email]) {
seen[r.email] = true;
users.push({ name: r.name, email: r.email });
}
});
});
return users;
}

function setupMentionListener(textarea) {
textarea.addEventListener(‘input’, function() {
var val    = textarea.value;
var cursor = textarea.selectionStart;
// Find the @ before cursor
var atIdx  = val.lastIndexOf(’@’, cursor - 1);
if (atIdx === -1) { hideMentionDropdown(); return; }
// Check no space between @ and cursor
var query = val.substring(atIdx + 1, cursor);
if (/\s/.test(query)) { hideMentionDropdown(); return; }
mentionActiveInput = textarea;
mentionAtPos       = atIdx;
showMentionDropdown(query, textarea);
});
textarea.addEventListener(‘keydown’, function(e) {
var dd = document.getElementById(‘mention-dropdown’);
if (!dd || dd.style.display === ‘none’) return;
if (e.key === ‘Escape’) { hideMentionDropdown(); }
});
textarea.addEventListener(‘blur’, function() {
setTimeout(hideMentionDropdown, 200);
});
}

function showMentionDropdown(query, textarea) {
var commenters = getPageCommenters();
// Remove self from dropdown
if (currentUser) {
commenters = commenters.filter(function(u) { return u.email !== currentUser.email; });
}
var filtered   = query
? commenters.filter(function(u) { return u.name.toLowerCase().indexOf(query.toLowerCase()) === 0; })
: commenters;
if (filtered.length === 0) { hideMentionDropdown(); return; }

```
var dd   = document.getElementById('mention-dropdown');
var rect = textarea.getBoundingClientRect();
dd.style.display = 'block';
dd.style.top     = (window.scrollY + rect.bottom + 2) + 'px';
dd.style.left    = (window.scrollX + rect.left) + 'px';

dd.innerHTML = filtered.slice(0, 8).map(function(u) {
  var allowed = canMentionUser(u.email);
  var style   = allowed ? '' : 'opacity:0.4;cursor:default;';
  return '<div class="mention-item" data-name="' + escapeHTML(u.name) + '" data-email="' + escapeHTML(u.email) + '" data-allowed="' + (allowed ? '1' : '0') + '" style="' + style + '" onmousedown="insertMention(this)">' +
    getUserFlair(u.email) +
    '<span>' + escapeHTML(u.name) + '</span>' +
  '</div>';
}).join('');
```

}

function hideMentionDropdown() {
var dd = document.getElementById(‘mention-dropdown’);
if (dd) dd.style.display = ‘none’;
mentionActiveInput = null;
mentionAtPos       = -1;
}

function insertMention(el) {
if (!mentionActiveInput) return;
var name    = el.getAttribute(‘data-name’);
var email   = el.getAttribute(‘data-email’);
var allowed = el.getAttribute(‘data-allowed’);
if (allowed === ‘0’) {
showUpgradeModal(getReplyBlockedMessage(email));
hideMentionDropdown();
return;
}
var val    = mentionActiveInput.value;
var cursor = mentionActiveInput.selectionStart;
var before = val.substring(0, mentionAtPos);
var after  = val.substring(cursor);
// Wrap multi-word names in brackets so they render as a single mention
var mentionText = name.indexOf(’ ’) !== -1 ? ‘@[’ + name + ‘]’ : ‘@’ + name;
mentionActiveInput.value = before + mentionText + ’ ’ + after;
var newCursor = before.length + name.length + 2;
mentionActiveInput.setSelectionRange(newCursor, newCursor);
mentionActiveInput.focus();
hideMentionDropdown();
}

function renderMentions(text) {
var escaped = escapeHTML(text);
// Handle @[Full Name] bracketed format first (multi-word usernames)
escaped = escaped.replace(/@[([^]]+)]/g, function(match, username) {
return ‘<span class="mention" onclick="scrollToUser(\'' + username.replace(/'/g, '') + '\')">@’ + username + ‘</span>’;
});
// Handle simple @word format
escaped = escaped.replace(/@(\S+)/g, function(match, username) {
// Skip if already inside a span (already replaced above)
return ‘<span class="mention" onclick="scrollToUser(\'' + username.replace(/'/g, '') + '\')">@’ + username + ‘</span>’;
});
return escaped;
}

function scrollToUser(username) {
// Find most recent comment by this username
var found = null;
for (var i = 0; i < allComments.length; i++) {
var c = allComments[i];
if (!c.deleted && c.name === username) { found = ‘comment-’ + c.id; break; }
var replies = c.replies || [];
for (var j = 0; j < replies.length; j++) {
if (!replies[j].deleted && replies[j].name === username) {
repliesExpanded[c.id] = true;
found = ‘reply-’ + replies[j].id;
break;
}
}
if (found) break;
}
if (found) {
renderComments();
setTimeout(function() { scrollToElement(found); }, 150);
}
}

// Scan for @mention notifications
function scanForMentionNotifications() {
if (!currentUser) return;
// Remove stale mention notifications so they get rebuilt with correct elementId
notifications = notifications.filter(function(n) { return n.id.indexOf(‘mention_’) !== 0; });
var seenIds = {};
// Skip permanently cleared IDs
Object.keys(clearedNotifIds).forEach(function(id) { seenIds[id] = true; });

```
for (var i = 0; i < localStorage.length; i++) {
  var key = localStorage.key(i);
  if (!key || key.indexOf('airdriftComments:') !== 0) continue;
  var pageUrl = key.replace('airdriftComments:', '').split('?')[0];
  var stored;
  try { stored = JSON.parse(localStorage.getItem(key)); } catch(e) { continue; }
  if (!stored) continue;
  stored.forEach(function(comment) {
    var allItems = [comment].concat(comment.replies || []);
    allItems.forEach(function(item) {
      if (item.deleted || item.email === currentUser.email) return;
      var mentionKey = 'mention_' + item.id;
      if (seenIds[mentionKey]) return;
      var pattern = new RegExp('@' + currentUser.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (pattern.test(item.text || '')) {
        var isMentionReply = item.id !== comment.id;
        notifications.unshift({
          id:        mentionKey,
          pageUrl:   pageUrl,
          pageTitle: pageUrl,
          commentId: comment.id,
          replyId:   isMentionReply ? item.id : null,
          elementId: isMentionReply ? 'reply-' + item.id : 'comment-' + item.id,
          fromName:  item.name,
          preview:   '\ud83d\udccc Mentioned you: ' + (item.text || '').substring(0, 60) + ((item.text || '').length > 60 ? '...' : ''),
          time:      item.time,
          read:      false
        });
        seenIds[mentionKey] = true;
      }
    });
  });
}
notifications.sort(function(a, b) { return new Date(b.time) - new Date(a.time); });
if (notifications.length > 50) notifications = notifications.slice(0, 50);
saveNotifications();
renderNotifBell();
```

}

// ── STICKY COMMENT BOX ──────────────────────────────

var stickyObserver = null;

function initStickyCommentBox() {
var sticky = document.getElementById(‘sticky-comment-box’);
if (!sticky) return;

```
function checkSticky() {
  if (!currentUser) { sticky.style.display = 'none'; return; }
  var widgetEl = document.getElementById('airdrift-comments');
  if (!widgetEl) { sticky.style.display = 'none'; return; }
  var rect = widgetEl.getBoundingClientRect();

  // State 1: main form still visible -- hide sticky entirely
  var formVisible = false;
  var formSelectors = ['#comment-input', '#airdrift-comments .submit-btn',
                       '#airdrift-comments .form-textarea', '#airdrift-comments .char-count'];
  for (var fi = 0; fi < formSelectors.length; fi++) {
    var fEl = document.querySelector(formSelectors[fi]);
    if (fEl) {
      var fR = fEl.getBoundingClientRect();
      if (fR.bottom > 0 && fR.top < window.innerHeight) { formVisible = true; break; }
    }
  }
  if (!formVisible && rect.top > -100) formVisible = true;

  // Also hide if a reply form is currently open (important on mobile)
  var anyReplyOpen = document.querySelector('#airdrift-comments .reply-form.open');

  if (formVisible || anyReplyOpen) {
    sticky.style.display = 'none';
    sticky.style.position = 'fixed';
    widgetEl.style.paddingBottom = '';
    return;
  }

  // State 2: widget scrolled past bottom of viewport -- attach to bottom of widget
  var widgetBelowViewport = rect.bottom < window.innerHeight;
  if (widgetBelowViewport) {
    sticky.style.display = 'flex';
    sticky.style.position = 'absolute';
    sticky.style.bottom = '0';
    sticky.style.left = '0';
    sticky.style.right = '0';
    sticky.style.width = '100%';
    // Move sticky inside widget if not already
    if (sticky.parentElement !== widgetEl) {
      widgetEl.style.position = 'relative';
      widgetEl.appendChild(sticky);
    }
    widgetEl.style.paddingBottom = (sticky.offsetHeight) + 'px';
    return;
  }

  // State 3: widget in view, form scrolled away -- fixed to bottom of screen
  if (sticky.parentElement !== document.body) {
    document.body.appendChild(sticky);
  }
  sticky.style.display = 'flex';
  sticky.style.position = 'fixed';
  sticky.style.bottom = '0';
  sticky.style.left = '0';
  sticky.style.right = '0';
  sticky.style.width = '100%';
  widgetEl.style.paddingBottom = (sticky.offsetHeight) + 'px';
}

if (stickyObserver) { window.removeEventListener('scroll', stickyObserver); }
stickyObserver = checkSticky;
window.addEventListener('scroll', stickyObserver);
// On mobile: touch events can scroll without triggering 'scroll' in some cases
window.addEventListener('touchend', function() { setTimeout(checkSticky, 150); });
checkSticky();

// Wire mention listener to sticky input
var stickyInput = document.getElementById('sticky-comment-input');
if (stickyInput) {
  setupMentionListener(stickyInput);
  stickyInput.addEventListener('input', function() { onTypingInput('sticky', 'sticky'); });
}

// Hide sticky when any other textarea in the widget gets focus
document.addEventListener('focusin', function(e) {
  var ta = e.target;
  if (ta.tagName !== 'TEXTAREA') return;
  if (ta.id === 'sticky-comment-input') return;
  var inWidget = document.getElementById('airdrift-comments');
  if (inWidget && inWidget.contains(ta)) {
    var s = document.getElementById('sticky-comment-box');
    if (s) s.style.display = 'none';
  }
});

// Zoom/resize: reflow sticky so Post button stays visible
window.addEventListener('resize', function() {
  var s = document.getElementById('sticky-comment-box');
  if (!s || s.style.display === 'none') return;
  s.style.width = '100%';
  s.style.left = '0';
  s.style.right = '0';
});
```

}

function submitStickyComment() {
var input = document.getElementById(‘sticky-comment-input’);
if (!input) return;
// Check rate limit before clearing – preserve text if blocked
if (!isMod(currentUser ? currentUser.email : ‘’)) {
var rateErr = checkCommentRateLimit();
if (rateErr) { alert(rateErr); return; } // text preserved in sticky input
}
var mainInput = document.getElementById(‘comment-input’);
if (mainInput) mainInput.value = input.value;
input.value = ‘’;
submitComment();
}

// ── SPAM / CONTENT FILTER ───────────────────────────

var FILTER_STRIKES_KEY  = ‘airdriftFilterStrikes’;
var FILTER_PENDING_KEY  = ‘airdriftPending’;
var FILTER_REPORTED_KEY = ‘airdriftReported’;
var REPORT_COUNTS_KEY   = ‘airdriftReportCounts’;
var BANNED_USERS_KEY    = ‘airdriftBannedUsers’;
var WARNED_USERS_KEY    = ‘airdriftWarnedUsers’;
var MOD_REPORTS_KEY     = ‘airdriftModReports’;
var COMMENT_RATE_KEY    = ‘airdriftCommentRate’;
var REPORT_RATE_KEY     = ‘airdriftReportRate’;
var FLAGGED_OWNER_KEY   = ‘airdriftFlaggedForOwner’; // [{ id, commentId, email, name, text, flaggedBy, time, pageUrl }]
var filterStrikes       = {};
var pendingItems        = [];
var reportedItems       = [];
var reportCounts        = {};
var bannedUsers         = {};
var warnedUsers         = {};
var modSelfReports      = [];
var flaggedForOwner     = [];
var commentTimestamps   = [];
var reportTimestamps    = [];

// checkContentFilter: uses the same consolidated list and logic as containsBannedContent
// Both comment and username filtering share one system
function checkContentFilter(text) {
return containsBannedContent(text) !== null;
}

function checkUsernameFilter(name) {
return checkContentFilter(name);
}

function recordFilterStrike(email) {
if (!email || email === MODERATOR_EMAIL) return;
var s = localStorage.getItem(FILTER_STRIKES_KEY);
if (s) { try { filterStrikes = JSON.parse(s); } catch(e) { filterStrikes = {}; } }
filterStrikes[email] = (filterStrikes[email] || 0) + 1;
localStorage.setItem(FILTER_STRIKES_KEY, JSON.stringify(filterStrikes));
}

function getFilterStrikes(email) {
var s = localStorage.getItem(FILTER_STRIKES_KEY);
if (s) { try { filterStrikes = JSON.parse(s); } catch(e) {} }
return filterStrikes[email] || 0;
}

function loadPendingItems() {
var s = localStorage.getItem(FILTER_PENDING_KEY);
if (s) { try { pendingItems = JSON.parse(s); } catch(e) { pendingItems = []; } }
}

function savePendingItems() {
localStorage.setItem(FILTER_PENDING_KEY, JSON.stringify(pendingItems));
}

function loadReportedItems() {
var s = localStorage.getItem(FILTER_REPORTED_KEY);
if (s) { try { reportedItems = JSON.parse(s); } catch(e) { reportedItems = []; } }
}

function saveReportedItems() {
localStorage.setItem(FILTER_REPORTED_KEY, JSON.stringify(reportedItems));
}

function flagForPending(commentId, replyId, email, name, text) {
loadPendingItems();
pendingItems.push({
id:         Date.now().toString(),
commentId:  commentId,
replyId:    replyId || null,
email:      email,
name:       name,
text:       text,
time:       new Date().toISOString(),
pageUrl:    window.location.pathname,
pageTitle:  document.title || ‘’
});
savePendingItems();
recordFilterStrike(email);
}

// ── MODERATOR DASHBOARD ──────────────────────────────

function openDashboard() {
if (!currentUser || !isMod(currentUser.email)) return;
loadPendingItems();
loadReportedItems();
renderModDashboard();
document.getElementById(‘mod-dashboard’).style.display = ‘block’;
markDashboardSeen();
// Reset button highlight
var btn = document.getElementById(‘mod-dashboard-btn’);
if (btn) { btn.style.borderColor = ‘#2a5f7f’; btn.style.color = ‘#2a5f7f’; btn.textContent = ‘\u2699\uFE0F Dashboard’; }
}

function closeDashboard() {
document.getElementById(‘mod-dashboard’).style.display = ‘none’;
}

function renderDashboard() { renderModDashboard(); }

function approveItem(itemId) {
var item = pendingItems.find(function(p) { return p.id === itemId; });
if (!item) return;
allComments.forEach(function(c) {
if (c.id === item.commentId) {
if (item.replyId || item.isReply) {
(c.replies || []).forEach(function(r) {
if (r.id === item.id || r.id === item.replyId) { r.pending = false; delete r.pending; }
});
} else {
c.pending = false; delete c.pending;
}
}
});
pendingItems = pendingItems.filter(function(p) { return p.id !== itemId; });
saveComments();
savePendingItems();
renderComments();
renderModDashboard();
}

function rejectItem(itemId) {
// Check pending first, then reported
var item = pendingItems.find(function(p) { return p.id === itemId; });
var fromReported = false;
if (!item) { item = reportedItems.find(function(r) { return r.id === itemId; }); fromReported = !!item; }
if (!item) return;
if (fromReported) {
reportedItems = reportedItems.filter(function(r) { return r.id !== itemId; });
saveReportedItems();
} else {
pendingItems = pendingItems.filter(function(p) { return p.id !== itemId; });
savePendingItems();
}
allComments.forEach(function(c) {
if (c.id === item.commentId) {
if (item.replyId || item.isReply) {
c.replies = (c.replies || []).filter(function(r) { return r.id !== item.id && r.id !== item.replyId; });
} else {
c.deleted = true; c.text = ‘’; c.name = ‘’;
}
}
});
saveComments();
renderComments();
renderModDashboard();
}

function dismissReport(itemId) {
reportedItems = reportedItems.filter(function(r) { return r.id !== itemId; });
saveReportedItems();
renderModDashboard();
}

function deleteReported(itemId) {
var item = reportedItems.find(function(r) { return r.id === itemId; });
if (item) {
allComments.forEach(function(c) {
if (c.id === item.commentId) {
if (item.replyId) {
var r = (c.replies || []).find(function(r) { return r.id === item.replyId; });
if (r) { r.deleted = true; r.text = ‘’; r.name = ‘’; }
} else {
c.deleted = true; c.text = ‘’; c.name = ‘’;
}
}
});
saveComments();
}
reportedItems = reportedItems.filter(function(r) { return r.id !== itemId; });
saveReportedItems();
renderDashboard();
renderComments();
}

// ── SPAM / CONTENT FILTER ──────────────────────────

var FILTER_STRIKES_KEY = ‘airdriftFilterStrikes’; // { email: count }
var MODS_KEY           = ‘airdriftMods’;
var modEmails          = [];
var PENDING_KEY        = ‘airdriftPending’;        // [{ id, email, name, text, time, pageUrl, commentId, isReply, parentId }]
var REPORTED_KEY       = ‘airdriftReported’;       // [{ id, email, name, text, time, pageUrl, commentId }]
var filterStrikes      = {};
var pendingItems       = [];
var reportedItems      = [];

var BANNED_WORDS = [
‘arsch’,‘asshat’,‘asshole’,‘assholes’,‘asswipe’,‘bastardize’,‘bastardly’,‘bastardo’,
‘bet now’,‘bitchass’,‘bitchface’,‘bitchmade’,‘blyad’,‘bullshit’,‘bullshitter’,‘bunda’,
‘buy drugs’,‘buy now’,‘bâtard’,‘cabrón’,‘caca’,‘cam girl’,‘casino online’,‘cazzo’,
‘child porn’,‘child rape’,‘chingada’,‘chingado’,‘chink’,‘claim your prize’,‘click here’,‘cocaine’,
‘cockhead’,‘cocksucker’,‘cocksucking’,‘congratulations winner’,‘connard’,‘coño’,‘cp link’,‘crypto giveaway’,
‘cul’,‘culo’,‘cuntface’,‘cunty’,‘cut yourself’,‘dickface’,‘dickhead’,‘dickwad’,
‘die bitch’,‘douche’,‘douchebag’,‘drug dealer’,‘dumb ass’,‘dumb bitch’,‘earn cash’,‘enculé’,
‘end your life’,‘ethnic cleansing’,‘faggot’,‘fentanyl’,‘ficken’,‘fodasse’,‘free money’,‘fuck off’,
‘fuck you’,‘fuckasshole’,‘fuckboy’,‘fucked’,‘fucker’,‘fuckers’,‘fuckery’,‘fuckface’,
‘fuckhead’,‘fucking’,‘fucktard’,‘fuckwit’,‘genocide’,‘go die’,‘go fuck yourself’,‘go kill yourself’,
‘goddammit’,‘goddamn’,‘gook’,‘hang yourself’,‘heroin’,‘how to make a bomb’,‘how to make explosives’,‘how to suicide’,
‘hure’,‘i will find you’,‘i will hurt you’,‘i will kill’,‘incel’,‘jackass’,‘jackasses’,‘joder’,
‘khuy’,‘kike’,‘kill urself’,‘kill yourself’,‘kurva’,‘kys’,‘loli’,‘make money fast’,
‘massacre’,‘merda’,‘merde’,‘meth’,‘mierda’,‘minor nude’,‘molest’,‘molester’,
‘motherfucked’,‘motherfucker’,‘motherfucking’,‘naked pics’,‘nigga’,‘nigger’,‘nude pics’,‘onlyfans link’,
‘pedo’,‘pedophile’,‘piece of shit’,‘pinche’,‘pisser’,‘pisshead’,‘pissoff’,‘poker hack’,
‘porn’,‘pornography’,‘puta’,‘putain’,‘puto’,‘rape’,‘rapist’,‘retard’,
‘retarded’,‘salope’,‘scheiss’,‘scheisse’,‘scheiße’,‘sell drugs’,‘sex video’,‘shitbag’,
‘shitface’,‘shithead’,‘shithole’,‘shitstorm’,‘shut the fuck up’,‘shut up bitch’,‘slit your wrists’,‘slutface’,
‘slutty’,‘spic’,‘stfu’,‘stronzo’,‘stupid ass’,‘stupid bitch’,‘subhuman’,‘suicide method’,
‘terrorism’,‘terrorist’,‘tranny’,‘ugly bitch’,‘underage sex’,‘vaffanculo’,‘verga’,‘wetback’,
‘whoremouth’,‘xxx’,‘you piece of shit’,‘you won’,
];

// Character substitution map (leet speak / obfuscation)
var SUBSTITUTIONS = {
‘@’:‘a’,‘4’:‘a’,‘3’:‘e’,‘1’:‘i’,’!’:‘i’,’|’:‘i’,
‘0’:‘o’,‘5’:‘s’,’$’:‘s’,‘7’:‘t’,’+’:‘t’,‘9’:‘g’,
‘8’:‘b’,‘2’:‘z’,‘6’:‘g’
};

function normalizeText(text) {
var t = text.toLowerCase();
Object.keys(SUBSTITUTIONS).forEach(function(k) {
t = t.split(k).join(SUBSTITUTIONS[k]);
});
// Collapse repeated characters (fuuuck -> fuck)
t = t.replace(/(.)\1{2,}/g, ‘$1$1’);
// Remove non-alphanumeric except spaces
t = t.replace(/[^a-z0-9\s]/g, ‘’);
return t;
}

// Safe words that contain banned substrings but are legitimate
var SAFE_WORDS = {
‘class’:1,‘classic’:1,‘classics’:1,‘classical’:1,‘classify’:1,‘classification’:1,‘classes’:1,
‘assassin’:1,‘assassinate’:1,‘assassination’:1,‘assassins’:1,
‘grass’:1,‘grassy’:1,‘brass’:1,‘mass’:1,‘lass’:1,‘pass’:1,‘glass’:1,‘crass’:1,
‘harass’:1,‘harassment’:1,‘embarrass’:1,‘embarrassment’:1,
‘compass’:1,‘bypass’:1,‘bassoon’:1,‘bassline’:1,
‘passage’:1,‘passenger’:1,‘passion’:1,‘passive’:1,‘password’:1,‘passionate’:1,
‘castle’:1,‘assemble’:1,‘assembly’:1,‘assess’:1,‘asset’:1,‘assign’:1,‘assist’:1,‘associate’:1,
‘assumption’:1,‘assistance’:1,‘assistant’:1,‘assault’:1,‘asteroid’:1,
‘scunthorpe’:1,‘accomplish’:1,‘document’:1,‘occupation’:1,‘innocent’:1,‘connect’:1
};

function containsBannedContent(text) {
if (!text) return null;
var normalized = normalizeText(text);
var wordsList = normalized.split(/\s+/);

```
// Detect letter-spaced obfuscation (e.g. 'f u c k') and collapse spaces
var singleCharCount = wordsList.filter(function(w) { return w.length === 1; }).length;
var collapsed = (singleCharCount / Math.max(wordsList.length, 1)) > 0.5
  ? normalized.replace(/\s+/g, '') : null;

for (var i = 0; i < BANNED_WORDS.length; i++) {
  var word = BANNED_WORDS[i].toLowerCase();
  var normWord = normalizeText(word);
  if (!normWord) continue;

  if (word.indexOf(' ') !== -1) {
    // Multi-word phrase
    if (normalized.indexOf(normWord) !== -1) return word;
    if (collapsed && normWord.replace(/\s+/g,'') in collapsed) return word;
  } else {
    // Word boundary check in spaced text
    var pat = new RegExp('(?:^|[^a-z])' + normWord.replace(/[.*+?^${}()|\[\]\\]/g,'\\$&') + '(?:[^a-z]|$)');
    if (pat.test(normalized)) return word;
    // Spaced obfuscation check
    if (collapsed && collapsed.indexOf(normWord) !== -1) return word;
    // Compound word check: banned word at start or end of a token
    for (var j = 0; j < wordsList.length; j++) {
      var token = wordsList[j];
      if (SAFE_WORDS[token]) continue;
      if (token.length > normWord.length && token.indexOf(normWord) !== -1) {
        if (token.indexOf(normWord) === 0 || token.indexOf(normWord) === token.length - normWord.length) {
          return word;
        }
      }
    }
  }
}
return null;
```

}

function loadFilterData() {
var s1 = localStorage.getItem(FILTER_STRIKES_KEY);
if (s1) { try { filterStrikes = JSON.parse(s1); } catch(e) { filterStrikes = {}; } }
var s2 = localStorage.getItem(PENDING_KEY);
if (s2) { try { pendingItems = JSON.parse(s2); } catch(e) { pendingItems = []; } }
var s3 = localStorage.getItem(REPORTED_KEY);
if (s3) { try { reportedItems = JSON.parse(s3); } catch(e) { reportedItems = []; } }
var s4 = localStorage.getItem(MODS_KEY);
if (s4) { try { modEmails = JSON.parse(s4); } catch(e) { modEmails = []; } }
var s5 = localStorage.getItem(REPORT_COUNTS_KEY);
if (s5) { try { reportCounts = JSON.parse(s5); } catch(e) { reportCounts = {}; } }
var s6 = localStorage.getItem(BANNED_USERS_KEY);
if (s6) { try { bannedUsers = JSON.parse(s6); } catch(e) { bannedUsers = {}; } }
var s7 = localStorage.getItem(WARNED_USERS_KEY);
if (s7) { try { warnedUsers = JSON.parse(s7); } catch(e) { warnedUsers = {}; } }
var s8 = localStorage.getItem(MOD_REPORTS_KEY);
if (s8) { try { modSelfReports = JSON.parse(s8); } catch(e) { modSelfReports = []; } }
var s9 = localStorage.getItem(FLAGGED_OWNER_KEY);
if (s9) { try { flaggedForOwner = JSON.parse(s9); } catch(e) { flaggedForOwner = []; } }
}

function saveFilterData() {
localStorage.setItem(FILTER_STRIKES_KEY, JSON.stringify(filterStrikes));
localStorage.setItem(PENDING_KEY, JSON.stringify(pendingItems));
localStorage.setItem(REPORTED_KEY, JSON.stringify(reportedItems));
localStorage.setItem(MODS_KEY, JSON.stringify(modEmails));
localStorage.setItem(REPORT_COUNTS_KEY, JSON.stringify(reportCounts));
localStorage.setItem(BANNED_USERS_KEY, JSON.stringify(bannedUsers));
localStorage.setItem(WARNED_USERS_KEY, JSON.stringify(warnedUsers));
localStorage.setItem(MOD_REPORTS_KEY, JSON.stringify(modSelfReports));
localStorage.setItem(FLAGGED_OWNER_KEY, JSON.stringify(flaggedForOwner));
// GAS HOOKUP: sync mod data (bans, warns, mods, pending, reported) across devices:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveModData’, mods: modEmails, banned: bannedUsers,
//     warned: warnedUsers, strikes: filterStrikes, pending: pendingItems,
//     reported: reportedItems, flaggedOwner: flaggedForOwner }) }).catch(function(){});
}

function recordStrike(email) {
if (!email || email === MODERATOR_EMAIL) return;
filterStrikes[email] = (filterStrikes[email] || 0) + 1;
saveFilterData();
}

// ── FLAIR TENURE SYSTEM ─────────────────────────────

var FLAIR_TENURE_KEY = ‘airdriftFlairTenure’;
var flairTenure      = {};

// No rank is shown below 100 pts
var COMMUNITY_RANKS = [
{ pts:    100, label: ‘Polly’,            emoji: ‘⭐️’,              font: ‘Caveat’ },
{ pts:    500, label: ‘Barbara Ann’,      emoji: ‘⭐️⭐️’,           font: ‘Dancing Script’ },
{ pts:   1000, label: ‘The Bard’,         emoji: ‘⭐️⭐️⭐️’,        font: ‘IM Fell English’ },
{ pts:   1500, label: ‘Wilbury’,          emoji: ‘⭐️⭐️⭐️⭐️’,     font: ‘Libre Baskerville’ },
{ pts:   2000, label: ‘Ziggy’,            emoji: ‘🌟⭐️⭐️⭐️’,      font: ‘Audiowide’ },
{ pts:   2500, label: ‘Rosetta Stoned’,   emoji: ‘🌟🌟⭐️⭐️’,       font: ‘Permanent Marker’ },
{ pts:   3000, label: ‘Crazy Diamond’,    emoji: ‘🌟🌟🌟⭐️’,        font: ‘Righteous’ },
{ pts:   3500, label: ‘Sgt. Pepper’,      emoji: ‘🌟🌟🌟🌟’,         font: ‘Lobster’ },
{ pts:   4000, label: ‘The Prince’,       emoji: ‘🐦‍🔥🌟🌟🌟’,    font: ‘Pacifico’ },
{ pts:   4500, label: ‘Queen’,            emoji: ‘🐦‍🔥🔥🌟🌟’,    font: ‘Cinzel’ },
{ pts:   5000, label: ‘The King’,         emoji: ‘🐦‍🔥🔥🔥👑’,    font: ‘Cinzel Decorative’ },
{ pts:   6000, label: ‘Van’,              emoji: ‘🎸🔥🔥🔥’,         font: ‘Oswald’ },
{ pts:   7000, label: ‘Voodoo Child’,     emoji: ‘🎸🥁🔥🔥’,         font: ‘Creepster’ },
{ pts:   8000, label: ‘Casey Jones’,      emoji: ‘🎸🥁🎹🔥’,         font: ‘Rye’ },
{ pts:   9000, label: ‘Black Dog’,        emoji: ‘🎸🥁🎹🎤’,         font: ‘Metal Mania’ },
{ pts:  10000, label: ‘The Super Villain’,emoji: ‘🎧🎹🎤🦹🏿‍♂️’,  font: ‘Bungee Shade’ },
{ pts:  12500, label: ‘The Piper’,        emoji: ‘🪽🪉🪈🧝🏻’,      font: ‘Uncial Antiqua’ },
{ pts:  15000, label: ‘The Sandman’,      emoji: ‘🎸🥁⏳😈’,         font: ‘Butcherman’ },
{ pts:  17500, label: ‘Captain Fantastic’,emoji: ‘🎧🎹🎻🎤’,         font: ‘Titan One’ },
{ pts:  20000, label: ‘The Duke’,         emoji: ‘🎺🥁🎶🎺’,         font: ‘Playfair Display’ },
{ pts:  25000, label: ‘Major Tom’,        emoji: ‘🛰️🧑🏼‍🚀🚀🌎’,  font: ‘Orbitron’ },
{ pts:  30000, label: ‘Rocket Man’,       emoji: ‘🚀🧑🏼‍🚀🎹🎤’,  font: ‘Exo 2’ },
{ pts:  35000, label: ‘Iron Man’,         emoji: ‘🤘🏼🎸🤖🦇’,      font: ‘Black Ops One’ },
{ pts:  40000, label: ‘Jack Flash’,       emoji: ‘🎸🥁🎤🧑🏽‍🎤’,  font: ‘Alfa Slab One’ },
{ pts:  50000, label: ‘Yoshimi’,          emoji: ‘👱🏼‍♀️🤖🤖🤖’,  font: ‘Zen Tokyo Zoo’ },
{ pts:  60000, label: ‘Pink’,             emoji: ‘🐽🧱🐕🎸’,         font: ‘Boogaloo’ },
{ pts:  70000, label: ‘Wolf Haley’,       emoji: ‘🐺⛳️🎤😈’,        font: ‘Rubik Glitch’ },
{ pts:  80000, label: ‘The Walrus’,       emoji: ‘🧑🏼‍🎤🌊🦭🌞’,  font: ‘Abril Fatface’ },
{ pts:  90000, label: ‘Superstar’,        emoji: ‘🌟🤩💖🙌🏼’,      font: ‘Monoton’ },
{ pts: 100000, label: ‘Johnny B. Goode’,  emoji: ‘🕺🪩💃🎸’,        font: ‘Boogaloo’ },
];

function getCommunityRank(pts) {
var rank = null;
for (var i = 0; i < COMMUNITY_RANKS.length; i++) {
if (pts >= COMMUNITY_RANKS[i].pts) rank = COMMUNITY_RANKS[i];
else break;
}
return rank; // null if below 100
}

function getRatingWithAdjustment(email) {
var base = getTotalVotes(email);
var adj  = 0;
try { adj = parseInt(localStorage.getItem(‘airdriftRatingAdj:’ + email) || ‘0’) || 0; } catch(e) {}
return base + adj;
}

// tier: 0=silver(default), 1=orange(Knighted+), 2=purple(Transcendent+)
var TENURE_TIERS = [
{ months:  3, label: ‘❂ Stakeholder’, style: 0 },
{ months:  6, label: ‘✧ VIP’,         style: 0 },
{ months:  9, label: ‘◈ Epic’,        style: 0 },
{ months: 12, label: ‘⚜ Knighted’,    style: 1 },
{ months: 18, label: ‘⚔ Legendary’,   style: 1 },
{ months: 24, label: ‘✤ Mythic’,      style: 1 },
{ months: 30, label: ‘⁂ Eternal’,     style: 1 },
{ months: 36, label: ‘❈ Transcendent’,style: 2 },
{ months: 42, label: ‘❃ Alpha’,       style: 2 },
{ months: 48, label: ‘⍟ Apex’,       style: 2 },
{ months: 54, label: ‘♛ Omega’,       style: 2 },
{ months: 60, label: ‘✺ Zenith’,      style: 2 },
];

var TENURE_QUALIFYING = [‘subscriber’,‘member’,‘collector’];

function loadFlairTenure() {
var s = localStorage.getItem(FLAIR_TENURE_KEY);
if (s) { try { flairTenure = JSON.parse(s); } catch(e) { flairTenure = {}; } }
}
function saveFlairTenure() { localStorage.setItem(FLAIR_TENURE_KEY, JSON.stringify(flairTenure)); }

function recordFlairTenure(email, tier) {
if (TENURE_QUALIFYING.indexOf(tier) === -1) { clearFlairTenure(email); return; }
if (!flairTenure[email]) {
flairTenure[email] = { tier: tier, since: new Date().toISOString() };
saveFlairTenure();
} else if (flairTenure[email].tier !== tier) {
flairTenure[email].tier = tier;
saveFlairTenure();
}
}
function clearFlairTenure(email) { delete flairTenure[email]; saveFlairTenure(); }

function getMonthsSince(isoDate) {
var s = new Date(isoDate), n = new Date();
return (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
}

var _lastTenureBadge = {};

function getTenureBadge(email) {
var t = flairTenure[email]; if (!t) return ‘’;
var months  = getMonthsSince(t.since);
var earnedIdx = -1;
for (var i = TENURE_TIERS.length - 1; i >= 0; i–) {
if (months >= TENURE_TIERS[i].months) { earnedIdx = i; break; }
}
if (earnedIdx === -1) return ‘’;
var earnedTier = TENURE_TIERS[earnedIdx];
var isZenith   = (earnedIdx === TENURE_TIERS.length - 1);
// If Zenith, check for custom badge selection
var displayTier = earnedTier;
if (isZenith) {
var choiceStr = null;
try { choiceStr = localStorage.getItem(‘airdriftTenureChoice:’ + email); } catch(e) {}
var choiceIdx = parseInt(choiceStr);
if (!isNaN(choiceIdx) && choiceIdx >= 0 && choiceIdx < TENURE_TIERS.length) {
displayTier = TENURE_TIERS[choiceIdx];
}
}
var styleClass = displayTier.style === 2 ? ‘flair-tenure tenure-purple’
: displayTier.style === 1 ? ‘flair-tenure tenure-orange’
: ‘flair-tenure tenure-silver’;
var tierLabel = t.tier ? (t.tier.charAt(0).toUpperCase() + t.tier.slice(1)) : ‘’;
var tooltip = ‘Awarded for ’ + months + ’ month’ + (months === 1 ? ‘’ : ‘s’) + ’ with ’ + tierLabel + ’ flair’;
// Milestone detection
if (currentUser && email === currentUser.email) {
if (!_lastTenureBadge[email]) {
_lastTenureBadge[email] = earnedTier.label;
} else if (*lastTenureBadge[email] !== earnedTier.label) {
var f = FLAIR_DISPLAY[t.tier];
if (isZenith) {
showAnnouncement(
‘✺ Zenith Achieved’,
‘Extraordinary. You have reached <strong style="color:#b07ad6;">Zenith</strong> — the highest flair tenure rank.<br><br>’ +
‘You may now choose any tenure badge to display on your profile.<br><br>’ +
‘<em style="color:#555;font-size:11px;">Open your profile card → Settings to customize.</em>’,
‘✺’
);
notifications.unshift({ id:’zenith_unlock*’+Date.now(), type:‘system’, read:false,
fromName:‘AirdriftSignals’,
preview:’✺ You reached Zenith — open Profile → Settings to choose your badge.’,
time:new Date().toISOString(), pageUrl:window.location.pathname });
saveNotifications(); renderNotifBell();
} else {
var flairName = f ? f.label : (FLAIR_DISPLAY[t.tier] ? FLAIR_DISPLAY[t.tier].label : t.tier);
showAnnouncement(‘Tenure Milestone!’,
‘You've earned the <strong>’ + earnedTier.label + ‘</strong> badge for ’ + months +
’ month’ + (months !== 1 ? ‘s’ : ‘’) + ’ with ’ + flairName + ’ flair!’, ‘🏆’);
}
_lastTenureBadge[email] = earnedTier.label;
}
}
return ‘<span class="' + styleClass + '" data-tooltip="' + tooltip + '"><span class="tn">’ + displayTier.label + ‘</span></span>’;
}

function getTenureLabel(email) {
var t = flairTenure[email]; if (!t) return ‘’;
var months = getMonthsSince(t.since);
for (var i = TENURE_TIERS.length - 1; i >= 0; i–) {
if (months >= TENURE_TIERS[i].months)
return TENURE_TIERS[i].label + ’ (’ + months + ’ month’ + (months > 1 ? ‘s’ : ‘’) + ‘)’;
}
return months > 0 ? months + ’ month’ + (months > 1 ? ‘s’ : ‘’) + ’ with flair’ : ‘’;
}

// ── SIGNED-IN TOAST ─────────────────────────────────

// ── PROFILE CARD ─────────────────────────────────────

var profileCardTarget = null;

function getCommentCount(email) {
var count = 0;
var keys = Object.keys(localStorage).filter(function(k) { return k.indexOf(‘airdriftComments:’) === 0; });
keys.forEach(function(key) {
try {
var items = JSON.parse(localStorage.getItem(key)) || [];
items.forEach(function(c) {
if (c.email === email && !c.deleted) count++;
(c.replies || []).forEach(function(r) {
if (r.email === email && !r.deleted) count++;
});
});
} catch(e) {}
});
return count;
}

function getTotalVotes(email) {
var total = 0;
var keys = Object.keys(localStorage).filter(function(k) { return k.indexOf(‘airdriftComments:’) === 0; });
keys.forEach(function(key) {
try {
var items = JSON.parse(localStorage.getItem(key)) || [];
items.forEach(function(c) {
if (c.email === email) total += ((c.upvotes || 0) - (c.downvotes || 0));
(c.replies || []).forEach(function(r) {
if (r.email === email) total += ((r.upvotes || 0) - (r.downvotes || 0));
});
});
} catch(e) {}
});
return total;
}

function getMemberSince(email) {
// Find earliest comment timestamp for this user
var earliest = null;
var keys = Object.keys(localStorage).filter(function(k) { return k.indexOf(‘airdriftComments:’) === 0; });
keys.forEach(function(key) {
try {
var items = JSON.parse(localStorage.getItem(key)) || [];
items.forEach(function(c) {
if (c.email === email && c.time) {
if (!earliest || c.time < earliest) earliest = c.time;
}
(c.replies || []).forEach(function(r) {
if (r.email === email && r.time) {
if (!earliest || r.time < earliest) earliest = r.time;
}
});
});
} catch(e) {}
});
if (!earliest) return ‘Unknown’;
var d = new Date(earliest);
return d.toLocaleDateString(‘en-US’, { month: ‘long’, year: ‘numeric’ });
}

function openProfileCard(email, name, anchorEl) {
var card = document.getElementById(‘profile-card’);
if (!card) return;

```
// Toggle off if same target
if (profileCardTarget === email && card.style.display !== 'none') {
  card.style.display = 'none';
  profileCardTarget = null;
  return;
}
profileCardTarget = email;

var tier      = flairPageData[email] || flairData[email];
var flairHtml = tier && FLAIR_DISPLAY[tier]
  ? '<div class="pc-flair">' + getUserFlair(email) + '</div>' : '';
// Tenure shown inline in flair badge via getTenureBadge()
var comments  = getCommentCount(email);
var votes     = getTotalVotes(email);
var since     = getMemberSince(email);
var isModerator = isMod(email);
var isOwner   = email === MODERATOR_EMAIL;

var isOwnCard = currentUser && currentUser.email === email;
var unreadCount = notifications.filter(function(n) { return !n.read; }).length;
var rating = getRatingWithAdjustment(email);
var rank   = getCommunityRank(rating);

card.innerHTML =
  (function(){
    var nameColor = '';
    try { nameColor = localStorage.getItem('airdriftUsernameColor:' + email) || ''; } catch(e) {}
    var nameStyle = nameColor ? ' style="color:' + nameColor + ';-webkit-text-fill-color:' + nameColor + ';"' : '';
    return '<div class="pc-name"><span' + nameStyle + '>' + escapeHTML(name) + '</span>';
  })() +
    (isOwner ? ' <span class="comment-badge" style="font-size:9px;">&#x270D;&#xFE0F; Author</span>' :
     isModerator ? ' <span class="mod-badge" style="font-size:9px;">&#x1F6E1;&#xFE0F; Mod</span>' : '') +
  '</div>' +
  flairHtml +
  // Tenure badge is already shown inline via getTenureBadge() inside getUserFlair; no separate label needed
  (rank ? '<div class="pc-rank">' + rank.emoji + '</div>' +
          '<div class="pc-rank-label" style="font-family:\'' + rank.font + '\', Georgia, serif;">' + escapeHTML(rank.label) + '</div>' : '') +
  (getUserBio(email) ? '<div class="pc-bio" id="pc-bio-display">' + renderBioFormatted(getUserBio(email)) + '</div>' : '') +
  '<div class="pc-row"><span class="pc-label">Member since</span><span class="pc-value">' + since + '</span></div>' +
  '<div class="pc-row"><span class="pc-label">Comments</span><span class="pc-value">' + comments + '</span></div>' +
  '<div class="pc-row"><span class="pc-label">Community rating</span><span class="pc-value" style="color:#c9a84c;text-shadow:0 0 8px rgba(201,168,76,0.5),0 0 16px rgba(201,168,76,0.2);font-weight:700;">' + rating + '</span></div>' +
  // Tabs: main actions | settings (own card only)
  (isOwnCard ?
    '<div class="pc-tabs">' +
      '<div class="pc-tab active" onclick="pcSwitchTab(this,\'main\')" data-tab="main">Profile</div>' +
      '<div class="pc-tab" onclick="pcSwitchTab(this,\'settings\')" data-tab="settings">&#x2699;&#xFE0F; Settings</div>' +
    '</div>' : '') +
  // Main tab
  '<div class="pc-tab-panel active" id="pc-panel-main">' +
  '</div>' +
  // Settings tab
  (isOwnCard ?
    '<div class="pc-tab-panel" id="pc-panel-settings">' +
    '</div>' : '');

// Buttons row -- inject into pc-panel-main
var canDm = currentUser && isMod(currentUser.email) && !isOwnCard;
var safeEmail = email.replace(/'/g,'&#39;');
var safeName  = escapeHTML(name).replace(/'/g,'&#39;');
var mainPanel = card.querySelector('#pc-panel-main');
if (mainPanel) mainPanel.innerHTML =
  '<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">' +
    '<div style="display:flex;gap:6px;">' +
      '<button onclick="openUserComments(\'' + safeEmail + '\',\'' + safeName + '\')" style="flex:1;background:none;border:1px solid #2a5f7f;color:#2a5f7f;padding:5px 8px;border-radius:4px;font-size:11px;cursor:pointer;">&#x1F4AC; Comments</button>' +
      (canDm ? '<button onclick="openDmWindow(\'' + safeEmail + '\',\'' + safeName + '\',true)" style="background:none;border:1px solid #b89f37;color:#b89f37;padding:5px 8px;border-radius:4px;font-size:11px;cursor:pointer;">&#x2709;&#xFE0F; DM</button>' : '') +
    '</div>' +
    (isOwnCard ?
      '<div style="display:flex;gap:6px;">' +
        '<button onclick="openNotificationsFromCard()" style="flex:1;background:none;border:1px solid #b89f37;color:#b89f37;padding:5px 8px;border-radius:4px;font-size:11px;cursor:pointer;">' +
          '&#x1F6CE;&#xFE0F; Notifications' + (unreadCount > 0 ? ' (' + unreadCount + ')' : '') + '</button>' +
        '<button onclick="closeProfileCard()" style="background:none;border:1px solid #333;color:#555;padding:5px 8px;border-radius:4px;font-size:11px;cursor:pointer;">Dismiss</button>' +
      '</div>' : '') +
  '</div>';

// Settings tab -- own card only
var settingsPanel = card.querySelector('#pc-panel-settings');
if (settingsPanel && isOwnCard) {
  var lightChecked = document.body.classList.contains('airdrift-light') ? 'checked' : '';
  var subs = getSubscriptions();
  var subPages = Object.keys(subs).filter(function(p) { return subs[p]; });
  var subHtml = subPages.length === 0
    ? '<div style="font-size:11px;color:#555;padding:6px 0;">No subscriptions.</div>'
    : subPages.map(function(p) {
        var short = p.replace(/\/[0-9]{4}\/[0-9]{2}\//,'/.../'); // shorten blogger paths
        return '<div class="pc-setting-row">' +
          '<div><div class="pc-setting-label">' + escapeHTML(short) + '</div></div>' +
          '<label class="pc-toggle"><input type="checkbox" checked onchange="pcToggleSub(this,\'' + p.replace(/'/g,'&#39;') + '\')" /><span class="slider"></span></label>' +
        '</div>';
      }).join('');
  // Check if user is Zenith
  var userTenure = flairTenure[currentUser.email];
  var userMonths = userTenure ? getMonthsSince(userTenure.since) : 0;
  var isZenithUser = userMonths >= TENURE_TIERS[TENURE_TIERS.length - 1].months;
  var badgeDropdown = '';
  if (isZenithUser) {
    var currentChoice = null;
    try { currentChoice = localStorage.getItem('airdriftTenureChoice:' + currentUser.email); } catch(e) {}
    var currentChoiceIdx = parseInt(currentChoice);
    var opts = TENURE_TIERS.map(function(tier, idx) {
      var sel = (!isNaN(currentChoiceIdx) && currentChoiceIdx === idx) ? ' selected' : '';
      return '<option value="' + idx + '"' + sel + '>' + tier.label + '</option>';
    }).join('');
    // Default option (Zenith) if no custom choice
    var defaultSel = (isNaN(currentChoiceIdx)) ? ' selected' : '';
    badgeDropdown =
      '<div style="margin:12px 0 6px;font-size:10px;color:#b89f37;text-transform:uppercase;letter-spacing:0.06em;">&#x273a; Zenith -- Badge Display</div>' +
      '<div style="font-size:10px;color:#555;margin-bottom:6px;">Choose any tenure badge to display on your profile.</div>' +
      '<select onchange="pcSetTenureBadge(this)" style="width:100%;background:#111;border:1px solid #2a5f7f;color:#ffffff;padding:5px 8px;border-radius:4px;font-size:11px;font-family:inherit;outline:none;">' +
      '<option value=""' + defaultSel + '>✺ Zenith (default)</option>' +
      opts +
      '</select>';
  }
  // Bio section -- Supporter+
  var userTierSelf = getUserTier(currentUser.email);
  var isAuthor = currentUser.email === MODERATOR_EMAIL;
  var canBio = isAuthor || (userTierSelf && BIO_TIERS.indexOf(userTierSelf) !== -1);
  var currentBio = getUserBio(currentUser.email);
  var bioHtml = '';
  if (canBio) {
    bioHtml =
      '<div style="margin:10px 0 4px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.06em;">Bio</div>' +
      '<textarea id="pc-bio-input" class="pc-bio-edit" maxlength="160" oninput="pcBioCounter(this)" placeholder="Write a short bio (160 chars)...">' + escapeHTML(currentBio) + '</textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<span id="pc-bio-chars" style="font-size:10px;color:#555;">' + currentBio.length + '/160</span>' +
        '<button onclick="pcSaveBio()" style="background:linear-gradient(135deg,#2a5f7f,#1a3f5f);color:#b89f37;border:none;padding:4px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-family:inherit;">Save</button>' +
      '</div>';
  }
  // Username color section -- Subscriber+ basic, Member+ premium
  var canColor = isAuthor || (userTierSelf && COLOR_BASIC_TIERS.indexOf(userTierSelf) !== -1);
  var isPremium = isAuthor || (userTierSelf && COLOR_PREMIUM_TIERS.indexOf(userTierSelf) !== -1);
  var currentColor = '';
  try { currentColor = localStorage.getItem('airdriftUsernameColor:' + currentUser.email) || ''; } catch(e) {}
  var colorHtml = '';
  if (canColor) {
    var allPalette = USERNAME_COLORS_BASIC.slice();
    if (isPremium) allPalette = allPalette.concat(USERNAME_COLORS_PREMIUM);
    var swatches = allPalette.map(function(c) {
      var sel = currentColor === c.value;
      var bg  = c.value || '#FF6B35';
      return '<button class="color-swatch" data-color="' + c.value + '" onclick="pcSetUsernameColor(\'' + c.value + '\')" title="' + c.label + '" style="width:20px;height:20px;border-radius:50%;background:' + bg + ';border:2px solid ' + (sel ? '#fff' : 'transparent') + ';cursor:pointer;flex-shrink:0;"></button>';
    }).join('');
    colorHtml =
      '<div style="margin:10px 0 4px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.06em;">Username Color' + (isPremium ? ' <span style="color:#b89f37;font-style:normal;">+ Premium</span>' : '') + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">' + swatches + '</div>';
  }
  // Hover text picker — Subscriber+ with options defined for their tier
  var hoverHtml = '';
  if (userTierSelf && HOVER_PICKER_TIERS.indexOf(userTierSelf) !== -1) {
    var tierOpts = HOVER_OPTIONS[userTierSelf] || [];
    if (tierOpts.length > 0) {
      var currentHover = '';
      try {
        var ub = JSON.parse(localStorage.getItem('airdriftFlairColorByUser:' + currentUser.email) || 'null');
        if (ub) currentHover = ub.tooltip || '';
        else {
          var ovr = FLAIR_COLOR_BY_USER[currentUser.email] || {};
          currentHover = ovr.tooltip || '';
        }
      } catch(e) {}
      var hoverOpts = tierOpts.map(function(opt) {
        var sel = currentHover === opt ? ' selected' : '';
        return '<option value="' + escapeHTML(opt) + '"' + sel + '>' + escapeHTML(opt) + '</option>';
      }).join('');
      hoverHtml =
        '<div style="margin:10px 0 4px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.06em;">Flair Hover Text</div>' +
        '<select onchange="pcSetHoverText(this)" style="width:100%;background:#111;border:1px solid #2a2a2a;color:#aaa;padding:5px 8px;border-radius:4px;font-size:11px;font-family:inherit;outline:none;margin-bottom:8px;">' +
          '<option value="">-- None --</option>' +
          hoverOpts +
        '</select>';
    }
  }
  settingsPanel.innerHTML =
    '<div class="pc-setting-row">' +
      '<div class="pc-setting-label">&#x2600;&#xFE0F; Light / Dark Mode</div>' +
      '<label class="pc-toggle"><input type="checkbox" ' + lightChecked + ' onchange="pcToggleTheme(this)" /><span class="slider"></span></label>' +
    '</div>' +
    bioHtml +
    colorHtml +
    hoverHtml +
    badgeDropdown +
    '<div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 4px;">Subscriptions</div>' +
    subHtml;
}

// Position card near anchor
card.style.display = 'block';
var aRect = anchorEl.getBoundingClientRect();
var scrollY = window.scrollY || window.pageYOffset;
var scrollX = window.scrollX || window.pageXOffset;
card.style.top  = (aRect.bottom + scrollY + 4) + 'px';
var left = aRect.left + scrollX;
// Keep within viewport
var maxLeft = window.innerWidth - 290;
card.style.left = Math.min(left, maxLeft) + 'px';
```

}

function closeProfileCard() {
var card = document.getElementById(‘profile-card’);
if (card) card.style.display = ‘none’;
profileCardTarget = null;
// Start 5s fade on toast if it’s still visible
var toast = document.getElementById(‘signin-toast’);
if (toast && toast.classList.contains(‘visible’)) {
toast.style.transition = ‘opacity 5s ease’;
toast.classList.add(‘fading’);
toast.classList.remove(‘visible’);
}
}

function openNotificationsFromCard() {
closeProfileCard();
// Show bell and open notification panel
var bell = document.getElementById(‘notif-bell’);
if (bell) bell.style.display = ‘block’;
var panel = document.getElementById(‘notif-panel’);
if (panel) panel.classList.add(‘open’);
renderNotifBell();
}

function closeProfileCardOnOutsideClick(e) {
var card = document.getElementById(‘profile-card’);
if (!card || card.style.display === ‘none’) return;
var t = e.target;
// Don’t close if clicking a username link – the user-link handler will toggle it
if (t.classList.contains(‘user-link’) || t.classList.contains(‘comment-name’) || t.classList.contains(‘reply-name’)) return;
if (card.contains(t)) return;
card.style.display = ‘none’;
profileCardTarget = null;
}

document.addEventListener(‘click’, closeProfileCardOnOutsideClick);

document.addEventListener(‘click’, function(e) {
var el = e.target;
if (el.classList.contains(‘user-link’) || el.classList.contains(‘comment-name’) || el.classList.contains(‘reply-name’)) {
if (el.dataset.email) {
e.stopPropagation();
openProfileCard(el.dataset.email, el.dataset.name || el.textContent, el);
}
}
});

// ── SUBSCRIBE TO DISCUSSION ───────────────────────────

function getSubscriptions() {
var s = localStorage.getItem(SUBSCRIPTIONS_KEY);
try { return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
}

function getPageKey() {
// Normalize pathname – strip trailing slash for consistent keying
return window.location.pathname.replace(//+$/, ‘’) || ‘/’;
}

function isSubscribedToPage() {
var subs = getSubscriptions();
return !!(subs[getPageKey()] || subs[window.location.pathname]);
}

function toggleSubscribeDiscussion() {
if (!currentUser) { showSignInModal(‘Sign in to subscribe to this discussion.’); return; }
var subs = getSubscriptions();
var page = getPageKey();
if (subs[page]) {
// Unsubscribe
delete subs[page];
localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
// TODO: sync unsubscribe to GAS when backend is live:
// fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘unsubscribe’, email: currentUser.email, pageUrl: page }) })
updateSubscribeBtn();
} else {
// Show confirmation prompt
var confirmed = window.confirm(
‘Subscribe to this discussion?\n\n’ +
‘You will receive a notification whenever a new top-level comment is posted on this page.’
);
if (!confirmed) return;
subs[page] = true;
localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
// TODO: sync subscribe to GAS when backend is live:
// fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘subscribe’, email: currentUser.email,
//     pageUrl: page, pageTitle: document.title }) })
//   .catch(function() {});
updateSubscribeBtn();
}
}

function updateSubscribeBtn() {
var btn = document.getElementById(‘subscribe-btn’);
if (!btn || !currentUser) return;
var subscribed = isSubscribedToPage();
btn.style.display = ‘inline-block’;
if (subscribed) {
btn.textContent = ‘\u2714\uFE0F Subscribed’;
btn.style.borderColor = ‘#b89f37’;
btn.style.color = ‘#b89f37’;
} else {
btn.innerHTML = ‘🔔 Subscribe’;
btn.style.borderColor = ‘#2a5f7f’;
btn.style.color = ‘#2a5f7f’;
}
}

// Check if a new top-level comment should trigger subscriber notifications
function notifySubscribers(comment) {
// TODO: when GAS is live, POST to GAS to email all subscribers for this page:
// fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘notifySubscribers’, pageUrl: window.location.pathname,
//     pageTitle: document.title, commentAuthor: comment.name,
//     commentPreview: comment.text.substring(0,100) }) })
//   .catch(function() {});
}

// Per-tab toast tracking: generate a unique ID for this tab stored in sessionStorage
// sessionStorage IS per-tab already – each tab has its own sessionStorage.
// The real issue was we were using a shared key. Use a per-user key so signing in
// as different users on the same tab works correctly too.
function getToastKey() {
return currentUser ? ‘airdriftToastShown:’ + currentUser.email : null;
}

function showSignedInToast(forceShow) {
if (!currentUser) return;
var key = getToastKey();
// forceShow: always show (fresh sign-in). Otherwise show once per tab per user.
if (!forceShow && key && sessionStorage.getItem(key)) return;
if (key) sessionStorage.setItem(key, ‘1’);

```
var toast = document.getElementById('signin-toast');
if (!toast) return;

// Build toast with notifications and dismiss buttons
toast.innerHTML =
  '<span style="margin-right:10px;">Signed in as <strong style="color:#b89f37;">' + escapeHTML(currentUser.name) + '</strong></span>' +
  '<button onclick="openProfileCardSelf(event)" style="background:none;border:1px solid #2a5f7f;color:#2a5f7f;' +
    'font-size:10px;padding:2px 8px;border-radius:4px;cursor:pointer;margin-right:6px;">Profile</button>' +
  '<button onclick="dismissToast(event)" style="background:none;border:1px solid #444;color:#555;' +
    'font-size:10px;padding:2px 8px;border-radius:4px;cursor:pointer;">Dismiss</button>';

toast.style.transition = 'opacity 0.5s ease';
toast.classList.remove('fading');
toast.classList.add('visible');

// Fade after 3 seconds over 5 seconds
var toastTimer = setTimeout(function() {
  toast.style.transition = 'opacity 5s ease';
  toast.classList.add('fading');
  toast.classList.remove('visible');
}, 3000);
// Cancel fade if user interacts with toast
toast.addEventListener('mouseenter', function() { clearTimeout(toastTimer); });
toast.addEventListener('click', function() { clearTimeout(toastTimer); });
```

}

function dismissToast(e) {
if (e) e.stopPropagation();
var toast = document.getElementById(‘signin-toast’);
if (!toast) return;
toast.style.transition = ‘opacity 5s ease’;
toast.classList.add(‘fading’);
toast.classList.remove(‘visible’);
}

function openProfileCardSelf(e) {
if (e) e.stopPropagation();
if (!currentUser) return;
// Restore toast to fully visible state before opening card
var toast = document.getElementById(‘signin-toast’);
if (toast) {
toast.style.transition = ‘opacity 0.3s ease’;
toast.classList.remove(‘fading’);
toast.classList.add(‘visible’);
}
openProfileCard(currentUser.email, currentUser.name, toast || document.body);
}

// ── MOD DASHBOARD SESSION CONTROL ──────────────────
var dashboardSeenThisSession = !!(sessionStorage.getItem(‘airdriftDashSeen’));

function markDashboardSeen() {
dashboardSeenThisSession = true;
sessionStorage.setItem(‘airdriftDashSeen’, ‘1’);
}

// Track item counts so we can detect new items arriving mid-session
var lastDashItemCount = 0;

function getDashItemCount() {
var flagged = Object.keys(filterStrikes).filter(function(e) { return filterStrikes[e] >= 3; });
var ownerCount = (currentUser && currentUser.email === MODERATOR_EMAIL) ? flaggedForOwner.length : 0;
return pendingItems.length + reportedItems.length + flagged.length + ownerCount;
}

function updateDashboardBtn() {
var btn = document.getElementById(‘mod-dashboard-btn’);
if (!btn || !currentUser || !isMod(currentUser.email)) return;
btn.style.display = ‘inline-block’;
var count = getDashItemCount();
if (count > lastDashItemCount && dashboardSeenThisSession) {
// New items arrived mid-session – highlight button
btn.style.borderColor = ‘#FF6B35’;
btn.style.color = ‘#FF6B35’;
btn.textContent = ‘\u2699\uFE0F Dashboard (’ + count + ‘)’;
} else if (count > 0 && !dashboardSeenThisSession) {
btn.style.borderColor = ‘#b89f37’;
btn.style.color = ‘#b89f37’;
btn.textContent = ‘\u2699\uFE0F Dashboard (’ + count + ‘)’;
} else {
btn.style.borderColor = ‘#2a5f7f’;
btn.style.color = ‘#2a5f7f’;
btn.textContent = ‘\u2699\uFE0F Dashboard’;
}
lastDashItemCount = count;
}

function loadRateTimestamps() {
if (!currentUser) return;
var now = Date.now();
var cr = localStorage.getItem(COMMENT_RATE_KEY);
var crMap = cr ? (function(){ try { return JSON.parse(cr); } catch(e) { return {}; } })() : {};
commentTimestamps = (crMap[currentUser.email] || []).filter(function(t) { return now - t < 3600000; });
var rr = localStorage.getItem(REPORT_RATE_KEY);
var rrMap = rr ? (function(){ try { return JSON.parse(rr); } catch(e) { return {}; } })() : {};
reportTimestamps = (rrMap[currentUser.email] || []).filter(function(t) { return now - t < 3600000; });
}
function saveCommentTimestamps() {
if (!currentUser) return;
var cr = localStorage.getItem(COMMENT_RATE_KEY);
var crMap = cr ? (function(){ try { return JSON.parse(cr); } catch(e) { return {}; } })() : {};
crMap[currentUser.email] = commentTimestamps;
localStorage.setItem(COMMENT_RATE_KEY, JSON.stringify(crMap));
}
function saveReportTimestamps() {
if (!currentUser) return;
var rr = localStorage.getItem(REPORT_RATE_KEY);
var rrMap = rr ? (function(){ try { return JSON.parse(rr); } catch(e) { return {}; } })() : {};
rrMap[currentUser.email] = reportTimestamps;
localStorage.setItem(REPORT_RATE_KEY, JSON.stringify(rrMap));
}
function checkCommentRateLimit() {
var now = Date.now();
commentTimestamps = commentTimestamps.filter(function(t) { return now - t < 3600000; });
var lastMinute = commentTimestamps.filter(function(t) { return now - t < 60000; });
if (lastMinute.length >= 5) return ‘You are posting too quickly. Please wait a moment.’;
if (commentTimestamps.length >= 50) return ‘You have reached the comment limit for this hour.’;
return null;
}
function recordCommentTimestamp() { commentTimestamps.push(Date.now()); saveCommentTimestamps(); }
function checkReportRateLimit() {
var now = Date.now();
reportTimestamps = reportTimestamps.filter(function(t) { return now - t < 3600000; });
if (reportTimestamps.length >= 10) return ‘You have reached the report limit for this hour.’;
return null;
}
function recordReportTimestamp() { reportTimestamps.push(Date.now()); saveReportTimestamps(); }
function isUserBanned(email) { return !!bannedUsers[email]; }
function resolveMultiple(raw) {
return raw.split(’,’).map(function(e){return e.trim();})
.filter(function(e){return e.length>0;})
.map(resolveEmailFromInput)
.filter(function(e){return !!e;});
}
function resolveEmailAnyPage(input) {
// Like resolveEmailFromInput but also scans ALL comment pages in localStorage
var found = resolveEmailFromInput(input);
if (found) return found;
// Not on current page – scan all pages
input = input.trim().toLowerCase();
Object.keys(localStorage).forEach(function(key) {
if (found || key.indexOf(‘airdriftComments:’) !== 0) return;
try {
var items = JSON.parse(localStorage.getItem(key)) || [];
items.forEach(function(c) {
if (found) return;
if (c.email && c.email.toLowerCase() === input) { found = c.email.toLowerCase(); return; }
if (c.name && c.name.toLowerCase() === input)   { found = c.email.toLowerCase(); return; }
(c.replies || []).forEach(function(r) {
if (found) return;
if (r.email && r.email.toLowerCase() === input) { found = r.email.toLowerCase(); return; }
if (r.name  && r.name.toLowerCase()  === input) { found = r.email.toLowerCase(); return; }
});
});
} catch(e) {}
});
return found || null;
}

function adminBanUsers(rawInput) {
var inputs = rawInput.split(’,’).map(function(e){return e.trim();}).filter(function(e){return e.length>0;});
var emails = inputs.map(resolveEmailAnyPage).filter(function(e){return !!e;});
if (emails.length===0) return ‘Error: no valid users found. Try their exact username or email.’;
var blocked = emails.filter(function(e){return e===MODERATOR_EMAIL||isMod(e);});
if (blocked.length>0) return ‘Error: cannot ban moderators.’;
var names = emails.map(function(e){return usernameMap[e]||e;});
if (!window.confirm(‘Shadow ban ‘+names.join(’, ‘)+’? Their existing comments stay visible. New posts will be hidden from others.’)) return ‘Cancelled.’;
emails.forEach(function(e){bannedUsers[e]=true;});
localStorage.setItem(BANNED_USERS_KEY,JSON.stringify(bannedUsers));
return ‘Done. Shadow banned: ‘+names.join(’, ‘)+’.’;
}
function adminReinstateUsers(rawInput) {
var inputs = rawInput.split(’,’).map(function(e){return e.trim();}).filter(function(e){return e.length>0;});
var emails = inputs.map(resolveEmailAnyPage).filter(function(e){return !!e;});
if (emails.length===0) return ‘Error: no valid users found.’;
var names = emails.map(function(e){return usernameMap[e]||e;});
if (!window.confirm(‘Reinstate ‘+names.join(’, ‘)+’?’)) return ‘Cancelled.’;
emails.forEach(function(e){delete bannedUsers[e];localStorage.setItem(‘airdriftReinstate:’+e,‘1’);});
localStorage.setItem(BANNED_USERS_KEY,JSON.stringify(bannedUsers));
return ‘Done. Reinstated: ‘+names.join(’, ‘)+’.’;
}
function adminWarnUsers(rawInput) {
var emails = resolveMultiple(rawInput);
if (emails.length===0) return ‘Error: no valid users found.’;
var results=[];
emails.forEach(function(email){
if (email === MODERATOR_EMAIL) { results.push(‘Cannot warn the site owner.’); return; }
if (isMod(email)) { results.push(‘Cannot warn a moderator.’); return; }
if (currentUser && email === currentUser.email) { results.push(‘Cannot warn yourself.’); return; }
var name=usernameMap[email]||email;
var current=warnedUsers[email]||0;
var q=current>0?name+’ has ‘+current+’ warning’+(current>1?‘s’:’’)+’. Add another?’:‘Give ‘+name+’ their first warning?’;
if (window.confirm(q)){
warnedUsers[email]=current+1;
localStorage.setItem(‘airdriftWarn:’+email,warnedUsers[email].toString());
results.push(name+’ now has ‘+warnedUsers[email]+’ warning’+(warnedUsers[email]>1?‘s’:’’));
} else {results.push(name+’: skipped’);}
});
localStorage.setItem(WARNED_USERS_KEY,JSON.stringify(warnedUsers));
return results.join(’ | ‘);
}
function adminAssignMods(rawInput) {
var emails=resolveMultiple(rawInput);
if (emails.length===0) return ‘Error: no valid users found.’;
var results=[];
emails.forEach(function(email){
if (email===MODERATOR_EMAIL){results.push(‘Cannot reassign site owner’);return;}
if (modEmails.indexOf(email)!==-1){results.push(email+’ already mod’);return;}
modEmails.push(email);results.push(email+’ is now a mod’);
});
localStorage.setItem(MODS_KEY,JSON.stringify(modEmails));
return results.join(’ | ‘);
}
function adminRemoveMods(rawInput) {
var emails=resolveMultiple(rawInput);
if (emails.length===0) return ‘Error: no valid users found.’;
var results=[];
emails.forEach(function(email){
if (email===MODERATOR_EMAIL){results.push(‘Cannot remove site owner’);return;}
var idx=modEmails.indexOf(email);
if (idx===-1){results.push(email+’ is not a mod’);return;}
modEmails.splice(idx,1);results.push(email+’ removed from mods’);
});
localStorage.setItem(MODS_KEY,JSON.stringify(modEmails));
return results.join(’ | ‘);
}
function dashBanUser(email) {
if (!email||email===MODERATOR_EMAIL||isMod(email)){alert(‘Cannot ban moderators.’);return;}
var name=usernameMap[email]||email;
if (!window.confirm(‘Shadow ban ‘+name+’? Their existing comments stay visible. New posts will be hidden from others.’)) return;
bannedUsers[email]=true;
localStorage.setItem(BANNED_USERS_KEY,JSON.stringify(bannedUsers));
renderModDashboard();renderComments();
}
function dashWarnUser(email,name) {
if (!email) return;
var current=warnedUsers[email]||0;
var q=current>0?(name||email)+’ has ‘+current+’ warning’+(current>1?‘s’:’’)+’. Add another?’:‘Give ‘+(name||email)+’ their first warning?’;
if (!window.confirm(q)) return;
warnedUsers[email]=current+1;
localStorage.setItem(‘airdriftWarn:’+email,warnedUsers[email].toString());
localStorage.setItem(WARNED_USERS_KEY,JSON.stringify(warnedUsers));
renderModDashboard();
}
function dashFlagForOwner(itemId) {
if (!currentUser || !isMod(currentUser.email) || currentUser.email === MODERATOR_EMAIL) return;
// Find item in reportedItems
var item = reportedItems.find(function(r) { return r.id === itemId; });
if (!item) item = pendingItems.find(function(p) { return p.id === itemId; });
if (!item) return;
// Avoid duplicates
var exists = flaggedForOwner.find(function(f) { return f.id === itemId; });
if (exists) { alert(‘Already flagged for owner review.’); return; }
// Hide the comment while awaiting review
allComments.forEach(function(c) {
if (c.id === item.commentId) {
if (item.isReply || item.replyId) {
(c.replies || []).forEach(function(r) {
if (r.id === item.id || r.id === item.replyId) r.flaggedForOwner = true;
});
} else {
c.flaggedForOwner = true;
}
}
});
flaggedForOwner.unshift({
id:        itemId,
commentId: item.commentId,
email:     item.email,
name:      item.name,
text:      item.text,
flaggedBy: currentUser.name,
flaggedByEmail: currentUser.email,
time:      new Date().toISOString(),
pageUrl:   item.pageUrl || window.location.pathname
});
saveComments();
saveFilterData();
renderComments();
renderModDashboard();
alert(‘Comment flagged for owner review and hidden from view.’);
}

function ownerApproveFlagged(itemId) {
var item = flaggedForOwner.find(function(f) { return f.id === itemId; });
if (!item) return;
// Unhide comment
allComments.forEach(function(c) {
if (c.id === item.commentId) {
delete c.flaggedForOwner;
(c.replies || []).forEach(function(r) {
if (r.id === item.id || r.id === item.replyId) delete r.flaggedForOwner;
});
}
});
flaggedForOwner = flaggedForOwner.filter(function(f) { return f.id !== itemId; });
saveComments();
saveFilterData();
renderComments();
renderModDashboard();
}

function ownerRejectFlagged(itemId) {
var item = flaggedForOwner.find(function(f) { return f.id === itemId; });
if (!item) return;
// Delete the comment
allComments.forEach(function(c) {
if (c.id === item.commentId) {
if (item.isReply || item.replyId) {
c.replies = (c.replies || []).filter(function(r) {
return r.id !== item.id && r.id !== item.replyId;
});
} else {
c.deleted = true; c.text = ‘’; c.name = ‘’;
}
}
});
flaggedForOwner = flaggedForOwner.filter(function(f) { return f.id !== itemId; });
saveComments();
saveFilterData();
renderComments();
renderModDashboard();
}

function dismissModDashboard() {
var dash=document.getElementById(‘mod-dashboard’);
if (dash) dash.style.display=‘none’;
}
function adminSetFlairTime(rawInput, months, days) {
var raw = rawInput.trim();
// Accept email directly or resolve from username
var email = raw.indexOf(’@’) !== -1 ? raw.toLowerCase() : resolveEmailFromInput(raw);
if (!email) return ‘Error: user “’ + raw + ‘” not found.’;
// Check flair – search case-insensitively across flairData and flairPageData
var tier = flairData[email] || flairPageData[email];
if (!tier) {
// Try case-insensitive search in flair maps
Object.keys(flairData).forEach(function(k) {
if (k.toLowerCase() === email) { tier = flairData[k]; email = k; }
});
}
if (!tier) {
return ‘Error: ’ + (usernameMap[email] || email) + ’ does not have any flair assigned.’;
}
// Calculate backdated start date
var now = new Date();
var since = new Date(now);
since.setMonth(since.getMonth() - months);
since.setDate(since.getDate() - days);
flairTenure[email] = { tier: tier, since: since.toISOString() };
saveFlairTenure();
var name = usernameMap[email] || email;
var badge = getTenureLabel(email);
return ‘Done. ’ + name + ’ flair time set to ’ + months + ’ month’ + (months !== 1 ? ‘s’ : ‘’) +
(days > 0 ? ’ and ’ + days + ’ day’ + (days !== 1 ? ‘s’ : ‘’) : ‘’) + ‘.’ +
(badge ? ’ Badge: ’ + badge + ‘.’ : ’ No badge tier reached yet.’);
}

// ── MOD DASHBOARD HELPERS ──────────────────────────

function dashJumpToItem(commentId, replyId) {
// Close dashboard, expand chain, scroll to item
var dash = document.getElementById(‘mod-dashboard’);
if (dash) dash.style.display = ‘none’;
var sorted = getSortedComments();
var idx = sorted.findIndex(function(c) { return c.id === commentId; });
if (idx !== -1) visibleCount = Math.max(visibleCount, idx + 1);
expandReplyChain(commentId, replyId || null, function() {
scrollToElement(replyId ? ‘reply-’ + replyId : ‘comment-’ + commentId);
});
}

function dashClearStrikes(email) {
if (!email || !currentUser || !isMod(currentUser.email)) return;
delete filterStrikes[email];
saveFilterData();
renderModDashboard();
}

function dashClearReportCount(email) {
if (!email || currentUser.email !== MODERATOR_EMAIL) return;
delete reportCounts[email];
saveFilterData();
renderModDashboard();
}

function isMod(email) {
if (!email) return false;
if (email === MODERATOR_EMAIL) return true;
return modEmails.indexOf(email.toLowerCase()) !== -1;
}

function resolveEmailFromInput(input) {
// Returns email for a given username or email string
input = input.trim();
if (input.indexOf(’@’) !== -1) return input.toLowerCase();
// Look up by username
var found = null;
Object.keys(usernameMap).forEach(function(k) {
if (!k.endsWith(’_seen’) && usernameMap[k].toLowerCase() === input.toLowerCase()) found = k;
});
if (!found) {
allComments.forEach(function(c) {
if (c.name.toLowerCase() === input.toLowerCase()) found = c.email;
(c.replies || []).forEach(function(r) {
if (r.name.toLowerCase() === input.toLowerCase()) found = r.email;
});
});
}
return found ? found.toLowerCase() : null;
}

function adminAssignMod(input) {
var email = resolveEmailFromInput(input);
if (!email) return ‘Error: user “’ + input + ‘” not found.’;
if (email === MODERATOR_EMAIL) return ‘Error: cannot reassign the site owner.’;
if (modEmails.indexOf(email) !== -1) return email + ’ is already a mod.’;
modEmails.push(email);
saveFilterData();
return ‘Done. ’ + email + ’ is now a mod.’;
}

function adminRemoveMod(input) {
var email = resolveEmailFromInput(input);
if (!email) return ‘Error: user “’ + input + ‘” not found.’;
if (email === MODERATOR_EMAIL) return ‘Error: cannot remove the site owner.’;
var idx = modEmails.indexOf(email);
if (idx === -1) return email + ’ is not a mod.’;
modEmails.splice(idx, 1);
saveFilterData();
return ‘Done. ’ + email + ’ is no longer a mod.’;
}

function checkFilter(text, email) {
// Moderators are never filtered
if (isMod(email)) return null;
return containsBannedContent(text);
}

function addToPending(item) {
item.id      = item.id || Date.now().toString();
item.pending = true;
pendingItems.unshift(item);
recordStrike(item.email);
saveFilterData();
renderModDashboard();
}

function addToReported(item) {
// Avoid duplicates
var exists = reportedItems.find(function(r) { return r.id === item.id; });
if (!exists) {
reportedItems.unshift(item);
saveFilterData();
renderModDashboard();
}
}

function approveItem(itemId) {
if (!currentUser || !isMod(currentUser.email)) return;
var item = pendingItems.find(function(p) { return p.id === itemId; });
if (!item) return;
// Remove from pending
pendingItems = pendingItems.filter(function(p) { return p.id !== itemId; });
// Find the comment/reply and unhide it
allComments.forEach(function(c) {
if (c.id === item.commentId) {
if (item.isReply) {
(c.replies || []).forEach(function(r) {
if (r.id === itemId) r.pending = false;
});
} else {
c.pending = false;
}
}
});
saveComments();
saveFilterData();
renderComments();
renderModDashboard();
}

function rejectItem(itemId) {
if (!currentUser || !isMod(currentUser.email)) return;
// Check pending first, then reported
var item = pendingItems.find(function(p) { return p.id === itemId; });
var fromReported = false;
if (!item) {
item = reportedItems.find(function(r) { return r.id === itemId; });
fromReported = !!item;
}
if (!item) return;
if (fromReported) {
reportedItems = reportedItems.filter(function(r) { return r.id !== itemId; });
saveReportedItems();
} else {
pendingItems = pendingItems.filter(function(p) { return p.id !== itemId; });
savePendingItems();
}
allComments.forEach(function(c) {
if (c.id === item.commentId) {
if (item.isReply || item.replyId) {
c.replies = (c.replies || []).filter(function(r) {
return r.id !== item.id && r.id !== item.replyId;
});
} else {
c.deleted = true; c.text = ‘’; c.name = ‘’;
}
}
});
saveComments();
saveFilterData();
renderComments();
renderModDashboard();
}

function dismissReport(itemId) {
reportedItems = reportedItems.filter(function(r) { return r.id !== itemId; });
saveFilterData();
renderModDashboard();
}

function renderModDashboard() {
var dash = document.getElementById(‘mod-dashboard’);
if (!dash || !currentUser || !isMod(currentUser.email)) return;

```
var hasPending    = pendingItems.length > 0;
var hasReported   = reportedItems.length > 0;
var hasFlaggedOwner = currentUser.email === MODERATOR_EMAIL && flaggedForOwner.length > 0;
var flagged       = Object.keys(filterStrikes).filter(function(e) { return filterStrikes[e] >= 3; });

var hasItems = hasPending || hasReported || flagged.length > 0 || hasFlaggedOwner;
// Auto-open once on first sign-in
if (hasItems && !dashboardSeenThisSession) {
  dash.style.display = 'block';
  markDashboardSeen();
} else if (!hasItems && dash.style.display !== 'block') {
  // Only auto-hide if it wasn't manually opened
  dash.style.display = 'none';
}
// If dashboard is open and now has no items, leave it open -- user sees 'empty' state
// They can close it themselves
updateDashboardBtn();

// Pending
var pendingEl = document.getElementById('mod-pending-list');
if (pendingEl) {
  if (!hasPending) {
    pendingEl.innerHTML = '<span style="color:#444;font-size:12px;">No pending comments.</span>';
  } else {
    var isMM=currentUser&&currentUser.email===MODERATOR_EMAIL;
    pendingEl.innerHTML = pendingItems.map(function(p) {
      var bn=isUserBanned(p.email),wn=warnedUsers[p.email]||0;
      return '<div class="mod-item">' +
        '<div class="mod-author">' + escapeHTML(p.name) + ' &middot; <span style="color:#555;font-weight:400;">' + escapeHTML(p.email) + '</span>' +
        (bn?' <span style="color:#ff4444;font-size:10px;">(banned)</span>':'')+
        (wn>0?' <span style="color:#FF6B35;font-size:10px;">('+wn+' warn'+(wn>1?'s':'')+')</span>':'')+
        '</div>' +
        '<div class="mod-text">' + escapeHTML(p.text.substring(0, 120)) + (p.text.length > 120 ? '...' : '') + '</div>' +
        '<div class="mod-actions">' +
          '<button class="mod-approve-btn" onclick="approveItem(\'' + p.id + '\')">&#10003; Approve</button>' +
          '<button class="mod-reject-btn"  onclick="rejectItem(\'' + p.id + '\')">&#10007; Reject</button>' +
          (isMM?'<button class="mod-reject-btn" onclick="dashBanUser(\'' + p.email + '\')">&#128683; Ban</button>':'')+
          (isMM?'<button class="mod-approve-btn" style="border-color:#FF6B35;color:#FF6B35;" onclick="dashWarnUser(\'' + p.email + '\',\'' + escapeHTML(p.name) + '\')">&#9888; Warn</button>':'')+
        '</div>' +
      '</div>';
    }).join('');
  }
}

// Reported
var reportedEl = document.getElementById('mod-reported-list');
if (reportedEl) {
  if (!hasReported) {
    reportedEl.innerHTML = '<span style="color:#444;font-size:12px;">No reported comments.</span>';
  } else {
    var isMM2=currentUser&&currentUser.email===MODERATOR_EMAIL;
    reportedEl.innerHTML = reportedItems.map(function(r) {
      var bn2=isUserBanned(r.email),wn2=warnedUsers[r.email]||0;
      var rCommentId = r.commentId || r.id;
      var rReplyId   = r.isReply ? r.id : null;
      return '<div class="mod-item">' +
        '<div class="mod-author">' + escapeHTML(r.name) +
        (r.reporterName?' &middot; <span style="color:#555;font-size:10px;">Reported by '+escapeHTML(r.reporterName)+'</span>':'')+
        (bn2?' <span style="color:#ff4444;font-size:10px;">(banned)</span>':'')+
        (wn2>0?' <span style="color:#FF6B35;font-size:10px;">('+wn2+' warn'+(wn2>1?'s':'')+')</span>':'')+
        '</div>' +
        '<div class="mod-text">' + escapeHTML(r.text ? r.text.substring(0, 120) : '[reply]') + '</div>' +
        '<div class="mod-actions">' +
          '<button class="mod-reject-btn" onclick="rejectItem(\'' + r.id + '\')">&#10007; Delete</button>' +
          '<button class="mod-approve-btn" onclick="dismissReport(\'' + r.id + '\')">Dismiss</button>' +
          '<button class="mod-approve-btn" style="border-color:#2a5f7f;color:#2a5f7f;" onclick="dashJumpToItem(\'' + rCommentId + '\',' + (rReplyId ? '\'' + rReplyId + '\'' : 'null') + ')">&#128269; View</button>' +
          (isMM2?'<button class="mod-reject-btn" onclick="dashBanUser(\'' + r.email + '\')">&#128683; Ban</button>':'')+
          '<button class="mod-approve-btn" style="border-color:#FF6B35;color:#FF6B35;" onclick="dashWarnUser(\'' + r.email + '\',\'' + escapeHTML(r.name) + '\')">&#9888; Warn</button>'+
          (!isMM2?'<button class="mod-approve-btn" style="border-color:#b89f37;color:#b89f37;" onclick="dashFlagForOwner(\'' + r.id + '\')">&#128681; Flag for Owner</button>':'')+
        '</div>' +
      '</div>';
    }).join('');
  }
}

// Flagged users
var flaggedEl = document.getElementById('mod-flagged-list');
if (flaggedEl) {
  if (flagged.length === 0) {
    flaggedEl.innerHTML = '<span style="color:#444;font-size:12px;">No flagged users.</span>';
  } else {
    var usernameAttempts = {};
    try { usernameAttempts = JSON.parse(localStorage.getItem('airdriftUsernameAttempts') || '{}'); } catch(e) {}
    var isMM3 = currentUser && currentUser.email === MODERATOR_EMAIL;
    flaggedEl.innerHTML = flagged.map(function(email) {
      var uname = usernameMap[email] || email;
      var attempts = (usernameAttempts[email] || []).join(', ');
      var isBannedU = isUserBanned(email);
      return '<div class="mod-item">' +
        '<div class="mod-author">' + escapeHTML(uname) +
          ' &middot; <span style="color:#555;font-size:10px;">' + escapeHTML(email) + '</span>' +
          ' &middot; <span style="color:#FF6B35;font-size:10px;">' + filterStrikes[email] + ' strike' + (filterStrikes[email] > 1 ? 's' : '') + '</span>' +
          (isBannedU ? ' <span style="color:#ff4444;font-size:10px;">(shadow banned)</span>' : '') +
        '</div>' +
        (attempts ? '<div class="mod-text" style="color:#555;font-size:11px;">Tried: ' + escapeHTML(attempts) + '</div>' : '') +
        '<div class="mod-actions">' +
          '<button class="mod-approve-btn" onclick="dashClearStrikes(\'' + email + '\')">&#10003; Clear Strikes</button>' +
          (isMM3 && !isBannedU ? '<button class="mod-reject-btn" onclick="dashBanUser(\'' + email + '\')">&#128683; Ban</button>' : '') +
          (isMM3 ? '<button class="mod-approve-btn" style="border-color:#FF6B35;color:#FF6B35;" onclick="dashWarnUser(\'' + email + '\',\'' + escapeHTML(uname) + '\')">&#9888; Warn</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }
}
// ── CHATS SECTION (master mod only) ──
var chatsEl = document.getElementById('mod-chats-list');
if (chatsEl && currentUser.email === MODERATOR_EMAIL) {
  var dmThreads = [];
  Object.keys(localStorage).forEach(function(k) {
    if (k.indexOf('airdriftDM:') !== 0 || k.endsWith(':closed')) return;
    var msgs = [];
    try { msgs = JSON.parse(localStorage.getItem(k) || '[]'); } catch(e) {}
    if (msgs.length === 0) return;
    var isClosed = localStorage.getItem(k + ':closed') === '1';
    // Extract the other user's email from the key: airdriftDM:emailA:emailB
    var keyPart = k.replace('airdriftDM:', '');
    // One of the two emails is MODERATOR_EMAIL -- find the other
    var otherEmail = '';
    var parts = keyPart.split(':');
    // emails are sorted so reassemble: try splitting on known mod email
    var modEmailEscaped = MODERATOR_EMAIL.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    var re = new RegExp('^' + modEmailEscaped + ':(.+)$|^(.+):' + modEmailEscaped + '$');
    var m2 = keyPart.match(re);
    if (m2) otherEmail = m2[1] || m2[2];
    else otherEmail = parts.filter(function(p){ return p.indexOf('@') !== -1 && p !== MODERATOR_EMAIL; }).join(':');
    var otherName = usernameMap[otherEmail] || otherEmail;
    var lastMsg   = msgs[msgs.length - 1];
    var lastText  = lastMsg ? (lastMsg.system ? '(system)' : lastMsg.text || '') : '';
    var lastTime  = lastMsg ? formatDate(lastMsg.time) : '';
    dmThreads.push({ key: k, email: otherEmail, name: otherName, count: msgs.length,
      lastText: lastText, lastTime: lastTime, closed: isClosed });
  });
  dmThreads.sort(function(a,b) { return b.count - a.count; });
  if (dmThreads.length === 0) {
    chatsEl.innerHTML = '<div style="color:#444;font-size:11px;padding:4px 0;">No chats yet.</div>';
  } else {
    chatsEl.innerHTML = dmThreads.map(function(d) {
      var safeEmail = d.email.replace(/'/g,"&#39;");
      var safeName  = escapeHTML(d.name).replace(/'/g,"&#39;");
      var statusDot = d.closed
        ? '<span style="color:#555;font-size:9px;margin-left:4px;">(ended)</span>'
        : '<span style="color:#2a5f7f;font-size:9px;margin-left:4px;">(active)</span>';
      return '<div class="mod-item" style="cursor:default;">' +
        '<div class="mod-author">' + escapeHTML(d.name) + statusDot +
          ' &middot; <span style="color:#555;font-size:10px;">' + d.count + ' message' + (d.count !== 1 ? 's' : '') + '</span>' +
          ' &middot; <span style="color:#444;font-size:10px;">' + d.lastTime + '</span>' +
        '</div>' +
        (d.lastText ? '<div class="mod-text" style="color:#555;">' + escapeHTML(d.lastText.substring(0,80)) + (d.lastText.length>80?'...':'') + '</div>' : '') +
        '<div class="mod-actions">' +
          '<button class="mod-approve-btn" onclick="dashReopenChat(\'' + safeEmail + '\',\'' + safeName + '\')">&#x1F4AC; Open</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

if (currentUser.email === MODERATOR_EMAIL) {

  var abEl=document.getElementById('mod-report-abuse-list'),abSect=document.getElementById('mod-report-abuse-section');
  var abusers=Object.keys(reportCounts).filter(function(e){return reportCounts[e]>=3;});
  if (abEl&&abSect){abSect.style.display=abusers.length===0?'none':'block';
    abusers.sort(function(a,b){return reportCounts[b]-reportCounts[a];});
    abEl.innerHTML=abusers.map(function(e){
      var uname = usernameMap[e] || e;
      return '<div class="mod-item">' +
        '<div class="mod-author">' + escapeHTML(uname) +
          ' &middot; <span style="color:#555;font-size:10px;">' + escapeHTML(e) + '</span>' +
          ' &middot; <span style="color:#FF6B35;font-size:10px;">' + reportCounts[e] + ' reports filed</span>' +
        '</div>' +
        '<div class="mod-actions">' +
          '<button class="mod-approve-btn" onclick="dashClearReportCount(\'' + e + '\')">&#10003; Clear Count</button>' +
          '<button class="mod-approve-btn" style="border-color:#FF6B35;color:#FF6B35;" onclick="dashWarnUser(\'' + e + '\',\'' + escapeHTML(uname) + '\')">&#9888; Warn</button>' +
          '<button class="mod-reject-btn" onclick="dashBanUser(\'' + e + '\')">&#128683; Ban</button>' +
        '</div>' +
      '</div>';
    }).join('');}
  // Flagged for Owner -- highlighted section
  var foEl=document.getElementById('mod-flagged-owner-list'),foSect=document.getElementById('mod-flagged-owner-section');
  if (foEl&&foSect){
    foSect.style.display=flaggedForOwner.length===0?'none':'block';
    foEl.innerHTML=flaggedForOwner.map(function(f){
      return '<div class="mod-item" style="border-color:#b89f37;background:rgba(184,159,55,0.06);">' +
        '<div class="mod-author">' + escapeHTML(f.name) +
          ' &middot; <span style="color:#b89f37;font-size:10px;">Flagged by ' + escapeHTML(f.flaggedBy) + '</span>' +
          ' &middot; <span style="color:#555;font-size:10px;">' + formatDate(f.time) + '</span>' +
        '</div>' +
        '<div class="mod-text">' + escapeHTML((f.text||'').substring(0,120)) + ((f.text||'').length>120?'...':'') + '</div>' +
        '<div class="mod-actions">' +
          '<button class="mod-approve-btn" onclick="ownerApproveFlagged(\'' + f.id + '\')">&#10003; Reinstate</button>' +
          '<button class="mod-reject-btn" onclick="ownerRejectFlagged(\'' + f.id + '\')">&#10007; Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}
```

}

// ── TYPING INDICATOR SYSTEM ─────────────────────────

// ╔══════════════════════════════════════════════════════════════════╗
// ║  GAS SETUP – set this URL when your Apps Script is deployed     ║
// ║  All functions marked GAS HOOKUP below will activate once set   ║
// ╚══════════════════════════════════════════════════════════════════╝
var GAS_URL = ‘’; // <– paste your Apps Script web app URL here

// ╔══════════════════════════════════════════════════════════════════╗
// ║  PAGE ACCESS CONTROL                                            ║
// ║  Restrict pages by URL slug to specific flair tiers.           ║
// ║                                                                  ║
// ║  HOW TO EDIT:                                                    ║
// ║  Add one line per restricted page:                               ║
// ║    ‘url-slug’: [‘tier1’,‘tier2’],                               ║
// ║                                                                  ║
// ║  Slug matches anywhere in the URL path so ‘main-menu’ matches   ║
// ║  /p/main-menu.html and /2024/01/main-menu/ etc.                 ║
// ║                                                                  ║
// ║  Valid tier names (lowest to highest):                           ║
// ║  newcomer  supporter  subscriber  member  collector              ║
// ║  artist  writer                                                  ║
// ║                                                                  ║
// ║  Unqualified or signed-out users see the upgrade modal           ║
// ║  with your Patreon link. Uncomment the redirect line below       ║
// ║  if you also want them bounced off the page.                     ║
// ╚══════════════════════════════════════════════════════════════════╝
var PAGE_ACCESS = {
‘main-menu’:           [‘member’,‘collector’,‘artist’,‘writer’],
‘inner-sanctum-demo’:  [‘collector’,‘artist’,‘writer’],
// Add more slugs here:
// ‘your-url-slug’:    [‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’],
};

// ── PAGE ACCESS ENFORCEMENT ──────────────────────────────────────────
// Runs once on page load. Polls for sign-in state (up to 2s),
// then checks if the user’s flair qualifies for this page.
// To add or remove restricted pages, edit PAGE_ACCESS above.
//
// GAS HOOKUP: when live, the flair lookup below switches from
// localStorage to a server-side fetch so flair is always authoritative.
(function enforcePageAccess() {
var path = window.location.pathname.split(’?’)[0];

```
// Check if this page has an access rule
var matchedTiers = null;
Object.keys(PAGE_ACCESS).forEach(function(slug) {
  if (path.indexOf(slug) !== -1) matchedTiers = PAGE_ACCESS[slug];
});
if (!matchedTiers) return; // no restriction on this page

// Poll for sign-in state -- resolves in ~100ms normally, caps at 2s
var attempts = 0;
var check = setInterval(function() {
  attempts++;
  var stored = sessionStorage.getItem('airdriftCurrentUser') ||
               localStorage.getItem('airdriftCurrentUser');
  var user = null;
  try { user = stored ? JSON.parse(stored) : null; } catch(e) {}

  if (user) {
    clearInterval(check);

    // GAS HOOKUP: verify flair server-side (uncomment when GAS is live):
    // if (GAS_URL) {
    //   fetch(GAS_URL + '?action=getUserFlair'
    //     + '&email=' + encodeURIComponent(user.email)
    //     + '&pageUrl=' + encodeURIComponent(path))
    //   .then(function(r) { return r.json(); })
    //   .then(function(d) {
    //     if (!d.tier || matchedTiers.indexOf(d.tier) === -1) _blockPage(matchedTiers);
    //   }).catch(function() {});
    //   return;
    // }

    // localStorage flair check (pre-GAS)
    var tier = null;
    try {
      var fd  = JSON.parse(localStorage.getItem('airdriftFlairs') || '{}');
      var fpd = JSON.parse(localStorage.getItem('airdriftFlairs:' + path) || '{}');
      tier = fpd[user.email] || fd[user.email];
    } catch(e) {}

    if (!tier || matchedTiers.indexOf(tier) === -1) _blockPage(matchedTiers);
    return;
  }

  // Still not signed in after 2s -- block
  if (attempts >= 20) {
    clearInterval(check);
    _blockPage(matchedTiers);
  }
}, 100);

function _blockPage(tiers) {
  var names = tiers.map(function(t) { return t.charAt(0).toUpperCase() + t.slice(1); });
  var msg = 'This page requires ' +
    (names.length === 1 ? names[0] : names.slice(0,-1).join(', ') + ' or ' + names[names.length-1]) +
    ' flair to access.';
  showUpgradeModal(msg);
  // Optional: redirect away after 4s -- uncomment to enable:
  // setTimeout(function() { window.location.href = '/'; }, 4000);
}
```

})();
var typingPollInterval  = null;
var typingDebounce      = {}; // { textareaId: timeoutId }
var localTypingActive   = {}; // { textareaId: bool } – is current user typing here

// Called when user types in any textarea
function onTypingInput(textareaId, context) {
if (!currentUser) return;
localTypingActive[textareaId] = true;

```
// Debounce -- send ping 500ms after last keystroke
if (typingDebounce[textareaId]) clearTimeout(typingDebounce[textareaId]);
typingDebounce[textareaId] = setTimeout(function() {
  localTypingActive[textareaId] = false;
  sendStopTyping(context);
}, 3000);

sendTypingPing(context);
```

}

function sendTypingPing(context) {
if (!currentUser || !GAS_URL) return;
// TODO: uncomment when GAS is live
// fetch(GAS_URL, {
//   method: ‘POST’,
//   headers: { ‘Content-Type’: ‘application/json’ },
//   body: JSON.stringify({
//     action:    ‘typing’,
//     pageUrl:   window.location.pathname,
//     context:   context, // ‘main’, ‘sticky’, or reply/comment id
//     userName:  currentUser.name,
//     timestamp: Date.now()
//   })
// }).catch(function() {});
}

function sendStopTyping(context) {
if (!currentUser || !GAS_URL) return;
// TODO: uncomment when GAS is live
// fetch(GAS_URL, {
//   method: ‘POST’,
//   headers: { ‘Content-Type’: ‘application/json’ },
//   body: JSON.stringify({
//     action:    ‘stopTyping’,
//     pageUrl:   window.location.pathname,
//     context:   context,
//     userName:  currentUser.name
//   })
// }).catch(function() {});
}

function fetchTypingUsers() {
if (!currentUser || !GAS_URL) return;
// TODO: uncomment when GAS is live
// fetch(GAS_URL + ‘?action=getTyping&pageUrl=’ + encodeURIComponent(window.location.pathname))
//   .then(function(r) { return r.json(); })
//   .then(function(data) {
//     updateTypingIndicators(data.typing || []);
//   }).catch(function() {});
}

function updateTypingIndicators(typingList) {
// typingList: [{ userName, context, timestamp }]
// Filter out current user and entries older than 5 seconds
var now = Date.now();
var active = typingList.filter(function(t) {
return t.userName !== currentUser.name && (now - t.timestamp) < 5000;
});

```
// Group by context
var byContext = {};
active.forEach(function(t) {
  if (!byContext[t.context]) byContext[t.context] = [];
  byContext[t.context].push(t.userName);
});

// Update main and sticky indicators
['main', 'sticky'].forEach(function(ctx) {
  var el = document.getElementById('typing-' + ctx);
  if (el) el.innerHTML = buildTypingHtml(byContext[ctx] || []);
});

// Update reply indicators
Object.keys(byContext).forEach(function(ctx) {
  if (ctx !== 'main' && ctx !== 'sticky') {
    var el = document.getElementById('typing-' + ctx);
    if (el) el.innerHTML = buildTypingHtml(byContext[ctx]);
  }
});
```

}

function buildTypingHtml(names) {
if (!names || names.length === 0) return ‘’;
var dots = ‘<span class="typing-dot">•</span><span class="typing-dot">•</span><span class="typing-dot">•</span>’;
if (names.length === 1) {
return ‘<span>’ + escapeHTML(names[0]) + ’ is typing ’ + dots + ‘</span>’;
} else if (names.length === 2) {
return ‘<span>’ + escapeHTML(names[0]) + ’ and ’ + escapeHTML(names[1]) + ’ are typing ’ + dots + ‘</span>’;
} else {
return ‘<span>’ + names.length + ’ people are typing ’ + dots + ‘</span>’;
}
}

function startTypingPoll() {
if (typingPollInterval) clearInterval(typingPollInterval);
if (!GAS_URL) return; // No-op until GAS is live
typingPollInterval = setInterval(fetchTypingUsers, 3000);
}

function stopTypingPoll() {
if (typingPollInterval) { clearInterval(typingPollInterval); typingPollInterval = null; }
}

function scoreHtml(upvotes, downvotes) {
var s = (upvotes || 0) - (downvotes || 0);
if (s === 0) return ‘’;
var color = s > 0 ? ‘#4CAF50’ : ‘#ff1744’;
return ‘<span style="color:' + color + ';font-size:13px;font-weight:600;margin-left:2px;">’ + s + ‘</span>’;
}

// Recursively renders a single reply node and all its children
function renderReplyNode(reply, allReplies, commentId, depth) {
var maxDepth   = getMaxDepth();
var depthClass = depth <= 4 ? ‘reply-depth-’ + depth : ‘reply-depth-deep’;

```
// At max depth -- show Continue Thread instead of rendering children
if (depth >= maxDepth) {
  var children = allReplies.filter(function(r) { return r.parentId === reply.id; });
  if (currentFilter === 'all') children.sort(function(a, b) {
    if (a.highlighted && !b.highlighted) return -1;
    if (!a.highlighted && b.highlighted) return  1;
    return new Date(a.time) - new Date(b.time);
  });
  var inputKey = commentId + '-' + reply.id;
  var rVoteKey  = currentUser ? currentUser.email + ':' + reply.id : '';
  var rVote    = rVoteKey ? (userVotes[rVoteKey] || '') : '';
  var rIsOwner = currentUser && currentUser.email === reply.email;
  var rCanEdit = rIsOwner && !reply.deleted && (Date.now() - new Date(reply.time).getTime()) < 600000;
  var html = '<div class="reply-item ' + depthClass + (PRIORITY_TIERS.indexOf(getUserTier(reply.email)) !== -1 ? ' reply-priority' : '') + '" id="reply-' + reply.id + '">' +
    '<div class="comment-author">' +
      '<span class="reply-name user-link" data-email="' + reply.email + '" data-name="' + escapeHTML(reply.name) + '"' + getUsernameColorStyle(reply.email) + '>' + escapeHTML(reply.name) + '</span>' +
      (reply.email === MODERATOR_EMAIL ? '<span class="comment-badge">&#x270D;&#xFE0F; Author</span>' : '') +
      (reply.email !== MODERATOR_EMAIL && isMod(reply.email) ? '<span class="mod-badge">&#x1F6E1;&#xFE0F; Moderator</span>' : '') +
      getUserFlair(reply.email) +

    '</div>' +
    '<div class="reply-meta">' + formatDate(reply.time) + '</div>' +
    '<div class="reply-text">' + renderMentions(renderFormatted(reply.text, reply.email)) + '</div>' +
    '<div class="comment-actions">' +
      '<button class="' + (rVote === 'up' ? 'vote-button active-up' : 'vote-button') + '" data-id="' + reply.id + '" data-dir="up" onclick="voteItem(this)">▲' + ((reply.upvotes || 0) > 0 ? ' ' + reply.upvotes : '') + '</button>' +
      '<button class="' + (rVote === 'down' ? 'vote-button active-down' : 'vote-button') + '" data-id="' + reply.id + '" data-dir="down" onclick="voteItem(this)">▼' + ((reply.downvotes || 0) > 0 ? ' ' + reply.downvotes : '') + '</button>' +
      scoreHtml(reply.upvotes, reply.downvotes) +
      '<button class="action-btn" data-id="' + commentId + '" data-reply-id="' + reply.id + '" onclick="toggleNestedReplyForm(this)">&#x1F4AC; Reply</button>' +
      (rIsOwner && rCanEdit ? '<button class="action-btn" data-id="' + reply.id + '" data-comment-id="' + commentId + '" onclick="startEditReply(this)">✏️ Edit</button>' : '') +
      (rIsOwner ? '<button class="action-btn" style="color:#ff4444;" data-id="' + reply.id + '" data-comment-id="' + commentId + '" onclick="deleteReply(this)">🗑 Delete</button>' : '') +
      (!rIsOwner ? '<button class="action-btn" data-id="' + reply.id + '" data-email="' + reply.email + '" onclick="reportComment(this)">&#x1F6A9; Report</button>' : '') +
      renderReactionsBar(reply.id) +
      (currentUser && currentUser.email === MODERATOR_EMAIL ? '<button class="highlight-btn' + (reply.highlighted ? ' highlighted' : '') + '" data-id="' + reply.id + '" data-comment-id="' + commentId + '" onclick="toggleHighlightReply(this)" title="Highlight reply">&#x2605;</button>' : '') +
    '</div>' +
    '<div class="reply-form" id="reply-form-' + inputKey + '">' +
      '<textarea class="reply-textarea" id="reply-input-' + inputKey + '" placeholder="Write a reply..." maxlength="2000"></textarea>' +
      '<div class="typing-indicator" id="typing-' + inputKey + '"></div>' +
      '<div class="reply-actions">' +
        '<button class="reply-btn" data-id="' + commentId + '" data-reply-id="' + reply.id + '" onclick="submitReply(this)">Post Reply</button>' +
        '<button class="cancel-btn" data-id="' + commentId + '" data-reply-id="' + reply.id + '" onclick="toggleNestedReplyForm(this)">Cancel</button>' +
      '</div>' +
    '</div>';
  if (children.length > 0) {
    html += '<button class="continue-thread-btn" data-comment-id="' + commentId + '" data-reply-id="' + reply.id + '" onclick="continueThread(this)">Continue thread ▶</button>';
  }
  html += '</div>';
  return html;
}
var inputKey   = commentId + '-' + reply.id;
var branchKey  = 'branch-' + reply.id;
var children   = allReplies.filter(function(r) { return r.parentId === reply.id; });
if (currentFilter === 'all') children.sort(function(a, b) {
    if (a.highlighted && !b.highlighted) return -1;
    if (!a.highlighted && b.highlighted) return  1;
    return new Date(a.time) - new Date(b.time);
  });
var branchExpanded = repliesExpanded[branchKey] || false;

var rVoteKey  = currentUser ? currentUser.email + ':' + reply.id : '';
var rVote    = rVoteKey ? (userVotes[rVoteKey] || '') : '';
var rIsOwner = currentUser && currentUser.email === reply.email;
var rCanEdit = rIsOwner && !reply.deleted && (Date.now() - new Date(reply.time).getTime()) < 600000;

var html = '<div class="reply-item ' + depthClass + (PRIORITY_TIERS.indexOf(getUserTier(reply.email)) !== -1 ? ' reply-priority' : '') + '" id="reply-' + reply.id + '">' +
  '<div class="comment-author">' +
    '<span class="reply-name user-link" data-email="' + reply.email + '" data-name="' + escapeHTML(reply.name) + '"' + getUsernameColorStyle(reply.email) + '>' + escapeHTML(reply.name) + '</span>' +
      (reply.email === MODERATOR_EMAIL ? '<span class="comment-badge">&#x270D;&#xFE0F; Author</span>' : '') +
    (reply.email !== MODERATOR_EMAIL && isMod(reply.email) ? '<span class="mod-badge">&#x1F6E1;&#xFE0F; Moderator</span>' : '') +
    getUserFlair(reply.email) +

  '</div>' +
  '<div class="reply-meta">' + formatDate(reply.time) + (reply.edited ? ' <span style="color:#555;font-size:10px;">(edited)</span>' : '') + '</div>' +
  (reply.pending && (!currentUser || (currentUser.email !== MODERATOR_EMAIL && reply.email !== currentUser.email)) ? '' :
   reply.pending ? '<div class="comment-pending">Your reply is pending moderator approval.</div>' :
   reply.deleted ? '<div class="deleted-comment">[Deleted]</div>' :
   '<div class="reply-text" id="reply-text-' + reply.id + '">' + renderMentions(renderFormatted(reply.text, reply.email)) + '</div>') +
  (!reply.deleted && (!reply.pending || rIsOwner || (currentUser && currentUser.email === MODERATOR_EMAIL)) ? '<div class="comment-actions">' +
    '<button class="' + (rVote === 'up' ? 'vote-button active-up' : 'vote-button') + '" data-id="' + reply.id + '" data-dir="up" onclick="voteItem(this)">▲' + ((reply.upvotes || 0) > 0 ? ' ' + reply.upvotes : '') + '</button>' +
    '<button class="' + (rVote === 'down' ? 'vote-button active-down' : 'vote-button') + '" data-id="' + reply.id + '" data-dir="down" onclick="voteItem(this)">▼' + ((reply.downvotes || 0) > 0 ? ' ' + reply.downvotes : '') + '</button>' +
    scoreHtml(reply.upvotes, reply.downvotes) +
    '<button class="action-btn" data-id="' + commentId + '" data-reply-id="' + reply.id + '" onclick="toggleNestedReplyForm(this)">&#x1F4AC; Reply</button>' +
    (rIsOwner && rCanEdit ? '<button class="action-btn" data-id="' + reply.id + '" data-comment-id="' + commentId + '" onclick="startEditReply(this)">✏️ Edit</button>' : '') +
    (rIsOwner ? '<button class="action-btn" style="color:#ff4444;" data-id="' + reply.id + '" data-comment-id="' + commentId + '" onclick="deleteReply(this)">🗑 Delete</button>' : '') +
    (!rIsOwner ? '<button class="action-btn" data-id="' + reply.id + '" data-email="' + reply.email + '" onclick="reportComment(this)">&#x1F6A9; Report</button>' : '') +
    (currentUser && currentUser.email === MODERATOR_EMAIL ? '<button class="highlight-btn' + (reply.highlighted ? ' highlighted' : '') + '" data-id="' + reply.id + '" data-comment-id="' + commentId + '" onclick="toggleHighlightReply(this)" title="Highlight reply">&#x2605;</button>' : '') +
  '</div>' : '') +
  '<div class="reply-form" id="reply-form-' + inputKey + '">' +
    '<textarea class="reply-textarea" id="reply-input-' + inputKey + '" placeholder="Write a reply..." maxlength="2000"></textarea>' +
    '<div class="typing-indicator" id="typing-' + inputKey + '"></div>' +
    '<div class="reply-actions">' +
      '<button class="reply-btn" data-id="' + commentId + '" data-reply-id="' + reply.id + '" onclick="submitReply(this)">Post Reply</button>' +
      '<button class="cancel-btn" data-id="' + commentId + '" data-reply-id="' + reply.id + '" onclick="toggleNestedReplyForm(this)">Cancel</button>' +
    '</div>' +
  '</div>';

// Render children with collapse + pagination if > REPLIES_PREVIEW
if (children.length > 0) {
  var branchPage       = branchPages[branchKey] || 1;
  var branchTotalPages = Math.max(1, Math.ceil(children.length / REPLIES_PER_PAGE));

  if (!branchExpanded && children.length > REPLIES_PREVIEW) {
    // Collapsed: show preview only
    var previewChildren = children.slice(0, REPLIES_PREVIEW);
    for (var i = 0; i < previewChildren.length; i++) {
      html += renderReplyNode(previewChildren[i], allReplies, commentId, depth + 1);
    }
    html += '<button class="show-replies-btn" data-branch="' + branchKey + '" onclick="expandBranch(this)">' +
      '▼ Show ' + (children.length - REPLIES_PREVIEW) + ' more repl' + (children.length - REPLIES_PREVIEW === 1 ? 'y' : 'ies') +
    '</button>';
  } else {
    // Expanded: paginate children
    var branchStart   = (branchPage - 1) * REPLIES_PER_PAGE;
    var branchVisible = children.slice(branchStart, branchStart + REPLIES_PER_PAGE);
    for (var j = 0; j < branchVisible.length; j++) {
      html += renderReplyNode(branchVisible[j], allReplies, commentId, depth + 1);
    }
    // Pagination controls
    if (branchTotalPages > 1) {
      html += '<div class="reply-pagination">' +
        '<button class="reply-page-btn" data-branch="' + branchKey + '" data-dir="prev" onclick="branchPage(this)" ' + (branchPage === 1 ? 'disabled' : '') + '>&#8592;</button>' +
        '<span class="reply-page-indicator">' + branchPage + ' / ' + branchTotalPages + '</span>' +
        '<button class="reply-page-btn" data-branch="' + branchKey + '" data-dir="next" onclick="branchPage(this)" ' + (branchPage === branchTotalPages ? 'disabled' : '') + '>&#8594;</button>' +
      '</div>';
    }
    if (children.length > REPLIES_PREVIEW) {
      html += '<button class="show-replies-btn" data-branch="' + branchKey + '" onclick="collapseBranch(this)">▲ Hide</button>';
    }
  }
}

html += '</div>';
return html;
```

}

function continueThread(btn) {
var commentId = btn.getAttribute(‘data-comment-id’);
var replyId   = btn.getAttribute(‘data-reply-id’);
threadStack.push({ commentId: commentId, replyId: replyId });
renderThreadView();
scrollToElement(‘reply-’ + replyId);
}

function previousThread() {
threadStack.pop();
renderThreadView();
// Scroll to the parent reply (now the root of the current view)
if (threadStack.length > 0) {
var current = threadStack[threadStack.length - 1];
scrollToElement(‘reply-’ + current.replyId);
} else {
scrollToComments();
}
}

function returnToMainThread() {
threadStack = [];
renderComments();
}

function renderThreadView() {
if (threadStack.length === 0) { renderComments(); return; }
// Hide the Show More button – not relevant in branch thread view
var smBtn = document.getElementById(‘show-more-btn’);
if (smBtn) smBtn.innerHTML = ‘’;

```
var current   = threadStack[threadStack.length - 1];
var comment   = allComments.find(function(c) { return c.id === current.commentId; });
if (!comment) { renderComments(); return; }

var allReplies = comment.replies || [];
var root       = allReplies.find(function(r) { return r.id === current.replyId; });
if (!root) { renderComments(); return; }

// Build navigation bar
var navHtml = '<div class="thread-nav">';
navHtml += '<button class="thread-nav-btn" onclick="previousThread()">&#8592; Previous thread</button>';
if (threadStack.length >= 2) {
  navHtml += '<button class="thread-nav-btn" onclick="returnToMainThread()">&#8962; Return to main thread</button>';
}
navHtml += '</div>';

// Render the root reply and its children from depth 1
var html = navHtml + renderReplyNode(root, allReplies, current.commentId, 1);
document.getElementById('comments-list').innerHTML = html;
// Wire up mention and typing listeners on all textareas
document.querySelectorAll('.reply-textarea, .form-textarea').forEach(function(ta) {
  setupMentionListener(ta);
  (function(textarea) {
    var ctx = textarea.id.replace('reply-input-', '').replace('comment-input', 'main');
    textarea.addEventListener('input', function() { onTypingInput(textarea.id, ctx); });
  })(ta);
});
```

}

function expandBranch(btn) {
var branchKey = btn.getAttribute(‘data-branch’);
repliesExpanded[branchKey] = true;
branchPages[branchKey] = 1;
renderComments();
}

function collapseBranch(btn) {
var branchKey = btn.getAttribute(‘data-branch’);
repliesExpanded[branchKey] = false;
branchPages[branchKey] = 1;
renderComments();
}

function branchPage(btn) {
var branchKey    = btn.getAttribute(‘data-branch’);
var dir          = btn.getAttribute(‘data-dir’);
var page         = branchPages[branchKey] || 1;
// Derive total from the reply id embedded in branchKey (branch-{replyId})
var replyId      = branchKey.replace(‘branch-’, ‘’);
var totalReplies = 0;
allComments.forEach(function(c) {
if (!totalReplies && c.replies) {
var children = c.replies.filter(function(r) { return r.parentId === replyId; });
if (children.length) totalReplies = children.length;
}
});
var totalPages = Math.max(1, Math.ceil(totalReplies / REPLIES_PER_PAGE));
if (dir === ‘next’ && page < totalPages) branchPages[branchKey] = page + 1;
if (dir === ‘prev’ && page > 1)          branchPages[branchKey] = page - 1;
renderComments();
scrollToElement(‘reply-’ + replyId);
}

function toggleNestedReplyForm(btn) {
var commentId     = btn.getAttribute(‘data-id’);
var parentReplyId = btn.getAttribute(‘data-reply-id’);
if (!currentUser) { showSignInModal(‘Sign in to reply.’); return; }
// Check comment type restriction against reply author
var comment = allComments.find(function(c) { return c.id === commentId; });
if (comment) {
var parentReply = (comment.replies || []).find(function(r) { return r.id === parentReplyId; });
if (parentReply && !canReply(parentReply.email)) {
showUpgradeModal(getReplyBlockedMessage(parentReply.email));
return;
}
}
var inputKey = commentId + ‘-’ + parentReplyId;
var form = document.getElementById(‘reply-form-’ + inputKey);
if (!form) return;
form.classList.toggle(‘open’);
if (form.classList.contains(‘open’)) {
// Hide sticky when any reply form opens
var sticky = document.getElementById(‘sticky-comment-box’);
if (sticky) sticky.style.display = ‘none’;
document.getElementById(‘reply-input-’ + inputKey).focus();
}
}

function expandReplies(btn) {
var commentId = btn.getAttribute(‘data-id’);
repliesExpanded[commentId] = true;
replyPages[commentId] = 1;
renderComments();
}

function collapseReplies(btn) {
var commentId = btn.getAttribute(‘data-id’);
repliesExpanded[commentId] = false;
replyPages[commentId] = 1;
renderComments();
}

function replyPage(btn) {
var commentId = btn.getAttribute(‘data-id’);
var dir       = btn.getAttribute(‘data-dir’);
var comment   = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
var totalPages = Math.max(1, Math.ceil((comment.replies || []).length / REPLIES_PER_PAGE));
var page = replyPages[commentId] || 1;
if (dir === ‘next’ && page < totalPages) replyPages[commentId] = page + 1;
if (dir === ‘prev’ && page > 1)          replyPages[commentId] = page - 1;
renderComments();
scrollToElement(‘comment-’ + commentId);
}

function submitFlairCode() {
if (!currentUser) return;
var code = document.getElementById(‘flair-code-input’).value.trim();
var statusEl = document.getElementById(‘flair-status’);
var matched = null;
for (var tier in FLAIR_CODES) {
if (FLAIR_CODES[tier] === code) { matched = tier; break; }
}
if (!matched) {
statusEl.style.color = ‘#FF6B35’;
statusEl.textContent = ‘Invalid code.’;
return;
}
flairData[currentUser.email] = matched;
saveFlairs(‘all’);
document.getElementById(‘flair-code-input’).value = ‘’;
var f = FLAIR_DISPLAY[matched];
statusEl.style.color = ‘#b89f37’;
statusEl.textContent = ‘✓ ’ + f.symbol + ’ ’ + f.label + ’ flair applied!’;
setTimeout(function() { statusEl.textContent = ‘’; }, 5000);
loadFlairs();
renderComments();
}

function toggleTypeDropdown() {
var tier = document.getElementById(‘flair-admin-tier’).value;
var typeEl = document.getElementById(‘flair-admin-type’);
if (tier === ‘artist’ || tier === ‘writer’) {
typeEl.style.display = ‘inline-block’;
} else {
typeEl.style.display = ‘none’;
typeEl.value = ‘’;
}
}

function adminAssignFlair() {
if (!currentUser) return;
if (currentUser.email !== MODERATOR_EMAIL) return;
var raw      = document.getElementById(‘flair-admin-email’).value;
// Check for Changeusername command
var cmdMatch = raw.trim().match(/^changeusername((.+?),\s*(.+?))$/i);
if (cmdMatch) {
var result = adminChangeUsername(cmdMatch[1], cmdMatch[2]);
var statusEl = document.getElementById(‘flair-admin-status’);
statusEl.style.color = result.indexOf(‘Error’) === 0 ? ‘#FF6B35’ : ‘#b89f37’;
statusEl.textContent = result;
document.getElementById(‘flair-admin-email’).value = ‘’;
setTimeout(function() { statusEl.textContent = ‘’; }, 6000);
return;
}
function runCmd(fn,arg){
var statusEl=document.getElementById(‘flair-admin-status’);
var result=fn(arg)||’’;
var isErr = result.indexOf(‘Error’) === 0 || result === ‘Cancelled.’;
statusEl.style.color = isErr ? ‘#FF6B35’ : ‘#b89f37’;
statusEl.textContent = result;
// Only clear textarea on success — keep args visible on error for correction
if (!isErr) document.getElementById(‘flair-admin-email’).value=’’;
setTimeout(function(){statusEl.textContent=’’;},8000);
}
var rawT=raw.trim(),m;
if((m=rawT.match(/^assignmod((.+))$/i)))     {runCmd(adminAssignMods,m[1]);renderComments();return;}
if((m=rawT.match(/^removemod((.+))$/i)))     {runCmd(adminRemoveMods,m[1]);renderComments();return;}
if((m=rawT.match(/^banuser((.+))$/i)))       {runCmd(adminBanUsers,m[1]);return;}
if((m=rawT.match(/^reinstateuser((.+))$/i))) {runCmd(adminReinstateUsers,m[1]);return;}
if((m=rawT.match(/^warnuser((.+))$/i)))      {runCmd(adminWarnUsers,m[1]);return;}
if((m=rawT.match(/^flairtime((.+?),\s*(\d+),\s*(\d+))$/i))) {runCmd(function(){ return adminSetFlairTime(m[1],parseInt(m[2]),parseInt(m[3])); },’’);renderComments();return;}
if((m=rawT.match(/^dmuser((.+))$/i)))        {runCmd(adminDmUser,m[1]);return;}
if(rawT.match(/^viewusers(\s*)$/i)||rawT.match(/^viewusers$/i)) {openViewUsers();return;}
if((m=rawT.match(/^viewusers((.+))$/i)))   {openViewUsersFiltered(m[1]);return;}
if(rawT.match(/^bannedusers(\s*)$/i)||rawT.match(/^bannedusers$/i)) {openBannedUsers(’’);return;}
if((m=rawT.match(/^bannedusers((.+))$/i))) {openBannedUsers(m[1]);return;}
if((m=rawT.match(/^restrictpage((.+))$/i)))   {runCmd(adminRestrictPage,m[1]);return;}
if((m=rawT.match(/^unrestrictpage((.+))$/i))) {runCmd(adminUnrestrictPage,m[1]);return;}
if((m=rawT.match(/^flairtext((.+))$/i)))      {runCmd(adminFlairText,m[1]);return;}
if((m=rawT.match(/^hoveradd((.+))$/i)))       {runCmd(adminHoverAdd,m[1]);return;}
if((m=rawT.match(/^hoverremove((.+))$/i)))    {runCmd(adminHoverRemove,m[1]);return;}
if((m=rawT.match(/^hovertiers((.+))$/i)))     {runCmd(adminHoverTiers,m[1]);return;}
if((m=rawT.match(/^hovercount((.+))$/i)))     {runCmd(adminHoverCount,m[1]);return;}
if((m=rawT.match(/^hoverlist((.+))$/i)))      {runCmd(adminHoverList,m[1]);return;}
if(rawT.match(/^hoverlist(\s*)$/i)||rawT.match(/^hoverlist$/i)) {runCmd(adminHoverList,‘all’);return;}
if((m=rawT.match(/^adjustrating((.+))$/i)))  {runCmd(adminAdjustRating,m[1]);return;}
if((m=rawT.match(/^flaircode((.+))$/i)))      {runCmd(adminFlairCode,m[1]);return;}
if((m=rawT.match(/^flaircolor((.+))$/i)))     {runCmd(adminFlairColor,m[1]);return;}
var tier     = document.getElementById(‘flair-admin-tier’).value;
var scope    = document.getElementById(‘flair-admin-scope’).value;
var statusEl = document.getElementById(‘flair-admin-status’);
if (!raw.trim() || !tier) {
statusEl.style.color = ‘#FF6B35’;
statusEl.textContent = ‘Fill in both fields.’;
return;
}
// Support emails and usernames
var entries = raw.split(/[\n,;]+/).map(function(e) { return e.replace(/[’”]/g, ‘’).trim(); }).filter(function(e) { return e.length > 0; });
var emails = [];
entries.forEach(function(entry) {
if (entry.indexOf(’@’) !== -1) {
emails.push(entry.toLowerCase());
} else {
// Use resolveEmailAnyPage so usernames stored anywhere on the site work,
// even if the user hasn’t commented on this page
var found = resolveEmailAnyPage(entry);
if (found) emails.push(found.toLowerCase());
}
});
if (emails.length === 0) {
statusEl.style.color = ‘#FF6B35’;
statusEl.textContent = ‘No valid emails or usernames found.’;
return;
}
var target    = scope === ‘page’ ? flairPageData : flairData;
var other     = scope === ‘page’ ? flairData : flairPageData;
var typeEl    = document.getElementById(‘flair-admin-type’);
var typeVal   = typeEl ? typeEl.value : ‘’;
var changed   = [];
var skipped   = [];
emails.forEach(function(email) {
if (tier === ‘none’) {
// Always apply removals
delete target[email];
delete other[email];
changed.push(email);
clearFlairTenure(email);
} else {
// Check if anything actually differs
var existingTier  = target[email];
var existingOther = other[email];
var existingType  = commentTypes[email] || ‘’;
var newType       = typeVal || ‘’;
// Same tier on same scope, no conflicting scope flair, same page type – skip
var sameTier  = (existingTier === tier);
var noConflict = !existingOther;
var sameType  = (existingType === newType);
if (sameTier && noConflict && sameType) {
skipped.push(email);
return;
}
target[email] = tier;
delete other[email];
changed.push(email);
recordFlairTenure(email, tier);
// Stamp the current tier-wide color onto this user at assignment time
// ONLY if a real custom color exists – never stamp tooltip-only entries
if (FLAIR_COLOR_OVERRIDES[tier] && FLAIR_COLOR_OVERRIDES[tier].color && FLAIR_COLOR_OVERRIDES[tier].color.length > 0) {
FLAIR_COLOR_BY_USER[email] = { color: FLAIR_COLOR_OVERRIDES[tier].color, tooltip: FLAIR_COLOR_OVERRIDES[tier].tooltip };
try {
var cu = JSON.parse(localStorage.getItem(‘airdriftFlairColorByUser’) || ‘{}’);
cu[email] = FLAIR_COLOR_BY_USER[email];
localStorage.setItem(‘airdriftFlairColorByUser’, JSON.stringify(cu));
} catch(e) {}
}
}
});
// Notify each user whose flair changed
if (changed.length > 0 && tier !== ‘none’) {
var fd2 = FLAIR_DISPLAY[tier];
changed.forEach(function(em) {
var notifKey2 = ‘airdriftNotifications:’ + em;
try {
var rn2 = JSON.parse(localStorage.getItem(notifKey2) || ‘[]’);
rn2.unshift({ id:‘flair_’+Date.now()+’_’+em, type:‘system’, read:false,
fromName:‘AirdriftSignals’,
preview: (fd2 ? fd2.symbol + ’ ’ : ‘’) + ‘Your flair has been updated to ’ + (fd2 ? fd2.label : tier) + ‘!’,
time: new Date().toISOString(), pageUrl: window.location.pathname });
localStorage.setItem(notifKey2, JSON.stringify(rn2));
} catch(e) {}
});
// If current user’s own flair changed, show them a modal
if (currentUser && changed.indexOf(currentUser.email) !== -1) {
var fd3 = FLAIR_DISPLAY[tier];
showAnnouncement(‘Flair Updated!’,
‘You now have ’ + (fd3 ? fd3.symbol + ’ <strong>’ + fd3.label + ‘</strong>’ : tier) + ’ flair.’,
fd3 ? fd3.symbol : ‘✨’);
}
}
// Only save and render if something actually changed
if (changed.length > 0) {
if (scope === ‘page’) {
saveFlairs(‘page’);
} else {
saveFlairs(‘all’);
// Clear this email from ALL page-specific flair keys so all-pages flair isn’t overridden
var allKeys = Object.keys(localStorage);
allKeys.forEach(function(k) {
if (k.indexOf(‘airdriftFlairs:’) === 0) {
try {
var pd = JSON.parse(localStorage.getItem(k) || ‘{}’);
var dirty = false;
changed.forEach(function(em) {
if (tier === ‘none’ || pd[em]) { delete pd[em]; dirty = true; }
});
if (dirty) localStorage.setItem(k, JSON.stringify(pd));
} catch(e) {}
}
});
// Reload page flair data to reflect cleared state
var sp = localStorage.getItem(FLAIRS_PAGE_KEY);
if (sp) { try { flairPageData = JSON.parse(sp); } catch(e) { flairPageData = {}; } }
}
}
var scopeLabel = scope === ‘page’ ? ‘this page’ : ‘all pages’;
if (changed.length === 0 && skipped.length > 0) {
statusEl.style.color = ‘#555’;
statusEl.textContent = ‘No change – ’ + skipped.length + ’ user’ + (skipped.length > 1 ? ‘s’ : ‘’) + ’ already have this flair.’;
} else if (tier === ‘none’) {
statusEl.style.color = ‘#aaa’;
statusEl.textContent = ‘Flair removed for ’ + changed.length + ’ email’ + (changed.length > 1 ? ‘s’ : ‘’) + ’ on ’ + scopeLabel + ‘.’;
} else {
var f = FLAIR_DISPLAY[tier];
var msg = ‘\u2713 ’ + f.symbol + ’ ’ + f.label + ’ assigned to ’ + changed.length + ’ email’ + (changed.length > 1 ? ‘s’ : ‘’) + ’ on ’ + scopeLabel + ‘.’;
if (skipped.length > 0) msg += ’ (’ + skipped.length + ’ unchanged)’;
statusEl.style.color = ‘#b89f37’;
statusEl.textContent = msg;
// No modal for mod commands – status text shown inline in statusEl
// Users receive a flair update notification instead (handled below)
}
// Handle comment type for Artist/Writer on this page
if (typeVal && changed.length > 0) {
changed.forEach(function(email) {
if (typeVal === ‘none’) { delete commentTypes[email]; }
else                   { commentTypes[email] = typeVal; }
});
saveCommentTypes();
}
if (typeEl) { typeEl.value = ‘’; typeEl.style.display = ‘none’; }
document.getElementById(‘flair-admin-email’).value = ‘’;
document.getElementById(‘flair-admin-tier’).value = ‘’;
setTimeout(function() { statusEl.textContent = ‘’; }, 5000);
loadFlairs();
renderComments();
}

function voteItem(btn) {
if (!currentUser) { showSignInModal(‘Sign in to vote on comments.’); return; }
var itemId   = btn.getAttribute(‘data-id’);
var dir      = btn.getAttribute(‘data-dir’);
var voteKey  = currentUser.email + ‘:’ + itemId;
var existing = userVotes[voteKey];

```
// Find item -- could be a top-level comment or a reply
var item = null;
for (var i = 0; i < allComments.length; i++) {
  if (allComments[i].id === itemId) { item = allComments[i]; break; }
  var replies = allComments[i].replies || [];
  for (var j = 0; j < replies.length; j++) {
    if (replies[j].id === itemId) { item = replies[j]; break; }
  }
  if (item) break;
}
if (!item) return;

// Prevent voting on own content
if (item.email === currentUser.email) { alert('You cannot vote on your own comment.'); return; }

if (existing === dir) {
  // Same direction -- remove vote
  if (dir === 'up')   item.upvotes   = Math.max(0, (item.upvotes   || 0) - 1);
  if (dir === 'down') item.downvotes = Math.max(0, (item.downvotes || 0) - 1);
  delete userVotes[voteKey];
} else {
  // Remove previous vote if switching
  if (existing === 'up')   item.upvotes   = Math.max(0, (item.upvotes   || 0) - 1);
  if (existing === 'down') item.downvotes = Math.max(0, (item.downvotes || 0) - 1);
  // Apply new vote
  if (dir === 'up')   item.upvotes   = (item.upvotes   || 0) + 1;
  if (dir === 'down') item.downvotes = (item.downvotes || 0) + 1;
  userVotes[voteKey] = dir;
}

saveComments();
saveVotes();
// Check if current user crossed a community rank threshold on this vote
if (currentUser && item && item.email === currentUser.email) {
  var newRating = getRatingWithAdjustment(currentUser.email);
  var newRank   = getCommunityRank(newRating);
  var prevRating = newRating - (dir === 'up' ? 1 : -1);
  var prevRank  = getCommunityRank(prevRating);
  if (newRank && (!prevRank || newRank.label !== prevRank.label)) {
    showAnnouncement('Community Rank Unlocked!',
      'You\'ve reached <strong style="color:#b89f37;font-family:\'' + newRank.font + '\',Georgia,serif;font-size:18px;">' + newRank.label + '</strong>!<br><span style="font-size:28px;line-height:1.4;">' + newRank.emoji + '</span>',
      '\uD83C\uDF89');
  }
}
// Re-render without re-sorting to avoid comments jumping position mid-session
renderCommentsInPlace();
```

}

// Re-render comments updating scores/buttons in place without re-sorting
function renderCommentsInPlace() {
var savedCount = visibleCount;
renderComments();
visibleCount = savedCount;
// Don’t scroll – just update the page in place
}

// ── EDIT / DELETE FUNCTIONS ─────────────────────────

function startEditComment(btn) {
var commentId = btn.getAttribute(‘data-id’);
var comment   = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
var elapsed   = Date.now() - new Date(comment.time).getTime();
var remaining = Math.max(0, 600000 - elapsed);
if (remaining <= 0) { alert(‘The 10 minute edit window has passed.’); renderComments(); return; }

```
var textEl = document.getElementById('comment-text-' + commentId);
if (!textEl) return;

var mins = Math.floor(remaining / 60000);
var secs = Math.floor((remaining % 60000) / 1000);
textEl.innerHTML =
  '<textarea class="edit-textarea" id="edit-input-' + commentId + '" maxlength="5000">' + escapeHTML(comment.text) + '</textarea>' +
  '<div class="edit-timer" id="edit-timer-' + commentId + '">Time remaining: ' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</div>' +
  '<div class="reply-actions" style="margin-top:8px;">' +
    '<button class="reply-btn" onclick="saveEditComment(\'' + commentId + '\')">Save</button>' +
    '<button class="cancel-btn" onclick="renderComments()">Cancel</button>' +
  '</div>';

// Countdown timer
var interval = setInterval(function() {
  var el = document.getElementById('edit-timer-' + commentId);
  if (!el) { clearInterval(interval); return; }
  remaining -= 1000;
  if (remaining <= 0) {
    clearInterval(interval);
    saveEditComment(commentId);
    return;
  }
  var m = Math.floor(remaining / 60000);
  var s = Math.floor((remaining % 60000) / 1000);
  el.textContent = 'Time remaining: ' + m + ':' + (s < 10 ? '0' : '') + s;
}, 1000);
```

}

function saveEditComment(commentId) {
var input = document.getElementById(‘edit-input-’ + commentId);
if (!input) return;
var newText = input.value.trim();
if (!newText) return;
var comment = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
comment.text   = newText;
comment.edited = true;
saveComments();
renderComments();
}

function deleteComment(btn) {
var commentId = btn.getAttribute(‘data-id’);
var comment = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
// Assigned mods cannot delete the site owner’s comments
if (comment.email === MODERATOR_EMAIL && currentUser && currentUser.email !== MODERATOR_EMAIL) {
alert(‘You cannot delete the author's comments.’); return;
}
var hasReplies = (comment.replies || []).filter(function(r) { return !r.deleted; }).length > 0;
var msg = hasReplies
? ‘Delete this comment? It will show as [Deleted] but replies will remain.’
: ‘Delete this comment?’;
if (!confirm(msg)) return;
if (hasReplies) {
// Preserve as [Deleted] so replies still have context
comment.deleted   = true;
comment.text      = ‘’;
comment.name      = ‘’;
comment.votesKept = true;
} else {
// No replies – remove entirely
allComments = allComments.filter(function(c) { return c.id !== comment.id; });
}
saveComments();
renderComments();
}

function startEditReply(btn) {
var replyId   = btn.getAttribute(‘data-id’);
var commentId = btn.getAttribute(‘data-comment-id’);
var comment   = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
var reply = (comment.replies || []).find(function(r) { return r.id === replyId; });
if (!reply) return;
var elapsed   = Date.now() - new Date(reply.time).getTime();
var remaining = Math.max(0, 600000 - elapsed);
if (remaining <= 0) { alert(‘The 10 minute edit window has passed.’); renderComments(); return; }

```
var textEl = document.getElementById('reply-' + replyId);
if (!textEl) return;
var textDiv = textEl.querySelector('.reply-text');
if (!textDiv) return;

var mins = Math.floor(remaining / 60000);
var secs = Math.floor((remaining % 60000) / 1000);
textDiv.innerHTML =
  '<textarea class="edit-textarea" id="edit-reply-input-' + replyId + '" maxlength="2000">' + escapeHTML(reply.text) + '</textarea>' +
  '<div class="edit-timer" id="edit-reply-timer-' + replyId + '">Time remaining: ' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</div>' +
  '<div class="reply-actions" style="margin-top:8px;">' +
    '<button class="reply-btn" onclick="saveEditReply(\'' + replyId + '\',\'' + commentId + '\')" >Save</button>' +
    '<button class="cancel-btn" onclick="renderComments()">Cancel</button>' +
  '</div>';

var interval = setInterval(function() {
  var el = document.getElementById('edit-reply-timer-' + replyId);
  if (!el) { clearInterval(interval); return; }
  remaining -= 1000;
  if (remaining <= 0) { clearInterval(interval); saveEditReply(replyId, commentId); return; }
  var m = Math.floor(remaining / 60000);
  var s = Math.floor((remaining % 60000) / 1000);
  el.textContent = 'Time remaining: ' + m + ':' + (s < 10 ? '0' : '') + s;
}, 1000);
```

}

function saveEditReply(replyId, commentId) {
var input = document.getElementById(‘edit-reply-input-’ + replyId);
if (!input) return;
var newText = input.value.trim();
if (!newText) return;
var comment = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
var reply = (comment.replies || []).find(function(r) { return r.id === replyId; });
if (!reply) return;
reply.text   = newText;
reply.edited = true;
saveComments();
renderComments();
}

function deleteReply(btn) {
var replyId   = btn.getAttribute(‘data-id’);
var commentId = btn.getAttribute(‘data-comment-id’);
var comment = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
var reply = (comment.replies || []).find(function(r) { return r.id === replyId; });
if (!reply) return;
// Assigned mods cannot delete the site owner’s replies
if (reply.email === MODERATOR_EMAIL && currentUser && currentUser.email !== MODERATOR_EMAIL) {
alert(‘You cannot delete the author's replies.’); return;
}
var hasChildren = (comment.replies || []).filter(function(r) { return r.parentId === reply.id && !r.deleted; }).length > 0;
var msg2 = hasChildren
? ‘Delete this reply? It will show as [Deleted] but replies to it will remain.’
: ‘Delete this reply?’;
if (!confirm(msg2)) return;
if (hasChildren) {
reply.deleted   = true;
reply.text      = ‘’;
reply.name      = ‘’;
reply.votesKept = true;
} else {
// No child replies – remove entirely
comment.replies = (comment.replies || []).filter(function(r) { return r.id !== reply.id; });
}
saveComments();
renderComments();
}

var _pendingReport = null;

function showReportConfirm() {
var body =
‘<div style="font-size:13px;color:#aaa;margin-bottom:20px;">This will flag the comment for moderator review.</div>’ +
‘<div style="display:flex;gap:10px;justify-content:center;">’ +
‘<button onclick="confirmReport()" style="background:linear-gradient(135deg,#c03030,#8b1010);color:white;border:none;padding:8px 22px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">Yes, Report</button>’ +
‘<button onclick="document.getElementById(\'announce-modal\').remove();_pendingReport=null;" style="background:none;border:1px solid #333;color:#888;padding:8px 18px;border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit;">Nevermind</button>’ +
‘</div>’;
showAnnouncement(‘File a Report?’, body, ‘🚩’);
}

function confirmReport() {
var existing = document.getElementById(‘announce-modal’);
if (existing) existing.remove();
if (!_pendingReport) return;
var r = _pendingReport;
_pendingReport = null;
_doReport(r.btn, r.itemId, r.authorEmail);
}

function reportComment(btn) {
if (!currentUser) { showSignInModal(‘Sign in to report a comment.’); return; }
if (!isMod(currentUser.email)) {
var reportRateErr = checkReportRateLimit();
if (reportRateErr) { showAnnouncement(‘Report Limit’, reportRateErr, ‘⚠️’); return; }
}
var itemId      = btn.getAttribute(‘data-id’);
var authorEmail = btn.getAttribute(‘data-email’);
// Show confirmation modal – skip for mods flagging their own comments
if (!isMod(currentUser.email)) {
_pendingReport = { btn: btn, itemId: itemId, authorEmail: authorEmail };
showReportConfirm();
return;
}
if (authorEmail && currentUser.email === authorEmail) {
if (isMod(currentUser.email)) {
if (currentUser.email !== MODERATOR_EMAIL) {
modSelfReports.push({modEmail:currentUser.email,itemId:itemId,time:new Date().toISOString()});
localStorage.setItem(MOD_REPORTS_KEY,JSON.stringify(modSelfReports));
}
renderModDashboard();
var dash=document.getElementById(‘mod-dashboard’);
if (dash) dash.style.display=‘block’;
scrollToComments();
return;
}
alert(‘You cannot report your own comment.’);
return;
}
// Mods skip confirmation – run directly
_doReport(btn, itemId, authorEmail);
}

function _doReport(btn, itemId, authorEmail) {
// Find item
var found = null;
allComments.forEach(function(c) {
if (c.id === itemId) {
found = { id: c.id, email: c.email, name: c.name, text: c.text, time: c.time, pageUrl: window.location.pathname, commentId: c.id };
}
(c.replies || []).forEach(function(r) {
if (r.id === itemId) {
found = { id: r.id, email: r.email, name: r.name, text: r.text, time: r.time, pageUrl: window.location.pathname, commentId: c.id };
}
});
});
if (found) {
found.reporterEmail=currentUser.email;
found.reporterName=currentUser.name;
addToReported(found);
reportCounts[currentUser.email]=(reportCounts[currentUser.email]||0)+1;
localStorage.setItem(REPORT_COUNTS_KEY,JSON.stringify(reportCounts));
recordReportTimestamp();
}
if (isMod(currentUser.email)) {
renderModDashboard();
var dash=document.getElementById(‘mod-dashboard’);
if (dash) dash.style.display=‘block’;
scrollToComments();
} else {
alert(‘Comment reported for review. Thank you.’);
}
}
function escapeHTML(text) {
var div = document.createElement(‘div’);
div.textContent = text;
return div.innerHTML;
}

function formatDate(isoString) {
var date = new Date(isoString);
var diff = Math.floor((new Date() - date) / 1000);
if (diff < 60)     return ‘just now’;
if (diff < 3600)   return Math.floor(diff / 60)   + ‘m ago’;
if (diff < 86400)  return Math.floor(diff / 3600)  + ‘h ago’;
if (diff < 604800) return Math.floor(diff / 86400) + ‘d ago’;
return date.toLocaleDateString();
}

// ── PROFILE ICON HEADER BUTTON ─────────────────────

function openProfileIconCard(e) {
if (e) e.stopPropagation();
if (!currentUser) return;
var btn = document.getElementById(‘header-profile-btn’);
openProfileCard(currentUser.email, currentUser.name, btn || document.body);
}

function updateHeaderProfileBtn() {
var btn = document.getElementById(‘header-profile-btn’);
if (!btn) return;
btn.style.display = currentUser ? ‘flex’ : ‘none’;
}

// ── ONLINE / VIEWER COUNT STUBS (GAS-ready) ────────

function updateViewerCount() {
var el = document.getElementById(‘viewer-count’);
if (!el) return;
// TODO: fetch from GAS when live
// fetch(GAS_URL + ‘?action=getViewers&pageUrl=’ + encodeURIComponent(window.location.pathname))
//   .then(function(r) { return r.json(); })
//   .then(function(d) {
//     var n = d.count || 0;
//     el.textContent = n > 0 ? n + ’ viewing’ : ‘’;
//     el.className = n > 0 ? ‘has-viewers’ : ‘’;
//   });
// Stub: always 0 until GAS is live
el.style.display = ‘none’;
}

// Poll viewer count every 30s
setInterval(updateViewerCount, 30000);

// ── TRANSLATION ─────────────────────────────────────

var TRANSLATION_CACHE = {};

function detectLanguage(text) {
// Simple heuristic: check for non-Latin scripts or common non-English patterns
if (/[\u0400-\u04FF\u0500-\u052F]/.test(text)) return ‘ru’; // Cyrillic
if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) return ‘zh’; // CJK
if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return ‘ar’; // Arabic
if (/[\u0900-\u097F]/.test(text)) return ‘hi’; // Devanagari
if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return ‘ja’; // Japanese
if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return ‘ko’; // Korean
// Latin-based: check for common non-English patterns
var lowerWords = text.toLowerCase().split(/\s+/);
var nonEnglishIndicators = [‘der’,‘die’,‘das’,‘und’,‘ich’,‘est’,‘les’,‘que’,‘por’,‘los’,‘del’,‘uno’,‘una’,‘par’];
var hits = lowerWords.filter(function(w) { return nonEnglishIndicators.indexOf(w) !== -1; }).length;
if (hits >= 2) return ‘other’;
return ‘en’;
}

function isLikelyNonEnglish(text) {
return detectLanguage(text) !== ‘en’;
}

function translateText(text, targetLang, callback) {
var cacheKey = text.substring(0,50) + ‘:’ + targetLang;
if (TRANSLATION_CACHE[cacheKey]) { callback(TRANSLATION_CACHE[cacheKey]); return; }
// Use MyMemory free API (no key needed, 5000 chars/day free)
var url = ‘https://api.mymemory.translated.net/get?q=’ + encodeURIComponent(text.substring(0,500)) + ‘&langpair=auto|’ + targetLang;
fetch(url)
.then(function(r) { return r.json(); })
.then(function(d) {
var translated = d.responseData && d.responseData.translatedText ? d.responseData.translatedText : text;
TRANSLATION_CACHE[cacheKey] = translated;
callback(translated);
})
.catch(function() { callback(text); });
}

window.translateComment = function(btn, itemId, originalText) {
var textEl = document.getElementById(‘text-’ + itemId);
if (!textEl) return;
if (btn.dataset.translated === ‘1’) {
// Restore original
textEl.innerHTML = renderMentions(originalText);
btn.textContent = ‘\uD83C\uDF10 Translate’;
btn.dataset.translated = ‘0’;
return;
}
btn.textContent = ‘…’;
translateText(originalText, ‘en’, function(translated) {
textEl.innerHTML = ‘<span class="translated-text">’ + escapeHTML(translated) + ‘</span>’ +
‘<span class="translated-tag">(translated)</span>’;
btn.textContent = ‘↩ Original’;
btn.dataset.translated = ‘1’;
});
};

// ── DM SYSTEM ───────────────────────────────────────

var DM_KEY_PREFIX  = ‘airdriftDM:’;
var activeDmEmail  = null;
var activeDmThread = null;
var activeDmMod    = null;

function getDmKey(emailA, emailB) {
return DM_KEY_PREFIX + [emailA, emailB].sort().join(’:’);
}
function loadDmThread(k) { try { return JSON.parse(localStorage.getItem(k) || ‘[]’); } catch(e) { return []; } }
function saveDmThread(k, msgs) { localStorage.setItem(k, JSON.stringify(msgs)); }
function getDmClosed(k) { return localStorage.getItem(k + ‘:closed’) === ‘1’; }
function setDmClosed(k, v) { if (v) localStorage.setItem(k + ‘:closed’,‘1’); else localStorage.removeItem(k + ‘:closed’); }

function openDmWindow(targetEmail, targetName, callerIsMod) {
activeDmEmail  = targetEmail;
var modEmail   = callerIsMod ? currentUser.email : MODERATOR_EMAIL;
activeDmMod    = modEmail;
activeDmThread = getDmKey(targetEmail, modEmail);
var win = document.getElementById(‘dm-window’);
if (!win) return;
var amMod = currentUser && isMod(currentUser.email);
var titleEl    = document.getElementById(‘dm-title’);
var subtitleEl = document.getElementById(‘dm-subtitle’);
var changeBtn  = document.getElementById(‘dm-change-username-btn’);
var endBtn     = document.getElementById(‘dm-end-btn’);
if (titleEl)    titleEl.textContent    = targetName || targetEmail;
if (subtitleEl) subtitleEl.textContent = amMod ? ‘mod chat’ : ‘private’;
if (changeBtn)  changeBtn.style.display = amMod ? ‘inline-block’ : ‘none’;
if (endBtn)     endBtn.style.display    = amMod ? ‘inline-block’ : ‘none’;
win.style.display = ‘flex’;
renderDmMessages();
var inp = document.getElementById(‘dm-input’);
if (inp) setTimeout(function() { inp.focus(); }, 50);
}

function closeDmWindow() {
var win = document.getElementById(‘dm-window’);
if (win) win.style.display = ‘none’;
}

function endDmChat() {
if (!activeDmThread) return;
if (!window.confirm(‘End this chat? The user will see the chat as closed.’)) return;
setDmClosed(activeDmThread, true);
var msgs = loadDmThread(activeDmThread);
msgs.push({ fromEmail:‘system’, fromName:‘System’, text:’\uD83D\uDD12 Chat ended by moderator.’, time: new Date().toISOString(), system: true });
saveDmThread(activeDmThread, msgs);
renderDmMessages();
updateDmStatusBar();
}

function updateDmStatusBar() {
var bar  = document.getElementById(‘dm-status-bar’);
var inp  = document.getElementById(‘dm-input’);
var sBtn = document.getElementById(‘dm-send-btn’);
if (!activeDmThread) return;
var closed = getDmClosed(activeDmThread);
var amMod  = currentUser && isMod(currentUser.email);
if (closed && !amMod) {
if (bar) { bar.style.display = ‘block’; bar.textContent = ‘\uD83D\uDD12 This chat has been closed by a moderator.’; }
if (inp)  inp.disabled  = true;
if (sBtn) sBtn.disabled = true;
} else {
if (bar)  bar.style.display = ‘none’;
if (inp)  inp.disabled  = false;
if (sBtn) sBtn.disabled = false;
}
}

function renderDmMessages() {
var listEl = document.getElementById(‘dm-messages’);
if (!listEl || !activeDmThread) return;
var msgs = loadDmThread(activeDmThread);
if (msgs.length === 0) {
listEl.innerHTML = ‘<div style="color:#444;font-size:11px;text-align:center;padding:20px;">Start the conversation.</div>’;
} else {
listEl.innerHTML = msgs.map(function(m) {
if (m.system) return ‘<div style="text-align:center;font-size:10px;color:#555;padding:4px 0;">’ + escapeHTML(m.text) + ‘</div>’;
var isMe = currentUser && m.fromEmail === currentUser.email;
var side = isMe ? ‘mine’ : ‘theirs’;
return ‘<div class="dm-msg-wrap ' + side + '">’ +
(!isMe ? ‘<div class="dm-msg-sender">’ + escapeHTML(m.fromName) + ‘</div>’ : ‘’) +
‘<div class="dm-msg">’ + escapeHTML(m.text) + ‘</div>’ +
‘<div class="dm-msg-time">’ + formatDate(m.time) + ‘</div>’ +
‘</div>’;
}).join(’’);
}
listEl.scrollTop = listEl.scrollHeight;
updateDmStatusBar();
}

function sendDmMessage() {
if (!currentUser || !activeDmThread) return;
if (getDmClosed(activeDmThread) && !isMod(currentUser.email)) return;
var inp = document.getElementById(‘dm-input’);
var text = inp ? inp.value.trim() : ‘’;
if (!text) return;
var msgs = loadDmThread(activeDmThread);
msgs.push({ fromEmail: currentUser.email, fromName: currentUser.name, text: text, time: new Date().toISOString() });
saveDmThread(activeDmThread, msgs);
inp.value = ‘’;
renderDmMessages();
// Notify the other person
var recipEmail = (currentUser.email === activeDmEmail) ? activeDmMod : activeDmEmail;
if (recipEmail) {
var notifKey = ‘airdriftNotifications:’ + recipEmail;
try {
var rn = JSON.parse(localStorage.getItem(notifKey) || ‘[]’);
rn = rn.filter(function(n) { return n.dmThread !== activeDmThread; });
// Always store the non-mod user’s email as dmEmail so thread can be reconstructed
var notifDmEmail = isMod(currentUser.email) ? activeDmEmail : currentUser.email;
var notifDmMod   = isMod(currentUser.email) ? currentUser.email : activeDmMod;
rn.unshift({ id:‘dm_’+Date.now(), type:‘dm’, fromName: currentUser.name,
preview:’\uD83D\uDCAC ‘+currentUser.name+’: ’+text.substring(0,60),
time: new Date().toISOString(), read:false,
dmThread: activeDmThread, dmEmail: notifDmEmail, dmMod: notifDmMod });
localStorage.setItem(notifKey, JSON.stringify(rn));
} catch(e) {}
}
}

function dmChangeUsername() {
if (!activeDmEmail) return;
var currentName = usernameMap[activeDmEmail] || activeDmEmail;
var newName = window.prompt(‘Enter a new username for ’ + currentName + ‘:’, currentName);
if (!newName || !newName.trim()) return;
newName = newName.trim();
if (containsBannedContent(newName)) { alert(‘That username is not allowed.’); return; }
// Check uniqueness
var taken = Object.keys(usernameMap).some(function(k) {
return !k.endsWith(’*seen’) && usernameMap[k].toLowerCase() === newName.toLowerCase() && k !== activeDmEmail;
});
if (taken) { alert(‘That username is already taken.’); return; }
usernameMap[activeDmEmail] = newName;
saveUsernames();
// Notify user
var notifKey = ‘airdriftNotifications:’ + activeDmEmail;
try {
var recipNotifs = JSON.parse(localStorage.getItem(notifKey) || ‘[]’);
recipNotifs.unshift({
id: ’rename*’ + Date.now(), type: ‘system’,
preview: ’\u2139\uFE0F Your username has been changed to ’ + newName,
time: new Date().toISOString(), read: false
});
localStorage.setItem(notifKey, JSON.stringify(recipNotifs));
} catch(e) {}
renderComments();
alert(’Username changed to ’ + newName);
}

// DMuser command
function adminDmUser(rawInput) {
if (!currentUser || !isMod(currentUser.email)) return ‘Error: moderators only.’;
var email = resolveEmailFromInput(rawInput.trim());
if (!email) return ‘Error: user “’ + rawInput.trim() + ‘” not found.’;
if (email === currentUser.email) return ‘Error: cannot DM yourself.’;
var name = usernameMap[email] || email;
// Alert the user (via notification)
var notifKey = ‘airdriftNotifications:’ + email;
try {
var recipNotifs = JSON.parse(localStorage.getItem(notifKey) || ‘[]’);
recipNotifs.unshift({
id: ‘dm_alert_’ + Date.now(), type: ‘dm_invite’,
fromName: currentUser.name,
preview: ‘\uD83D\uDCAC ’ + currentUser.name + ’ wants to chat with you.’,
time: new Date().toISOString(), read: false
});
localStorage.setItem(notifKey, JSON.stringify(recipNotifs));
} catch(e) {}
openDmWindow(email, name, true);
return ’DM window opened with ’ + name + ‘. User has been notified.’;
}

// ── VIEWUSERS ───────────────────────────────────────

var vuSortCol = ‘firstSeen’;
var vuSortDir = ‘asc’;

function gatherAllUsers() {
var users = {};
// Gather from usernameMap
Object.keys(usernameMap).forEach(function(email) {
if (email.endsWith(’_seen’)) return;
if (!users[email]) users[email] = { email: email, username: usernameMap[email] || ‘’, firstSeen: null, lastSeen: null, commentCount: 0, votes: 0, flair: null, banned: false };
});
// Gather from comments across all pages
Object.keys(localStorage).forEach(function(key) {
if (key.indexOf(‘airdriftComments:’) !== 0) return;
try {
var items = JSON.parse(localStorage.getItem(key)) || [];
items.forEach(function(c) {
if (!c.email) return;
if (!users[c.email]) users[c.email] = { email: c.email, username: usernameMap[c.email] || c.name || c.email, firstSeen: null, lastSeen: null, commentCount: 0, votes: 0, flair: null, banned: false };
var u = users[c.email];
if (!u.username && c.name) u.username = c.name;
if (!c.deleted) { u.commentCount++; u.votes += ((c.upvotes||0)-(c.downvotes||0)); }
if (!u.firstSeen || c.time < u.firstSeen) u.firstSeen = c.time;
if (!u.lastSeen  || c.time > u.lastSeen)  u.lastSeen  = c.time;
(c.replies||[]).forEach(function(r) {
if (!r.email) return;
if (!users[r.email]) users[r.email] = { email: r.email, username: usernameMap[r.email] || r.name || r.email, firstSeen: null, lastSeen: null, commentCount: 0, votes: 0, flair: null, banned: false };
var ur = users[r.email];
if (!ur.username && r.name) ur.username = r.name;
if (!r.deleted) { ur.commentCount++; ur.votes += ((r.upvotes||0)-(r.downvotes||0)); }
if (!ur.firstSeen || r.time < ur.firstSeen) ur.firstSeen = r.time;
if (!ur.lastSeen  || r.time > ur.lastSeen)  ur.lastSeen  = r.time;
});
});
} catch(e) {}
});
// Add flair and banned status
Object.keys(users).forEach(function(email) {
users[email].flair = flairData[email] || flairPageData[email] || null;
users[email].banned = !!bannedUsers[email];
});
return Object.values(users);
}

function openViewUsers() {
if (!currentUser || currentUser.email !== MODERATOR_EMAIL) return;
var modal = document.getElementById(‘viewusers-modal’);
if (modal) modal.style.display = ‘flex’;
renderViewUsersTable();
}

function closeViewUsers() {
var modal = document.getElementById(‘viewusers-modal’);
if (modal) modal.style.display = ‘none’;
}

function renderViewUsersTable() {
var users = gatherAllUsers();
var cols = [
{ key: ‘email’,        label: ‘Email’ },
{ key: ‘username’,     label: ‘Username’ },
{ key: ‘firstSeen’,    label: ‘First Sign-in’ },
{ key: ‘lastSeen’,     label: ‘Last Seen’ },
{ key: ‘commentCount’, label: ‘Comments’ },
{ key: ‘votes’,        label: ‘Rating’ },
{ key: ‘flair’,        label: ‘Flair’ },
{ key: ‘banned’,       label: ‘Banned’ },
];
// Sort
users.sort(function(a, b) {
var av = a[vuSortCol] || ‘’, bv = b[vuSortCol] || ‘’;
if (typeof av === ‘boolean’) { av = av ? 1 : 0; bv = bv ? 1 : 0; }
if (typeof av === ‘number’)  { return vuSortDir === ‘asc’ ? av - bv : bv - av; }
return vuSortDir === ‘asc’ ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
});
var head = document.getElementById(‘viewusers-head’);
var body = document.getElementById(‘viewusers-body’);
if (!head || !body) return;
head.innerHTML = ‘<tr>’ + cols.map(function(c) {
var arrow = c.key === vuSortCol ? (vuSortDir === ‘asc’ ? ’ ▲’ : ’ ▼’) : ‘’;
return ‘<th onclick="window.vuSort(\'' + c.key + '\')">’ + c.label + arrow + ‘</th>’;
}).join(’’) + ‘</tr>’;
body.innerHTML = users.map(function(u) {
return ‘<tr>’ +
‘<td style="color:#555;max-width:160px;overflow:hidden;text-overflow:ellipsis;">’ + escapeHTML(u.email) + ‘</td>’ +
‘<td style="color:#b89f37;">’ + escapeHTML(u.username || ‘–’) + ‘</td>’ +
‘<td>’ + (u.firstSeen ? formatDate(u.firstSeen) : ‘–’) + ‘</td>’ +
‘<td>’ + (u.lastSeen  ? formatDate(u.lastSeen)  : ‘–’) + ‘</td>’ +
‘<td style="text-align:center;">’ + u.commentCount + ‘</td>’ +
‘<td style="text-align:center;">’ + u.votes + ‘</td>’ +
‘<td style="color:#c0c0c0;">’ + (u.flair ? (FLAIR_DISPLAY[u.flair] ? FLAIR_DISPLAY[u.flair].symbol + ’ ’ + FLAIR_DISPLAY[u.flair].label : u.flair) : ‘–’) + ‘</td>’ +
‘<td style="color:#ff4444;">’ + (u.banned ? ‘● banned’ : ‘’) + ‘</td>’ +
‘</tr>’;
}).join(’’);
document.getElementById(‘viewusers-controls’).innerHTML =
‘<span style="font-size:11px;color:#555;">’ + users.length + ’ users</span>’;
}

window.vuSort = function(col) {
if (vuSortCol === col) { vuSortDir = vuSortDir === ‘asc’ ? ‘desc’ : ‘asc’; }
else { vuSortCol = col; vuSortDir = ‘asc’; }
renderViewUsersTable();
};

function downloadViewUsersCSV() {
var users = gatherAllUsers();
var headers = [‘Email’,‘Username’,‘First Sign-in’,‘Last Seen’,‘Comments’,‘Community Rating’,‘Flair’,‘Banned’];
var rows = users.map(function(u) {
return [
u.email, u.username||’’,
u.firstSeen ? new Date(u.firstSeen).toLocaleString() : ‘’,
u.lastSeen  ? new Date(u.lastSeen).toLocaleString()  : ‘’,
u.commentCount, u.votes,
u.flair ? (FLAIR_DISPLAY[u.flair] ? FLAIR_DISPLAY[u.flair].label : u.flair) : ‘’,
u.banned ? ‘banned’ : ‘’
].map(function(v) { return ‘”’ + String(v).replace(/”/g,’””’) + ‘”’; }).join(’,’);
});
var csv = [headers.join(’,’)].concat(rows).join(’\n’);
var a = document.createElement(‘a’);
a.href = ‘data:text/csv;charset=utf-8,’ + encodeURIComponent(csv);
a.download = ‘airdrift-users-’ + new Date().toISOString().slice(0,10) + ‘.csv’;
a.click();
}

// ── USER COMMENTS VIEWER ────────────────────────────

function openUserComments(email, name) {
var modal = document.getElementById(‘user-comments-modal’);
var title = document.getElementById(‘user-comments-title’);
var list  = document.getElementById(‘user-comments-list’);
if (!modal || !title || !list) return;
title.textContent = name + ‘'s Comments’;
var items = [];
Object.keys(localStorage).forEach(function(key) {
if (key.indexOf(‘airdriftComments:’) !== 0) return;
var pageUrl = key.replace(‘airdriftComments:’, ‘’);
try {
var comments = JSON.parse(localStorage.getItem(key)) || [];
comments.forEach(function(c) {
if (c.email === email && !c.deleted && !c.shadowSession)
items.push({ text: c.text, time: c.time, pageUrl: pageUrl, id: c.id, isReply: false, commentId: c.id });
(c.replies||[]).forEach(function(r) {
if (r.email === email && !r.deleted && !r.shadowSession)
items.push({ text: r.text, time: r.time, pageUrl: pageUrl, id: r.id, isReply: true, commentId: c.id });
});
});
} catch(e) {}
});
items.sort(function(a,b) { return new Date(b.time) - new Date(a.time); });
if (items.length === 0) {
list.innerHTML = ‘<div style="color:#444;text-align:center;padding:20px;">No comments found.</div>’;
} else {
list.innerHTML = items.map(function(item) {
return ‘<div class="uc-item" onclick="window.jumpToUserComment(\'' + item.pageUrl + '\',\'' + item.commentId + '\',\'' + (item.isReply ? item.id : '') + '\')">’ +
‘<div class="uc-item-meta">’ + (item.isReply ? ‘↲ Reply · ’ : ‘’) + formatDate(item.time) + ’ · ’ + escapeHTML(item.pageUrl) + ‘</div>’ +
‘<div>’ + escapeHTML((item.text||’’).substring(0,150)) + ((item.text||’’).length > 150 ? ‘…’ : ‘’) + ‘</div>’ +
‘</div>’;
}).join(’’);
}
modal.style.display = ‘flex’;
// Reset position for new opens
modal.style.transform = ‘translateX(-50%)’;
modal.style.left = ‘50%’;
modal.style.top  = ‘60px’;
}

function closeUserComments() {
var modal = document.getElementById(‘user-comments-modal’);
if (modal) modal.style.display = ‘none’;
}

window.jumpToUserComment = function(pageUrl, commentId, replyId) {
closeUserComments();
if (pageUrl === window.location.pathname.split(’?’)[0]) {
var sorted = getSortedComments();
var idx = sorted.findIndex(function(c) { return c.id === commentId; });
if (idx !== -1) visibleCount = Math.max(visibleCount, idx + 1);
expandReplyChain(commentId, replyId || null, function() {
scrollToElement(replyId ? ‘reply-’ + replyId : ‘comment-’ + commentId);
});
} else {
sessionStorage.setItem(‘airdriftScrollTo’, JSON.stringify({
targetId: replyId ? ‘reply-’ + replyId : ‘comment-’ + commentId,
commentId: commentId
}));
window.location.href = pageUrl;
}
};

// ── WIRE COMMANDS ───────────────────────────────────

// ── USER COMMENTS PANEL DRAG ─────────────────────
(function() {
var dragging = false, startX, startY, origLeft, origTop;
window.initDragUC = function(e) {
var panel = document.getElementById(‘user-comments-modal’);
if (!panel) return;
// Switch from CSS centering to absolute positioning on first drag
if (panel.style.left === ‘’ || panel.style.transform !== ‘’) {
var r = panel.getBoundingClientRect();
panel.style.transform = ‘none’;
panel.style.left = r.left + ‘px’;
panel.style.top  = r.top  + ‘px’;
}
dragging = true;
startX = e.clientX; startY = e.clientY;
origLeft = parseInt(panel.style.left) || 0;
origTop  = parseInt(panel.style.top)  || 60;
function onMove(e) {
if (!dragging) return;
panel.style.left = (origLeft + e.clientX - startX) + ‘px’;
panel.style.top  = (origTop  + e.clientY - startY) + ‘px’;
}
function onUp() { dragging = false; document.removeEventListener(‘mousemove’, onMove); document.removeEventListener(‘mouseup’, onUp); }
document.addEventListener(‘mousemove’, onMove);
document.addEventListener(‘mouseup’, onUp);
};
})();

// ── PROFILE CARD TABS ───────────────────────────────
function pcSwitchTab(tabEl, id) {
var card = document.getElementById(‘profile-card’);
if (!card) return;
card.querySelectorAll(’.pc-tab’).forEach(function(t) { t.classList.remove(‘active’); });
card.querySelectorAll(’.pc-tab-panel’).forEach(function(p) { p.classList.remove(‘active’); });
tabEl.classList.add(‘active’);
var panel = card.querySelector(’#pc-panel-’ + id);
if (panel) panel.classList.add(‘active’);
}

// ── THEME TOGGLE ────────────────────────────────────
function pcToggleTheme(checkbox) {
if (checkbox.checked) {
document.body.classList.add(‘airdrift-light’);
localStorage.setItem(‘airdriftTheme’, ‘light’);
} else {
document.body.classList.remove(‘airdrift-light’);
localStorage.setItem(‘airdriftTheme’, ‘dark’);
}
}

// Apply saved theme on load
(function() {
if (localStorage.getItem(‘airdriftTheme’) === ‘light’) {
document.body.classList.add(‘airdrift-light’);
}
})();

// ── SUBSCRIPTION TOGGLE ─────────────────────────────
function pcToggleSub(checkbox, pageUrl) {
var subs = getSubscriptions();
if (checkbox.checked) {
subs[pageUrl] = true;
} else {
delete subs[pageUrl];
}
localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
}

// ── ADJUST RATING (admin testing command) ──────────
function adminAdjustRating(rawInput) {
var m = rawInput.match(/^(.+?),\s*(-?\d+)$/);
if (!m) return ‘Usage: AdjustRating(username, points)’;
var email = resolveEmailAnyPage(m[1].trim());
if (!email) return ‘Error: user “’ + m[1].trim() + ‘” not found.’;
var pts = parseInt(m[2]);
var newTotal = pts; // Set to exact number, not cumulative
localStorage.setItem(‘airdriftRatingAdj:’ + email, newTotal.toString());
renderComments();
var rank = getCommunityRank(getTotalVotes(email) + newTotal);
return ‘Done. ’ + (usernameMap[email]||email) + ’ adj=’ + newTotal + ’ rank=’ + rank.label;
}

// ── ANNOUNCEMENT MODAL ──────────────────────────────
function showAnnouncement(title, body, icon) {
var existing = document.getElementById(‘announce-modal’);
if (existing) existing.remove();
var div = document.createElement(‘div’);
div.id = ‘announce-modal’;
div.style.cssText = ‘position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;’;
div.innerHTML =
‘<div style="background:#111;border:1px solid #2a5f7f;border-radius:12px;padding:28px 28px 22px;max-width:380px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.8);">’ +
(icon ? ‘<div style="font-size:40px;margin-bottom:12px;">’ + icon + ‘</div>’ : ‘’) +
‘<div style="font-size:16px;font-weight:700;color:#b89f37;margin-bottom:10px;">’ + title + ‘</div>’ +
‘<div style="font-size:13px;color:#aaa;line-height:1.6;margin-bottom:20px;">’ + body + ‘</div>’ +
‘<button onclick="document.getElementById(\'announce-modal\').remove()" style="background:linear-gradient(135deg,#2a5f7f,#1a3f5f);color:#b89f37;border:none;padding:9px 28px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">OK</button>’ +
‘</div>’;
div.addEventListener(‘click’, function(e) { if (e.target === div) div.remove(); });
document.body.appendChild(div);
}

// ── FLAIRCODE COMMAND ───────────────────────────────
function adminFlairCode(rawInput) {
// FlairCode(flair, code) – overwrites any previous code for that flair tier
var m = rawInput.match(/^([a-zA-Z]+),\s*(.+)$/);
if (!m) return ‘Usage: FlairCode(flair, newcode)’;
var tier = m[1].trim().toLowerCase();
var code = m[2].trim();
if (!FLAIR_DISPLAY[tier]) return ‘Error: unknown flair tier “’ + tier + ‘”.’;
FLAIR_CODES[tier] = code;
// Persist to localStorage so it survives page reload
var stored = {};
try { stored = JSON.parse(localStorage.getItem(‘airdriftFlairCodes’) || ‘{}’); } catch(e) {}
stored[tier] = code;
localStorage.setItem(‘airdriftFlairCodes’, JSON.stringify(stored));
return ’Done. ’ + FLAIR_DISPLAY[tier].label + ’ code set to: ’ + code;
}

// Load any saved flair codes on startup
(function() {
try {
var saved = JSON.parse(localStorage.getItem(‘airdriftFlairCodes’) || ‘{}’);
Object.keys(saved).forEach(function(k) { if (FLAIR_CODES[k]) FLAIR_CODES[k] = saved[k]; });
} catch(e) {}
})();

// ── FLAIRCOLOR COMMAND ──────────────────────────────
// FlairColor(flair, #hexcolor, optional hover text)
// Overrides the symbol/text color for that tier while keeping metallic/gradient styling
var FLAIR_COLOR_OVERRIDES = {};    // tier-wide defaults
var FLAIR_COLOR_BY_USER   = {};    // per-user stamp { email: { color, tooltip } }

(function() {
try {
var saved = JSON.parse(localStorage.getItem(‘airdriftFlairColors’) || ‘{}’);
// Only load entries that have a real non-empty color – stale entries with
// empty color strings would strip the CSS gradient styling
Object.keys(saved).forEach(function(k) {
if (saved[k] && saved[k].color && saved[k].color.length > 0) {
FLAIR_COLOR_OVERRIDES[k] = saved[k];
}
});
} catch(e) {}
try {
var savedU = JSON.parse(localStorage.getItem(‘airdriftFlairColorByUser’) || ‘{}’);
Object.keys(savedU).forEach(function(k) {
if (savedU[k] && savedU[k].color && savedU[k].color.length > 0) {
FLAIR_COLOR_BY_USER[k] = savedU[k];
}
});
} catch(e) {}
})();

// ── SEASONAL DRIFTER HOVER TEXT ─────────────────────
// Automatically updates the Drifter tier-wide hover tooltip each season.
// Season boundaries: Spring Mar 1, Summer Jun 1, Fall Sep 1, Winter Dec 1
function getDrifterSeasonLabel() {
var now    = new Date();
var month  = now.getMonth(); // 0=Jan … 11=Dec
var year   = now.getFullYear();
var season, seasonYear;
if (month >= 2 && month <= 4)  { season = ‘Spring’; seasonYear = year; }
else if (month >= 5 && month <= 7)  { season = ‘Summer’; seasonYear = year; }
else if (month >= 8 && month <= 10) { season = ‘Fall’;   seasonYear = year; }
else { season = ‘Winter’; seasonYear = month === 11 ? year + 1 : year; }
return season + ’ '’ + String(seasonYear).slice(2);
}

function syncDrifterSeasonTooltip() {
var label = getDrifterSeasonLabel();
var existing = FLAIR_COLOR_OVERRIDES[‘newcomer’] || {};
if (existing.tooltip === label) return; // already current season
// ONLY update the tooltip — never write a color value here
// This prevents Drifter season sync from ever bleeding into other tiers
// or stripping CSS gradients via the hasColor check in getUserFlair
FLAIR_COLOR_OVERRIDES[‘newcomer’] = { color: existing.color || ‘’, tooltip: label };
try {
var st = JSON.parse(localStorage.getItem(‘airdriftFlairColors’) || ‘{}’);
// Only write tooltip key — preserve any existing color untouched
var stored = st[‘newcomer’] || {};
st[‘newcomer’] = { color: stored.color || ‘’, tooltip: label };
localStorage.setItem(‘airdriftFlairColors’, JSON.stringify(st));
} catch(e) {}
}

// Run on load and check once per hour in case page stays open across a season boundary
syncDrifterSeasonTooltip();
setInterval(syncDrifterSeasonTooltip, 60 * 60 * 1000);

// One-time cleanup: remove any stale FlairColor entries with empty color values
// These could have been saved by earlier code versions and would strip CSS gradients
(function() {
try {
var fc = JSON.parse(localStorage.getItem(‘airdriftFlairColors’) || ‘{}’);
var dirty = false;
Object.keys(fc).forEach(function(k) {
if (!fc[k].color || fc[k].color.length === 0) { delete fc[k]; dirty = true; }
});
if (dirty) localStorage.setItem(‘airdriftFlairColors’, JSON.stringify(fc));
} catch(e) {}
try {
var fu = JSON.parse(localStorage.getItem(‘airdriftFlairColorByUser’) || ‘{}’);
var dirtyU = false;
Object.keys(fu).forEach(function(k) {
if (!fu[k].color || fu[k].color.length === 0) { delete fu[k]; dirtyU = true; }
});
if (dirtyU) localStorage.setItem(‘airdriftFlairColorByUser’, JSON.stringify(fu));
} catch(e) {}
})();

// ── FLAIRTEXT COMMAND ──────────────────────────────
// FlairText(flair, hover text) – sets tooltip only, never touches color or gradient
function adminFlairText(rawInput) {
var m = rawInput.match(/^([a-zA-Z]+),\s*(.*)$/);
if (!m) return ‘Usage: FlairText(flair, hover text)’;
var tier    = m[1].trim().toLowerCase();
var tooltip = m[2].trim();
if (!FLAIR_DISPLAY[tier]) return ‘Error: unknown flair tier “’ + tier + ‘”.’;
// Read existing override — preserve color, only update tooltip
var existing = FLAIR_COLOR_OVERRIDES[tier] || {};
FLAIR_COLOR_OVERRIDES[tier] = { color: existing.color || ‘’, tooltip: tooltip };
try {
var st = JSON.parse(localStorage.getItem(‘airdriftFlairColors’) || ‘{}’);
var stored = st[tier] || {};
st[tier] = { color: stored.color || ‘’, tooltip: tooltip };
localStorage.setItem(‘airdriftFlairColors’, JSON.stringify(st));
} catch(e) {}
renderComments();
return ‘Done. ’ + FLAIR_DISPLAY[tier].label + ’ hover text set to: “’ + tooltip + ‘”.’;
}

function adminFlairColor(rawInput) {
// FlairColor(flair, color, hovertext, user)
// color blank = keep current; hovertext ‘, )’ = erase; no 3rd arg = keep; 4th = force specific user
var parts = rawInput.split(’,’);
if (parts.length < 1) return ‘Usage: FlairColor(flair, #hex) or FlairColor(flair, #hex, hover, user)’;
var tier      = parts[0].trim().toLowerCase();
var colorRaw  = (parts[1] !== undefined) ? parts[1] : ‘’;
var tooltipRaw= (parts.length >= 3) ? parts.slice(2, parts.length > 4 ? parts.length - 1 : parts.length).join(’,’) : null;
var userRaw   = (parts.length >= 4) ? parts[parts.length - 1].trim() : ‘’;
if (!FLAIR_DISPLAY[tier]) return ‘Error: unknown flair tier “’ + tier + ‘”.’;
var color = colorRaw.trim();
// Resolve 4th arg as email or username
var targetEmail = null;
if (userRaw) {
targetEmail = resolveEmailAnyPage(userRaw);
if (!targetEmail) return ‘Error: user “’ + userRaw + ‘” not found.’;
}
// Load existing
var existing = targetEmail
? (FLAIR_COLOR_BY_USER[targetEmail] || FLAIR_COLOR_OVERRIDES[tier] || { color: ‘’, tooltip: ‘’ })
: (FLAIR_COLOR_OVERRIDES[tier] || { color: ‘’, tooltip: ‘’ });
var newColor = color.length > 0 ? color : (existing.color || ‘’);
var newTooltip;
if (tooltipRaw === null) {
newTooltip = existing.tooltip || ‘’;
} else {
newTooltip = tooltipRaw.trim();
}
if (!newColor) return ‘Error: no color. Provide a hex color or keep an existing one.’;
var result = { color: newColor, tooltip: newTooltip };
if (targetEmail) {
// Force-update a specific user’s stamp
FLAIR_COLOR_BY_USER[targetEmail] = result;
try {
var cu = JSON.parse(localStorage.getItem(‘airdriftFlairColorByUser’) || ‘{}’);
cu[targetEmail] = result;
localStorage.setItem(‘airdriftFlairColorByUser’, JSON.stringify(cu));
} catch(e) {}
} else {
// Update tier-wide default
FLAIR_COLOR_OVERRIDES[tier] = result;
try {
var st = JSON.parse(localStorage.getItem(‘airdriftFlairColors’) || ‘{}’);
st[tier] = result;
localStorage.setItem(‘airdriftFlairColors’, JSON.stringify(st));
} catch(e) {}
}
renderComments();
var who = targetEmail ? (usernameMap[targetEmail] || targetEmail) : FLAIR_DISPLAY[tier].label + ’ (all)’;
var msg = who + ’ color: ’ + newColor;
if (newTooltip) msg += ‘, hover: “’ + newTooltip + ‘”’;
else if (tooltipRaw !== null) msg += ‘, hover: cleared’;
return ’Done. ’ + msg + ‘.’;
}

// ── DM HEADER BUTTON ────────────────────────────────
function updateOpenDmBtn() {
var btn = document.getElementById(‘open-dm-btn’);
if (!btn || !currentUser) { if (btn) btn.style.display = ‘none’; return; }
// Show button if there’s an active DM thread for this user that isn’t closed
// Scan localStorage for any DM thread involving this user
var found = null;
Object.keys(localStorage).forEach(function(k) {
if (found || k.indexOf(‘airdriftDM:’) !== 0 || k.endsWith(’:closed’)) return;
if (k.indexOf(currentUser.email) !== -1) {
var msgs = [];
try { msgs = JSON.parse(localStorage.getItem(k) || ‘[]’); } catch(e) {}
if (msgs.length > 0 && !getDmClosed(k)) found = k;
}
});
if (found) {
btn.style.display = ‘inline-block’;
btn.setAttribute(‘data-thread’, found);
} else {
btn.style.display = ‘none’;
}
}

function reopenDmWindow() {
var btn = document.getElementById(‘open-dm-btn’);
var threadKey = btn ? btn.getAttribute(‘data-thread’) : null;
if (!threadKey) return;
// Reconstruct who’s in this thread from the key
// Key format: airdriftDM:emailA:emailB (sorted)
var parts = threadKey.replace(‘airdriftDM:’, ‘’).split(’:’);
if (parts.length < 2) return;
// Reassemble emails (may contain colons if using gmail format – but we split on all colons)
// Simple approach: one of the two emails is currentUser.email
var emailA = parts[0], emailB = parts.slice(1).join(’:’);
var otherEmail = (emailA === currentUser.email) ? emailB : emailA;
var otherName  = usernameMap[otherEmail] || otherEmail;
var amMod = isMod(currentUser.email);
activeDmEmail  = amMod ? otherEmail : currentUser.email;
activeDmMod    = amMod ? currentUser.email : otherEmail;
activeDmThread = threadKey;
var win = document.getElementById(‘dm-window’);
if (!win) return;
var titleEl  = document.getElementById(‘dm-title’);
var subEl    = document.getElementById(‘dm-subtitle’);
var changeBtn= document.getElementById(‘dm-change-username-btn’);
var endBtn   = document.getElementById(‘dm-end-btn’);
if (titleEl)  titleEl.textContent  = otherName;
if (subEl)    subEl.textContent    = amMod ? ‘mod chat’ : ‘private’;
if (changeBtn) changeBtn.style.display = amMod ? ‘inline-block’ : ‘none’;
if (endBtn)    endBtn.style.display    = amMod ? ‘inline-block’ : ‘none’;
win.style.display = ‘flex’;
renderDmMessages();
var inp = document.getElementById(‘dm-input’);
if (inp) setTimeout(function() { inp.focus(); }, 50);
}

// ── TOP-LEVEL NOTIFICATION TOGGLE ─────────────────
function toggleTopLevelNotifs(checkbox) {
localStorage.setItem(‘airdriftSuppressTopLevelNotif’, checkbox.checked ? ‘0’ : ‘1’);
}

// Set toggle state when dashboard opens
var _origOpenDashboard = openDashboard;
openDashboard = function() {
_origOpenDashboard();
var tog = document.getElementById(‘dash-toplevel-notif-toggle’);
if (tog) tog.checked = localStorage.getItem(‘airdriftSuppressTopLevelNotif’) !== ‘1’;
updateSpotlight();
buildChecklist();
};

// ── UPGRADE MODAL ───────────────────────────────────
function showUpgradeModal(tierMsg) {
var body = tierMsg + ‘<br><br>’ +
‘<a href="https://www.patreon.com/cw/AirdriftSignals" target="_blank" style="display:inline-block;margin-top:4px;background:linear-gradient(135deg,#FF6B35,#b89f37);color:white;padding:7px 20px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;">Join on Patreon ↗</a>’;
showAnnouncement(‘Upgrade Required’, body, ‘⬆️’);
}

function showSignInModal(msg) {
showAnnouncement(‘Sign In Required’, msg || ‘Please sign in to continue.’, ‘🔑’);
}

// ── HIGHLIGHT SYSTEM ─────────────────────────────────

var HIGHLIGHT_KEY = ‘airdriftHighlights’; // { commentId: true }

function loadHighlights() {
try {
var h = JSON.parse(localStorage.getItem(HIGHLIGHT_KEY) || ‘{}’);
Object.keys(localStorage).forEach(function(key) {
if (key.indexOf(‘airdriftComments:’) !== 0) return;
try {
var items = JSON.parse(localStorage.getItem(key)) || [];
items.forEach(function(c) {
if (h[c.id]) c.highlighted = true;
});
} catch(e) {}
});
} catch(e) {}
}

function saveHighlights() {
var h = {};
Object.keys(localStorage).forEach(function(key) {
if (key.indexOf(‘airdriftComments:’) !== 0) return;
try {
var items = JSON.parse(localStorage.getItem(key)) || [];
items.forEach(function(c) {
if (c.highlighted) h[c.id] = true;
(c.replies || []).forEach(function(r) { if (r.highlighted) h[r.id] = true; });
});
} catch(e) {}
});
localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(h));
// GAS HOOKUP: sync highlights server-side:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveHighlights’, highlights: h }) }).catch(function(){});
}

function toggleHighlight(btn) {
if (!currentUser || currentUser.email !== MODERATOR_EMAIL) return;
var commentId = btn.getAttribute(‘data-id’);
var comment   = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
comment.highlighted = !comment.highlighted;
saveComments();
saveHighlights();
renderComments();
var panel = document.getElementById(‘leaderboard-panel’);
if (panel && panel.classList.contains(‘open’)) renderLeaderboard();
}

function toggleHighlightReply(btn) {
if (!currentUser || currentUser.email !== MODERATOR_EMAIL) return;
var replyId   = btn.getAttribute(‘data-id’);
var commentId = btn.getAttribute(‘data-comment-id’);
var comment   = allComments.find(function(c) { return c.id === commentId; });
if (!comment) return;
var reply = (comment.replies || []).find(function(r) { return r.id === replyId; });
if (!reply) return;
reply.highlighted = !reply.highlighted;
saveComments();
saveHighlights();
renderComments();
var panel = document.getElementById(‘leaderboard-panel’);
if (panel && panel.classList.contains(‘open’)) renderLeaderboard();
}

// ── LEADERBOARD SCORING ──────────────────────────────

var QUALIFYING_TIERS = [‘supporter’,‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];
var lbPeriod = ‘all’;

function getScoreCutoff(period) {
if (period === ‘all’) return 0;
var now = Date.now();
if (period === ‘year’)  return now - 365 * 24 * 60 * 60 * 1000;
if (period === ‘month’) return now - 30  * 24 * 60 * 60 * 1000;
return 0;
}

function computeLeaderboard(period) {
var cutoff   = getScoreCutoff(period);
var scores   = {}; // email -> { votes, replies, highlights, name, flair }
var highlights = {};

```
// Gather all comments from all pages
Object.keys(localStorage).forEach(function(key) {
  if (key.indexOf('airdriftComments:') !== 0) return;
  try {
    var items = JSON.parse(localStorage.getItem(key)) || [];
    items.forEach(function(c) {
      if (c.deleted || c.shadowSession) return;
      // Track highlights
      if (c.highlighted) highlights[c.id] = c.email;
    });
    items.forEach(function(c) {
      if (c.deleted || c.shadowSession) return;
      var email = c.email;
      // Skip author (MODERATOR_EMAIL)
      if (email === MODERATOR_EMAIL) return;
      // Must have qualifying flair
      var tier = flairData[email] || flairPageData[email];
      if (!tier || QUALIFYING_TIERS.indexOf(tier) === -1) return;
      if (!scores[email]) scores[email] = { votes:0, replies:0, highlights:0, name: c.name || email, flair: tier };
      var t = new Date(c.time).getTime();
      if (t >= cutoff) {
        scores[email].votes += ((c.upvotes||0) - (c.downvotes||0));
        // +5 per highlight
        if (c.highlighted) scores[email].highlights += 5;
      }
      // Count replies this comment received (each reply from someone else = +1)
      (c.replies || []).forEach(function(r) {
        if (r.deleted) return;
        var rt = new Date(r.time).getTime();
        if (rt >= cutoff && r.email !== email) {
          scores[email].replies += 1;
        }
      });
      // Also track reply authors
      (c.replies || []).forEach(function(r) {
        if (r.deleted || r.shadowSession || r.email === MODERATOR_EMAIL) return;
        var remail = r.email;
        var rtier  = flairData[remail] || flairPageData[remail];
        if (!rtier || QUALIFYING_TIERS.indexOf(rtier) === -1) return;
        if (!scores[remail]) scores[remail] = { votes:0, replies:0, highlights:0, name: r.name || remail, flair: rtier };
        var rt = new Date(r.time).getTime();
        if (rt >= cutoff) {
          scores[remail].votes += ((r.upvotes||0) - (r.downvotes||0));
          if (r.highlighted) scores[remail].highlights += 5;
        }
        // Also score +5 if someone else's reply to THIS comment is highlighted
        // (the parent comment author gets credit for inspiring the highlighted reply)
        // No -- replies' highlights go to the REPLY AUTHOR only (already handled above)
      });
    });
  } catch(e) {}
});

// Apply AdjustRating offsets
Object.keys(scores).forEach(function(email) {
  var adj = 0;
  try { adj = parseInt(localStorage.getItem('airdriftRatingAdj:' + email) || '0') || 0; } catch(e) {}
  scores[email].votes += adj;
});

// Build sorted array
return Object.keys(scores).map(function(email) {
  var s = scores[email];
  var total = s.votes + s.replies + s.highlights;
  return { email: email, name: s.name, flair: s.flair, votes: s.votes, replies: s.replies, highlights: s.highlights, total: total };
}).filter(function(u) { return u.total > 0 || u.votes !== 0; })
  .sort(function(a, b) { return b.total - a.total; });
```

}

// ── LEADERBOARD UI ───────────────────────────────────

function openLeaderboard() {
var panel = document.getElementById(‘leaderboard-panel’);
if (!panel) return;
panel.classList.add(‘open’);
renderLeaderboard();
}

function closeLeaderboard() {
var panel = document.getElementById(‘leaderboard-panel’);
if (panel) panel.classList.remove(‘open’);
}

function lbSetPeriod(btn) {
document.querySelectorAll(’.lb-filter-btn’).forEach(function(b) { b.classList.remove(‘active’); });
btn.classList.add(‘active’);
lbPeriod = btn.getAttribute(‘data-period’);
renderLeaderboard();
}

function renderLeaderboard() {
var list = document.getElementById(‘leaderboard-list’);
if (!list) return;
var entries = computeLeaderboard(lbPeriod);
if (entries.length === 0) {
list.innerHTML = ‘<div style="color:#444;text-align:center;padding:30px;font-size:12px;">No qualifying members yet.</div>’;
return;
}
list.innerHTML = entries.slice(0, 50).map(function(u, i) {
var rank     = i + 1;
var rankCls  = rank === 1 ? ‘top1’ : rank === 2 ? ‘top2’ : rank === 3 ? ‘top3’ : ‘’;
var rankLabel= rank === 1 ? ‘🥇’ : rank === 2 ? ‘🥈’ : rank === 3 ? ‘🥉’ : rank;
var f        = FLAIR_DISPLAY[u.flair];
var flairHtml= f ? ‘<span style="font-size:11px;">’ + f.symbol + ‘</span>’ : ‘’;
var detail   = [];
if (u.votes)      detail.push(u.votes + ’ pts’);
if (u.replies)    detail.push(’+’ + u.replies + ’ replies’);
if (u.highlights) detail.push(’+’ + u.highlights + ’ highlight’ + (u.highlights > 5 ? ‘s’ : ‘’));
var safeEmail = u.email.replace(/’/g,’'’);
var safeName  = escapeHTML(u.name).replace(/’/g,’'’);
return ‘<div class="lb-entry">’ +
‘<div class="lb-rank ' + rankCls + '">’ + rankLabel + ‘</div>’ +
‘<div class="lb-flair">’ + flairHtml + ‘</div>’ +
‘<div class="lb-name user-link" style="cursor:pointer;" data-email="' + safeEmail + '" data-name="' + safeName + '">’ + escapeHTML(u.name) + ‘</div>’ +
‘<div class="lb-score">’ +
‘<div>’ + u.total + ‘</div>’ +
‘<div class="lb-score-detail">’ + detail.join(’ · ‘) + ‘</div>’ +
‘</div>’ +
‘</div>’;
}).join(’’);
}

// Close leaderboard on outside click
document.addEventListener(‘click’, function(e) {
var panel = document.getElementById(‘leaderboard-panel’);
if (!panel || !panel.classList.contains(‘open’)) return;
if (!panel.contains(e.target) && !e.target.closest(’[onclick=“openLeaderboard()”]’)) {
closeLeaderboard();
}
});

// Load highlights on init (apply to allComments)
(function() {
try {
var h = JSON.parse(localStorage.getItem(HIGHLIGHT_KEY) || ‘{}’);
if (Object.keys(h).length > 0) {
// Will be applied when loadComments runs
window._pendingHighlights = h;
}
} catch(e) {}
})();

// ── ZENITH BADGE SELECTOR ───────────────────────────
function pcSetTenureBadge(select) {
if (!currentUser) return;
var val = select.value;
try {
if (val === ‘’) {
localStorage.removeItem(‘airdriftTenureChoice:’ + currentUser.email);
} else {
localStorage.setItem(‘airdriftTenureChoice:’ + currentUser.email, val);
}
} catch(e) {}
renderComments();
// Refresh flair in profile card header without closing it
var pcFlair = document.querySelector(’#profile-card .pc-flair’);
if (pcFlair) pcFlair.innerHTML = getUserFlair(currentUser.email);
}

// ── DASHBOARD CHAT REOPEN ───────────────────────────
function dashReopenChat(otherEmail, otherName) {
if (!currentUser) return;
// Reconstruct thread key
var threadKey = getDmKey(otherEmail, MODERATOR_EMAIL);
activeDmEmail  = otherEmail;
activeDmMod    = MODERATOR_EMAIL;
activeDmThread = threadKey;
var win = document.getElementById(‘dm-window’);
if (!win) return;
var titleEl   = document.getElementById(‘dm-title’);
var subEl     = document.getElementById(‘dm-subtitle’);
var changeBtn = document.getElementById(‘dm-change-username-btn’);
var endBtn    = document.getElementById(‘dm-end-btn’);
if (titleEl)  titleEl.textContent  = usernameMap[otherEmail] || otherName;
if (subEl)    subEl.textContent    = ‘mod chat’;
if (changeBtn) changeBtn.style.display = ‘inline-block’;
if (endBtn)    endBtn.style.display    = ‘inline-block’;
win.style.display = ‘flex’;
renderDmMessages();
// Close dashboard so chat window is visible
dismissModDashboard();
var inp = document.getElementById(‘dm-input’);
if (inp) setTimeout(function() { inp.focus(); }, 100);
}

// ── TIER HELPER ──────────────────────────────────────
function getUserTier(email) {
return flairPageData[email] || flairData[email] || null;
}

// ── COMMENT FORMATTING ───────────────────────────────
// Subscriber+ can use: **bold**, *italic*, >quote, `code`
function renderFormatted(text, email) {
var tier = getUserTier(email);
if (email !== MODERATOR_EMAIL && (!tier || FORMATTING_TIERS.indexOf(tier) === -1)) return escapeHTML(text);
// Escape first then apply markdown patterns on safe text
var safe = escapeHTML(text);
safe = safe.replace(/**(.+?)**/g, ‘<strong>$1</strong>’);
safe = safe.replace(/*([^*]+)_/g, ‘<em>$1</em>’);
safe = safe.replace(/`([^`]+)`/g, ‘<span class="fmt-code">$1</span>’);
// Blockquote: lines starting with >
safe = safe.replace(/(^|\n)>([^\n]+)/g, ‘$1<span class="fmt-quote">$2</span>’);
return safe;
}

// Bio formatting — always applied regardless of tier
function renderBioFormatted(text) {
var safe = escapeHTML(text);
safe = safe.replace(/**(.+?)**/g, ‘<strong>$1</strong>’);
safe = safe.replace(/*([^*]+)_/g, ‘<em>$1</em>’);
safe = safe.replace(/`([^`]+)`/g, ‘<span class="fmt-code">$1</span>’);
safe = safe.replace(/(^|\n)>([^\n]+)/g, ‘$1<span class="fmt-quote">$2</span>’);
return safe;
}

// ── USERNAME COLOR ───────────────────────────────────
function getUsernameColorStyle(email) {
// GAS HOOKUP: pre-fetch all username colors on loadComments() into usernameColorCache = {},
// then read usernameColorCache[email] here instead of localStorage.
// if (GAS_URL) stored = usernameColorCache[email] || null;
var stored = null;
try { stored = localStorage.getItem(‘airdriftUsernameColor:’ + email); } catch(e) {}
if (!stored) return ‘’;
var tier = getUserTier(email);
if (!tier) return ‘’;
// Verify their tier still qualifies
var allColors = COLOR_BASIC_TIERS.indexOf(tier) !== -1
? USERNAME_COLORS_BASIC.concat(COLOR_PREMIUM_TIERS.indexOf(tier) !== -1 ? USERNAME_COLORS_PREMIUM : [])
: [];
var valid = allColors.some(function(c) { return c.value === stored; });
if (!valid) return ‘’;
return ’ style=“color:’ + stored + ’ !important;”’;
}

// ── BIO ──────────────────────────────────────────────
function getUserBio(email) {
// GAS HOOKUP: like getReactions, this is called synchronously.
// Pre-fetch all bios on loadComments() into a bioCache = {} object, read from that here.
// if (GAS_URL) return bioCache[email] || ‘’;
try { return localStorage.getItem(‘airdriftBio:’ + email) || ‘’; } catch(e) { return ‘’; }
}

function pcSetHoverText(sel) {
if (!currentUser) return;
var text = sel.value;
// Update the user’s flair color-by-user entry — preserve color, update tooltip
var existing = FLAIR_COLOR_BY_USER[currentUser.email] || {};
var updated = { color: existing.color || ‘’, tooltip: text };
FLAIR_COLOR_BY_USER[currentUser.email] = updated;
try {
var cu = JSON.parse(localStorage.getItem(‘airdriftFlairColorByUser’) || ‘{}’);
cu[currentUser.email] = updated;
localStorage.setItem(‘airdriftFlairColorByUser’, JSON.stringify(cu));
} catch(e) {}
renderComments();
}

function pcBioCounter(ta) {
var el = document.getElementById(‘pc-bio-chars’);
if (el) el.textContent = ta.value.length + ‘/160’;
}

function pcSaveBio() {
var ta = document.getElementById(‘pc-bio-input’);
if (!ta) return;
saveUserBio(ta.value);
}

function saveUserBio(text) {
if (!currentUser) return;
var clean = (text || ‘’).trim().substring(0, 160);
// Run through spam filter
if (clean && checkContentFilter(clean)) {
showAnnouncement(‘Bio Not Saved’, ‘Your bio contains content that violates our community guidelines.’, ‘⚠️’);
return;
}
try { localStorage.setItem(‘airdriftBio:’ + currentUser.email, clean); } catch(e) {}
// GAS HOOKUP: persist bio server-side so it shows on any device:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveBio’, email: currentUser.email, bio: clean }) }).catch(function(){});
// Update bio in profile card immediately
var bioEl = document.getElementById(‘pc-bio-display’);
if (bioEl) {
if (clean) { bioEl.innerHTML = renderBioFormatted(clean); bioEl.style.display = ‘’; }
else { bioEl.innerHTML = ‘’; bioEl.style.display = ‘none’; }
} else if (clean) {
// Bio display doesn’t exist yet (was empty before) – inject it
// Find where to insert: after rank label or after pc-name
var insertAfter = document.querySelector(’#profile-card .pc-rank-label’) ||
document.querySelector(’#profile-card .pc-name’);
if (insertAfter) {
var newBio = document.createElement(‘div’);
newBio.className = ‘pc-bio’;
newBio.id = ‘pc-bio-display’;
newBio.textContent = clean;
insertAfter.parentNode.insertBefore(newBio, insertAfter.nextSibling);
}
}
var chars = document.getElementById(‘pc-bio-chars’);
if (chars) { var prev = chars.textContent; chars.textContent = ‘Saved!’; chars.style.color = ‘#b89f37’; setTimeout(function(){ chars.textContent = prev; chars.style.color = ‘#555’; }, 1500); }
}

// ── REACTIONS ────────────────────────────────────────
function getReactions(itemId) {
// GAS HOOKUP: fetch reactions server-side so all devices see the same counts:
// Note – getReactions is called synchronously during render so GAS fetch must
// be async. When GAS is live, pre-fetch all reactions on loadComments() and
// cache them in a local reactionCache = {} object, then read from that here.
// if (GAS_URL) return reactionCache[itemId] || {};
try { return JSON.parse(localStorage.getItem(‘airdriftReactions:’ + itemId) || ‘{}’); } catch(e) { return {}; }
}

function saveReactions(itemId, data) {
try { localStorage.setItem(‘airdriftReactions:’ + itemId, JSON.stringify(data)); } catch(e) {}
// GAS HOOKUP: POST reactions to server:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveReactions’, itemId: itemId, reactions: data }) }).catch(function(){});
}

function renderReactionsBar(itemId) {
var data    = getReactions(itemId);
var myEmail = currentUser ? currentUser.email : null;
var tier    = myEmail ? getUserTier(myEmail) : null;
var canReact= myEmail && (myEmail === MODERATOR_EMAIL || (tier && REACTION_TIERS.indexOf(tier) !== -1));
var pills   = ‘’;
REACTIONS_AVAILABLE.forEach(function(emoji) {
var users = data[emoji] || [];
if (users.length === 0) return;
var reacted = myEmail && users.indexOf(myEmail) !== -1;
pills += ‘<button class=“reaction-btn’ + (reacted ? ’ reacted’ : ‘’) + ‘”’ +
’ onclick=“toggleReaction('’ + itemId + ‘','’ + emoji + ‘')”’ +
(canReact ? ‘’ : ’ disabled style=“cursor:default;”’) + ‘>’ +
emoji + ’ <span class="reaction-count">’ + users.length + ‘</span>’ +
‘</button>’;
});
var addBtn = canReact
? ‘<button class="reaction-add-btn" onclick="showReactionPicker(this,\'' + itemId + '\')" title="React">+</button>’
: ‘’;
if (!pills && !addBtn) return ‘’;
return ‘<span class="reactions-inline" data-item-id="' + itemId + '">’ + pills + addBtn + ‘</span>’;
}

function toggleReaction(itemId, emoji) {
if (!currentUser) { showSignInModal(‘Sign in to react to comments.’); return; }
var tier = getUserTier(currentUser.email);
if (!tier || REACTION_TIERS.indexOf(tier) === -1) {
showUpgradeModal(‘Reactions require a Supporter flair or above.’);
return;
}
var data  = getReactions(itemId);
var users = data[emoji] || [];
var idx   = users.indexOf(currentUser.email);
if (idx !== -1) { users.splice(idx, 1); }
else            { users.push(currentUser.email); }
if (users.length === 0) delete data[emoji];
else data[emoji] = users;
saveReactions(itemId, data);
// Re-render just the reactions inline span
document.querySelectorAll(’.reactions-inline[data-item-id=”’ + itemId + ‘”]’).forEach(function(el) {
el.outerHTML = renderReactionsBar(itemId);
});
// Pulse the toggled emoji button
setTimeout(function() {
document.querySelectorAll(’.reactions-inline[data-item-id=”’ + itemId + ‘”] .reaction-btn’).forEach(function(btn) {
if (btn.textContent.indexOf(emoji) !== -1) {
btn.classList.add(‘pulsing’);
setTimeout(function() { btn.classList.remove(‘pulsing’); }, 600);
}
});
}, 10);
}

function showReactionPicker(btn, itemId) {
// Remove any existing picker
var existing = document.getElementById(‘reaction-picker’);
if (existing) { existing.remove(); if (existing._itemId === itemId) return; }
var picker = document.createElement(‘div’);
picker.className = ‘reaction-picker’;
picker.id = ‘reaction-picker’;
picker._itemId = itemId;
REACTIONS_AVAILABLE.forEach(function(emoji) {
var b = document.createElement(‘button’);
b.className = ‘reaction-picker-btn’;
b.textContent = emoji;
b.onclick = function() { picker.remove(); toggleReaction(itemId, emoji); };
picker.appendChild(b);
});
document.body.appendChild(picker);
var rect = btn.getBoundingClientRect();
picker.style.position = ‘fixed’;
var pickerW = picker.offsetWidth || 240;
var leftPos = Math.min(rect.left, window.innerWidth - pickerW - 8);
var topPos  = rect.top - picker.offsetHeight - 6;
if (topPos < 4) topPos = rect.bottom + 6;
picker.style.top  = Math.max(4, topPos) + ‘px’;
picker.style.left = Math.max(4, leftPos) + ‘px’;
setTimeout(function() {
document.addEventListener(‘click’, function handler(e) {
if (!picker.contains(e.target) && e.target !== btn) { picker.remove(); document.removeEventListener(‘click’, handler); }
});
}, 10);
}

// ── STREAK SYSTEM ────────────────────────────────────
// Streak = commented at least once per week for 4+ consecutive weeks
var STREAK_KEY = ‘airdriftStreak:’;

function updateStreak(email) {
if (!email) return;
var now   = Date.now();
var week  = Math.floor(now / (7 * 24 * 60 * 60 * 1000));
var stored = {};
try { stored = JSON.parse(localStorage.getItem(STREAK_KEY + email) || ‘{}’); } catch(e) {}
if (stored.lastWeek === week) return; // already recorded this week
var streak = (stored.lastWeek === week - 1) ? (stored.count || 1) + 1 : 1;
stored = { lastWeek: week, count: streak };
try { localStorage.setItem(STREAK_KEY + email, JSON.stringify(stored)); } catch(e) {}
// GAS HOOKUP: persist streak server-side so it survives device/browser changes:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveStreak’, email: email, week: week, count: streak }) }).catch(function(){});
}

function getStreak(email) {
// GAS HOOKUP: pre-fetch all streaks on loadComments() into streakCache = {},
// then return streakCache[email] || 0 here.
// if (GAS_URL) return streakCache[email] || 0;
try {
var stored = JSON.parse(localStorage.getItem(STREAK_KEY + email) || ‘{}’);
var week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
// Streak valid if last activity was this week or last week
if (stored.lastWeek < week - 1) return 0;
return stored.count || 0;
} catch(e) { return 0; }
}

// ── SPOTLIGHT SYSTEM ─────────────────────────────────
// Top leaderboard user each calendar month gets Spotlight badge
var SPOTLIGHT_KEY = ‘airdriftSpotlight’;

function updateSpotlight() {
// Pre-GAS: runs on dashboard open, sets winner from local data.
// GAS HOOKUP: replace this entire function with a GAS fetch.
// GAS runs a time-based trigger on the 1st of each month at midnight,
// computes the winner server-side, and stores it. This function then
// just reads the authoritative result:
//
// if (GAS_URL) {
//   fetch(GAS_URL + ‘?action=getSpotlight’)
//     .then(function(r) { return r.json(); })
//     .then(function(d) {
//       if (d.email) localStorage.setItem(SPOTLIGHT_KEY, JSON.stringify(d));
//     }).catch(function() {});
//   return;
// }
//
// GAS Apps Script side (runs on 1st of month trigger):
// function awardMonthlySpotlight() {
//   var winner = computeTopScorer30Days(); // reads from Sheets
//   SpreadsheetApp.getActive().getSheetByName(‘Spotlight’)
//     .getRange(‘A1’).setValue(JSON.stringify(winner));
// }
if (!currentUser || currentUser.email !== MODERATOR_EMAIL) return;
var now   = new Date();
var month = now.getFullYear() + ‘-’ + (now.getMonth() + 1);
var stored = {};
try { stored = JSON.parse(localStorage.getItem(SPOTLIGHT_KEY) || ‘{}’); } catch(e) {}
if (stored.month === month) return; // already set this month
var entries = computeLeaderboard(‘month’);
if (entries.length === 0) return;
stored = { month: month, email: entries[0].email, name: entries[0].name };
try { localStorage.setItem(SPOTLIGHT_KEY, JSON.stringify(stored)); } catch(e) {}
}

function getSpotlight() {
// GAS HOOKUP: read winner from server instead of localStorage.
// With GAS, all devices see the same authoritative winner set on the 1st.
try {
var stored = JSON.parse(localStorage.getItem(SPOTLIGHT_KEY) || ‘{}’);
var now = new Date();
var month = now.getFullYear() + ‘-’ + (now.getMonth() + 1);
return stored.month === month ? stored : null;
} catch(e) { return null; }
}

// Bio formatting — always applied regardless of tier

// ── USERNAME COLOR ───────────────────────────────────
function pcSetUsernameColor(color) {
if (!currentUser) return;
var tier = getUserTier(currentUser.email);
if (!tier || COLOR_BASIC_TIERS.indexOf(tier) === -1) {
showUpgradeModal(‘Username color requires Subscriber flair or above.’);
return;
}
// Validate color is in allowed palette
var allowed = USERNAME_COLORS_BASIC.concat(COLOR_PREMIUM_TIERS.indexOf(tier) !== -1 ? USERNAME_COLORS_PREMIUM : []);
var valid = allowed.some(function(c) { return c.value === color; });
if (!valid && color !== ‘’) return;
try {
if (color === ‘’) localStorage.removeItem(‘airdriftUsernameColor:’ + currentUser.email);
else localStorage.setItem(‘airdriftUsernameColor:’ + currentUser.email, color);
} catch(e) {}
// GAS HOOKUP: persist username color so it shows on all devices:
// if (GAS_URL) fetch(GAS_URL, { method:‘POST’, headers:{‘Content-Type’:‘application/json’},
//   body: JSON.stringify({ action:‘saveUsernameColor’, email: currentUser.email, color: color }) }).catch(function(){});
renderComments();
// Update swatch selection borders in place – no card close/reopen
document.querySelectorAll(’#profile-card .color-swatch’).forEach(function(btn) {
var isSelected = btn.getAttribute(‘data-color’) === color;
btn.style.border = ‘2px solid ’ + (isSelected ? ‘#fff’ : ‘transparent’);
});
// Update profile card name color live
var pcNameSpan = document.querySelector(’#profile-card .pc-name span’);
if (pcNameSpan) {
if (color) {
pcNameSpan.style.color = color;
pcNameSpan.style.webkitTextFillColor = color;
} else {
pcNameSpan.style.color = ‘’;
pcNameSpan.style.webkitTextFillColor = ‘’;
}
}
}

// ── POST BODY SHOUTOUT MENTIONS ─────────────────────
// Scans the Blogger post body for @[Username] patterns and replaces them
// with clickable highlighted spans that open the user’s profile card.
// The @ symbol is stripped – only the name shows in the final render.
// Usage in your post HTML: @[Stefan] or @[Username Here]
function scanPostBodyMentions() {
// Blogger post body selectors – tries common theme class names
var selectors = [’.post-body’, ‘.entry-content’, ‘.post-content’, ‘[itemprop=“articleBody”]’];
var postBody  = null;
for (var i = 0; i < selectors.length; i++) {
postBody = document.querySelector(selectors[i]);
if (postBody) break;
}
if (!postBody) return;

```
// Walk text nodes only -- don't touch existing HTML elements
var walker = document.createTreeWalker(postBody, NodeFilter.SHOW_TEXT, null, false);
var nodes  = [];
var node;
while ((node = walker.nextNode())) { nodes.push(node); }

nodes.forEach(function(textNode) {
  var text = textNode.nodeValue;
  if (text.indexOf('@[') === -1) return; // skip if no pattern

  var frag = document.createDocumentFragment();
  var remaining = text;
  var match;
  var re = /@\[([^\]]+)\]/g;

  var lastIndex = 0;
  re.lastIndex = 0;
  while ((match = re.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    var username = match[1];
    // Look up email from usernameMap
    var email = null;
    Object.keys(usernameMap).forEach(function(k) {
      if (!k.endsWith('_seen') && usernameMap[k].toLowerCase() === username.toLowerCase()) email = k;
    });
    // Also check MODERATOR_EMAIL directly
    if (!email) {
      var modName = usernameMap[MODERATOR_EMAIL] || 'Stefan';
      if (modName.toLowerCase() === username.toLowerCase()) email = MODERATOR_EMAIL;
    }
    var span = document.createElement('span');
    if (email) {
      // Clickable -- opens profile card
      span.className = 'mention user-link';
      span.style.cursor = 'pointer';
      span.dataset.email = email;
      span.dataset.name  = username;
      span.textContent   = username; // no @ symbol
      // Send a shoutout notification to this user (once per page load per user)
      sendShoutoutNotification(email, username);
    } else {
      // Name not found -- still styled but not clickable
      span.className   = 'mention';
      span.textContent = username;
    }
    frag.appendChild(span);
    lastIndex = match.index + match[0].length;
  }
  // Remaining text after last match
  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  textNode.parentNode.replaceChild(frag, textNode);
});
```

}

// ── SIGN-IN BANNER ──────────────────────────────────
// Shows once per session for signed-out visitors.
// Dismissed state stored in sessionStorage so it stays gone for the session.
function showSignInBanner() {
if (currentUser) return; // already signed in
if (sessionStorage.getItem(‘airdriftBannerDismissed’)) return; // dismissed this session
var banner = document.getElementById(‘signin-banner’);
if (!banner) return;
// Small delay so it doesn’t clash with page load
setTimeout(function() {
banner.classList.add(‘visible’);
document.body.classList.add(‘signin-banner-open’);
}, 800);
}

function dismissSignInBanner() {
var banner = document.getElementById(‘signin-banner’);
if (!banner) return;
banner.classList.remove(‘visible’);
document.body.classList.remove(‘signin-banner-open’);
sessionStorage.setItem(‘airdriftBannerDismissed’, ‘1’);
}

// Hide banner on sign-in
var _origUpdateUI = updateUI;
updateUI = function() {
_origUpdateUI();
if (currentUser) {
var banner = document.getElementById(‘signin-banner’);
if (banner) {
banner.classList.remove(‘visible’);
document.body.classList.remove(‘signin-banner-open’);
}
}
};

// ── FLAIR GRADIENT CSS ───────────────────────────────
// Injected via JS so Blogger cannot strip background-clip/text-fill-color properties
(function() {
var css = [
‘.flair-subscriber .flair-symbol,.flair-subscriber .flair-text{background:linear-gradient(135deg,#2d7a4a,#5dbf80,#1a5c35,#7dcf9a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}’,
‘.flair-member .flair-symbol,.flair-member .flair-text{background:linear-gradient(135deg,#b8922a,#e8d080,#c9a84c,#f0e090,#b8922a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}’,
‘.flair-collector .flair-symbol,.flair-collector .flair-text{background:linear-gradient(135deg,#3d1060,#7a28b8,#9040c8,#c070e8,#3d1060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}’,
‘.flair-artist .flair-symbol,.flair-artist .flair-text{background:linear-gradient(135deg,#c83010,#ff8050,#f04030,#ffa060,#c83010);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}’,
‘.flair-writer .flair-symbol,.flair-writer .flair-text{background:linear-gradient(120deg,#20B2AA,#7fffd4,#40e0d0,#00ced1,#20B2AA,#48d1cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}’,
// Tenure shimmer
‘.flair-tenure .tn{font-size:10px;font-weight:800;font-family:Georgia,serif;letter-spacing:0.04em;padding:1px 5px;border-radius:3px;display:inline-block;}’,
‘.tenure-silver .tn{background-image:linear-gradient(90deg,#6a8a9a 0%,#a0bcc8 10%,#d8ecf4 22%,#ffffff 30%,#c8dce8 38%,#8aaabb 50%,#c0d8e4 62%,#f0f8ff 72%,#ffffff 78%,#b0cad6 88%,#6a8a9a 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:tenureShimmer 7s linear infinite;}’,
‘.tenure-orange .tn{background-image:linear-gradient(90deg,#b85a20 0%,#FF6B35 20%,#f0c050 40%,#FF8C55 60%,#b89f37 80%,#b85a20 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:tenureShimmer 6s linear infinite;}’,

```
  '.tenure-purple .tn{background-image:linear-gradient(90deg,#1a0630 0%,#6a1a90 8%,#b07ad6 18%,#f0d0ff 26%,#c8a0e8 33%,#80c0e0 40%,#b0e0f8 46%,#d4a4e8 54%,#f8e0ff 60%,#e8c4f8 66%,#8840b8 76%,#60a0d0 82%,#c084e8 90%,#1a0630 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:tenureShimmer 8s linear infinite;filter:drop-shadow(0 0 3px rgba(180,100,230,0.45));}',
].join('');
var el = document.createElement('style');
el.id  = 'airdrift-flair-gradients';
el.textContent = css;
document.head.appendChild(el);
```

})();

// ── COMMAND PANEL ───────────────────────────────────
// ── HOVER TEXT PICKER OPTIONS ────────────────────────
var HOVER_OPTIONS_KEY = ‘airdriftHoverOptions’;
var HOVER_TIERS_KEY   = ‘airdriftHoverTiers’;
var HOVER_COUNT_KEY   = ‘airdriftHoverCount’;

// Which tiers can use the hover text picker (default: subscriber and up)
var HOVER_PICKER_TIERS = [‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];

// Max options per tier (default: 5)
var HOVER_MAX_COUNT = {};

// Predefined options per tier: { tier: [‘option1’, …] }
var HOVER_OPTIONS = {};

// Load saved hover data
(function() {
try {
var o = JSON.parse(localStorage.getItem(HOVER_OPTIONS_KEY) || ‘{}’);
Object.keys(o).forEach(function(k) { HOVER_OPTIONS[k] = o[k]; });
} catch(e) {}
try {
var t = JSON.parse(localStorage.getItem(HOVER_TIERS_KEY) || ‘[]’);
if (t.length) HOVER_PICKER_TIERS = t;
} catch(e) {}
try {
var c = JSON.parse(localStorage.getItem(HOVER_COUNT_KEY) || ‘{}’);
Object.keys(c).forEach(function(k) { HOVER_MAX_COUNT[k] = c[k]; });
} catch(e) {}
})();

function saveHoverOptions() {
try { localStorage.setItem(HOVER_OPTIONS_KEY, JSON.stringify(HOVER_OPTIONS)); } catch(e) {}
}

function adminHoverAdd(rawInput) {
var m = rawInput.match(/^([a-zA-Z]+),\s*(.+)$/);
if (!m) return ‘Usage: HoverAdd(flair, option text)’;
var tier   = m[1].trim().toLowerCase();
var option = m[2].trim();
if (!FLAIR_DISPLAY[tier]) return ‘Error: unknown flair tier “’ + tier + ‘”.’;
if (!HOVER_OPTIONS[tier]) HOVER_OPTIONS[tier] = [];
var max = HOVER_MAX_COUNT[tier] || 5;
if (HOVER_OPTIONS[tier].length >= max) return ’Error: max ’ + max + ’ options for ’ + tier + ‘. Use HoverCount to increase or HoverRemove to free a slot.’;
if (HOVER_OPTIONS[tier].indexOf(option) !== -1) return ’Error: that option already exists for ’ + tier + ‘.’;
HOVER_OPTIONS[tier].push(option);
saveHoverOptions();
return ‘Done. Added to ’ + FLAIR_DISPLAY[tier].label + ‘: “’ + option + ‘” (’ + HOVER_OPTIONS[tier].length + ‘/’ + max + ’ slots used).’;
}

function adminHoverRemove(rawInput) {
var m = rawInput.match(/^([a-zA-Z]+),\s*(.+)$/);
if (!m) return ‘Usage: HoverRemove(flair, option text)’;
var tier   = m[1].trim().toLowerCase();
var option = m[2].trim();
if (!FLAIR_DISPLAY[tier]) return ‘Error: unknown flair tier “’ + tier + ‘”.’;
if (!HOVER_OPTIONS[tier] || HOVER_OPTIONS[tier].length === 0) return ’Error: no options set for ’ + tier + ‘.’;
var idx = HOVER_OPTIONS[tier].indexOf(option);
if (idx === -1) return ‘Error: option “’ + option + ’” not found for ’ + tier + ‘.’;
HOVER_OPTIONS[tier].splice(idx, 1);
saveHoverOptions();
return ’Done. Removed from ’ + FLAIR_DISPLAY[tier].label + ‘: “’ + option + ‘”.’;
}

function adminHoverTiers(rawInput) {
// HoverTiers(subscriber, member, collector) – sets which tiers see the picker
var tiers = rawInput.split(’,’).map(function(s) { return s.trim().toLowerCase(); }).filter(Boolean);
var valid  = [‘newcomer’,‘supporter’,‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];
var bad    = tiers.filter(function(t) { return valid.indexOf(t) === -1; });
if (bad.length) return ‘Error: unknown tier(s): ’ + bad.join(’, ’);
HOVER_PICKER_TIERS = tiers;
try { localStorage.setItem(HOVER_TIERS_KEY, JSON.stringify(tiers)); } catch(e) {}
return ‘Done. Hover text picker available to: ’ + tiers.join(’, ’) + ‘.’;
}

function adminHoverCount(rawInput) {
// HoverCount(flair, n) – sets max options for a tier
var m = rawInput.match(/^([a-zA-Z]+),\s*(\d+)$/);
if (!m) return ‘Usage: HoverCount(flair, number)’;
var tier = m[1].trim().toLowerCase();
var n    = parseInt(m[2]);
if (!FLAIR_DISPLAY[tier]) return ‘Error: unknown flair tier “’ + tier + ‘”.’;
if (n < 1 || n > 20) return ‘Error: count must be between 1 and 20.’;
HOVER_MAX_COUNT[tier] = n;
try {
var c = JSON.parse(localStorage.getItem(HOVER_COUNT_KEY) || ‘{}’);
c[tier] = n; localStorage.setItem(HOVER_COUNT_KEY, JSON.stringify(c));
} catch(e) {}
return ’Done. ’ + FLAIR_DISPLAY[tier].label + ’ max hover options set to ’ + n + ‘.’;
}

function adminHoverList(rawInput) {
// HoverList(flair) – shows current options for a tier
var tier = rawInput.trim().toLowerCase();
if (!FLAIR_DISPLAY[tier]) return ‘Error: unknown flair tier “’ + tier + ‘”.’;
var opts = HOVER_OPTIONS[tier] || [];
var max  = HOVER_MAX_COUNT[tier] || 5;
if (opts.length === 0) return FLAIR_DISPLAY[tier].label + ’ has no hover options set.’;
return FLAIR_DISPLAY[tier].label + ’ (’ + opts.length + ‘/’ + max + ‘): ’ + opts.map(function(o,i){return (i+1)+’. ‘+o;}).join(’ | ’);
}

var CMD_DEFS = {
AssignMod:      { args: [‘Username’] },
RemoveMod:      { args: [‘Username’] },
FlairCode:      { args: [‘Flair’, ‘Code’], tierSelect: true },
FlairColor:     { args: [’#Color’, ‘Hover Text (optional)’], tierSelect: true },
FlairText:      { args: [‘Hover Text’], tierSelect: true },
FlairTime:      { args: [‘Username’, ‘Months’, ‘Days’] },
BanUser:        { args: [‘Username’] },
ReinstateUser:  { args: [‘Username’] },
WarnUser:       { args: [‘Username’] },
Changeusername: { args: [‘Old Username’, ‘New Username’] },
DMuser:         { args: [‘Username’] },
AdjustRating:   { args: [‘Username’, ‘Points’] },
ViewUsers:      { args: [], optional: true },
BannedUsers:    { args: [], optional: true },
RestrictPage:   { args: [‘URL Slug’, ‘Flair1, Flair2, …’] },
UnrestrictPage: { args: [‘URL Slug’] },
HoverAdd:       { args: [‘Option Text’], tierSelect: true },
HoverRemove:    { args: [‘Option Text’], tierSelect: true },
HoverTiers:     { args: [‘Tier1, Tier2, …’] },
HoverCount:     { args: [‘Max Count’], tierSelect: true },
HoverList:      { args: [], tierSelect: true },
};

function cmdSelectChange() {
var sel    = document.getElementById(‘cmd-select’);
var cmd    = sel.value;
var tierEl = document.getElementById(‘flair-admin-tier’);
var scopeEl= document.getElementById(‘flair-admin-scope’);
var typeEl = document.getElementById(‘flair-admin-type’);
var subBtn = document.getElementById(‘cmd-submit-btn’);
var canBtn = document.getElementById(‘cmd-cancel-btn’);
var ta     = document.getElementById(‘flair-admin-email’);

```
// Hide assign-flair-specific dropdowns
[tierEl, scopeEl, typeEl].forEach(function(el) { if (el) el.style.display = 'none'; });
subBtn.style.display = 'none';
canBtn.style.display = 'none';

// Remove any previously built arg fields
var existing = document.getElementById('cmd-dynamic-fields');
if (existing) existing.remove();

if (!cmd) {
  if (ta) ta.placeholder = 'Username, email, or arguments...';
  return;
}

if (cmd === 'AssignFlair') {
  if (tierEl)  tierEl.style.display  = 'inline-block';
  if (scopeEl) scopeEl.style.display = 'inline-block';
  subBtn.textContent = 'Assign';
  subBtn.style.display = 'inline-block';
  canBtn.style.display = 'inline-block';
  if (ta) ta.placeholder = 'Username or email...';
  return;
}

var def = CMD_DEFS[cmd];
if (!def) return;

// Build a fresh container and insert it into the command row
var container = document.createElement('div');
container.id = 'cmd-dynamic-fields';
container.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;width:100%;';

if (def.tierSelect) {
  // Flair tier dropdown
  var tierDrop = document.createElement('select');
  tierDrop.className = 'flair-admin-select';
  tierDrop.setAttribute('data-role', 'tier-select');
  tierDrop.style.cssText = 'display:inline-block;';
  [
    {val:'', label:'-- Flair --'},
    {val:'newcomer',  label:'Drifter'},
    {val:'supporter', label:'Supporter'},
    {val:'subscriber',label:'Subscriber'},
    {val:'member',    label:'Member'},
    {val:'collector', label:'Collector'},
    {val:'artist',    label:'Featured Artist'},
    {val:'writer',    label:'Featured Writer'},
  ].forEach(function(t) {
    var o = document.createElement('option');
    o.value = t.val; o.textContent = t.label;
    tierDrop.appendChild(o);
  });
  container.appendChild(tierDrop);
}

// Arg input fields
def.args.forEach(function(placeholder, idx) {
  var inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = placeholder;
  inp.className = 'flair-admin-input';
  inp.style.cssText = 'width:160px;display:inline-block;';
  inp.setAttribute('data-arg-idx', idx);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var next = container.querySelector('[data-arg-idx="' + (idx + 1) + '"]');
      if (next) next.focus(); else cmdSubmit();
    } else if (e.key === 'Enter') { cmdSubmit(); }
  });
  container.appendChild(inp);
});

if (def.optional) {
  if (ta) ta.placeholder = 'Username or email (optional, leave blank for all)';
} else if (ta) {
  ta.placeholder = 'Or type full command here instead...';
}

// Insert container after the cmd-select row div
var cmdRow = sel.closest ? sel.closest('div') : sel.parentNode;
if (cmdRow) {
  cmdRow.appendChild(container);
}

subBtn.textContent = 'Submit';
subBtn.style.display = 'inline-block';
canBtn.style.display = 'inline-block';

// Focus first input or tier dropdown
setTimeout(function() {
  var first = container.querySelector('input');
  if (first) first.focus();
  else {
    var drop = container.querySelector('select');
    if (drop) drop.focus();
  }
}, 50);
```

}

```
function cmdSubmit() {
var sel = document.getElementById('cmd-select');
var cmd = sel.value;
if (!cmd) return;
if (cmd === 'AssignFlair') {
  adminAssignFlair();
} else {
  var def    = CMD_DEFS[cmd];
  var ta     = document.getElementById('flair-admin-email');
  var fields = document.getElementById('cmd-args-fields');
  var raw;
  if (def && def.optional) {
    // ViewUsers / BannedUsers -- textarea is an optional filter
    var filter = ta ? ta.value.trim() : '';
    raw = filter ? cmd + '(' + filter + ')' : cmd + '()';
  } else {
    var args = [];
    // Read from dynamic fields container
    var dynFields = document.getElementById('cmd-dynamic-fields');
    if (dynFields) {
      var tierSel = dynFields.querySelector('[data-role="tier-select"]');
      if (tierSel) args.push(tierSel.value);
      dynFields.querySelectorAll('input').forEach(function(inp) { args.push(inp.value.trim()); });
    }
    // If arg fields are gone or empty, try parsing the textarea directly
    // Allows typing args comma-separated without parentheses
    var taVal = ta ? ta.value.trim() : '';
    if (args.every(function(a){return a==='';}) && taVal) {
      // Check if user already typed Cmd(args) format -- pass through as-is
      var alreadyFormatted = new RegExp('^' + cmd + '\\s*\\(', 'i').test(taVal);
      if (alreadyFormatted) {
        raw = taVal;
      } else {
        args = taVal.split(',').map(function(s){ return s.trim(); });
        raw = cmd + '(' + args.join(', ') + ')';
      }
    } else {
      raw = cmd + '(' + args.join(', ') + ')';
    }
  }
  if (ta) ta.value = raw;
  adminAssignFlair();
  // Only clear fields on success
  setTimeout(function() {
    var st = document.getElementById('cmd-status');
    var adSt = document.getElementById('flair-admin-status');
    var hasErr = (st && st.textContent.indexOf('Error') !== -1) ||
                 (adSt && adSt.textContent.indexOf('Error') !== -1);
    if (!hasErr && fields) fields.innerHTML = '';
  }, 250);
}
```

}

function cmdCancel() {
var sel    = document.getElementById(‘cmd-select’);
var wrap   = document.getElementById(‘cmd-args-wrap’);
var subBtn = document.getElementById(‘cmd-submit-btn’);
var canBtn = document.getElementById(‘cmd-cancel-btn’);
var status = document.getElementById(‘cmd-status’);
var ta     = document.getElementById(‘flair-admin-email’);
var tierEl = document.getElementById(‘flair-admin-tier’);
var scopeEl= document.getElementById(‘flair-admin-scope’);
var typeEl = document.getElementById(‘flair-admin-type’);
sel.value = ‘’;
wrap.style.display = ‘none’;
subBtn.style.display = ‘none’;
canBtn.style.display = ‘none’;
[tierEl, scopeEl, typeEl].forEach(function(el) { if (el) el.style.display = ‘none’; });
if (status) status.textContent = ‘’;
var dynFields = document.getElementById(‘cmd-dynamic-fields’);
if (dynFields) dynFields.remove();
if (ta) { ta.value = ‘’; ta.placeholder = ‘Username, email, or arguments…’; }
}

// ── FILTERED VIEW USERS ──────────────────────────────
function openViewUsersFiltered(rawInput) {
var inputs = rawInput.split(’,’).map(function(s) { return s.trim(); }).filter(Boolean);
var emails = inputs.map(resolveEmailAnyPage).filter(Boolean);
if (emails.length === 0) {
showAnnouncement(‘View Users’, ‘No matching users found for: ’ + rawInput, ‘⚠️’);
return;
}
openViewUsers();
// Filter table to matched emails
setTimeout(function() {
var tbody = document.getElementById(‘viewusers-body’);
if (!tbody) return;
var rows = tbody.querySelectorAll(‘tr’);
rows.forEach(function(row) {
var emailCell = row.querySelector(‘td’);
if (!emailCell) return;
var rowEmail = emailCell.textContent.trim().toLowerCase();
row.style.display = emails.indexOf(rowEmail) !== -1 ? ‘’ : ‘none’;
});
var ctrl = document.getElementById(‘viewusers-controls’);
if (ctrl) ctrl.innerHTML = ‘<span style="font-size:11px;color:#555;">’ + emails.length + ’ user’ + (emails.length !== 1 ? ‘s’ : ‘’) + ’ shown</span>’;
}, 100);
}

// ── BANNED USERS ─────────────────────────────────────
function openBannedUsers(rawInput) {
var banned = Object.keys(bannedUsers).filter(function(e) { return bannedUsers[e]; });
if (rawInput.trim()) {
// Filter to specified users
var inputs = rawInput.split(’,’).map(function(s) { return s.trim(); }).filter(Boolean);
var resolved = inputs.map(resolveEmailAnyPage).filter(Boolean);
if (resolved.length === 0) {
showAnnouncement(‘Banned Users’, ‘No matching users found for: ’ + rawInput, ‘⚠️’);
return;
}
var notBanned = resolved.filter(function(e) { return !bannedUsers[e]; });
banned = resolved.filter(function(e) { return !!bannedUsers[e]; });
if (banned.length === 0) {
var names = resolved.map(function(e) { return usernameMap[e] || e; }).join(’, ‘);
showAnnouncement(‘Banned Users’, names + (resolved.length === 1 ? ’ is’ : ’ are’) + ’ not banned.’, ‘ℹ️’);
return;
}
}
if (banned.length === 0) {
showAnnouncement(‘Banned Users’, ‘No users are currently banned.’, ‘ℹ️’);
return;
}
openViewUsers();
setTimeout(function() {
var tbody = document.getElementById(‘viewusers-body’);
if (!tbody) return;
var rows = tbody.querySelectorAll(‘tr’);
rows.forEach(function(row) {
var emailCell = row.querySelector(‘td’);
if (!emailCell) return;
var rowEmail = emailCell.textContent.trim().toLowerCase();
row.style.display = banned.indexOf(rowEmail) !== -1 ? ‘’ : ‘none’;
});
var ctrl = document.getElementById(‘viewusers-controls’);
if (ctrl) ctrl.innerHTML = ‘<span style="font-size:11px;color:#ff4444;">’ + banned.length + ’ banned user’ + (banned.length !== 1 ? ‘s’ : ‘’) + ‘</span>’;
}, 100);
}

// ── RESTRICT PAGE COMMAND ───────────────────────────
// RestrictPage(url-slug, flair1, flair2, …)
// Adds or updates a PAGE_ACCESS entry at runtime and persists to localStorage.
// On page load, stored restrictions are merged with the hardcoded PAGE_ACCESS.
var RESTRICT_KEY = ‘airdriftPageAccess’;

// Load saved restrictions on init and merge into PAGE_ACCESS
(function() {
try {
var saved = JSON.parse(localStorage.getItem(RESTRICT_KEY) || ‘{}’);
Object.keys(saved).forEach(function(slug) { PAGE_ACCESS[slug] = saved[slug]; });
} catch(e) {}
})();

function adminRestrictPage(rawInput) {
var parts = rawInput.split(’,’).map(function(s) { return s.trim(); }).filter(Boolean);
if (parts.length < 2) return ‘Usage: RestrictPage(url-slug, flair1, flair2, …)’;
var slug   = parts[0].toLowerCase();
var tiers  = parts.slice(1).map(function(t) { return t.toLowerCase(); });
var valid  = [‘newcomer’,‘supporter’,‘subscriber’,‘member’,‘collector’,‘artist’,‘writer’];
var bad    = tiers.filter(function(t) { return valid.indexOf(t) === -1; });
if (bad.length > 0) return ‘Error: unknown tier(s): ’ + bad.join(’, ’) + ‘. Valid: ’ + valid.join(’, ’);
PAGE_ACCESS[slug] = tiers;
try {
var saved = JSON.parse(localStorage.getItem(RESTRICT_KEY) || ‘{}’);
saved[slug] = tiers;
localStorage.setItem(RESTRICT_KEY, JSON.stringify(saved));
} catch(e) {}
return ‘Done. “’ + slug + ‘” restricted to: ’ + tiers.join(’, ’) + ‘.’;
}

function adminUnrestrictPage(rawInput) {
var slug = rawInput.trim().toLowerCase();
if (!PAGE_ACCESS[slug]) return ‘Error: “’ + slug + ‘” is not a restricted page.’;
delete PAGE_ACCESS[slug];
try {
var saved = JSON.parse(localStorage.getItem(RESTRICT_KEY) || ‘{}’);
delete saved[slug];
localStorage.setItem(RESTRICT_KEY, JSON.stringify(saved));
} catch(e) {}
return ‘Done. “’ + slug + ‘” is now unrestricted.’;
}

// ── SHOUTOUT NOTIFICATIONS ──────────────────────────
// Fired once per user per page when their @[Name] is found in the post body.
// Tracked in sessionStorage so we don’t spam them on every page load.
var _shoutoutsThisSession = {};

function sendShoutoutNotification(email, username) {
if (!email || email === MODERATOR_EMAIL) return; // author doesn’t notify themselves
var sessionKey = ‘shoutout:’ + email + ‘:’ + window.location.pathname;
if (_shoutoutsThisSession[sessionKey]) return; // already sent this session
_shoutoutsThisSession[sessionKey] = true;

```
// Check if we already sent this notification on a previous visit
// (stored in a localStorage set keyed by page + email)
var sentKey = 'airdriftShoutouts:' + email;
var sent = {};
try { sent = JSON.parse(localStorage.getItem(sentKey) || '{}'); } catch(e) {}
var pageKey = window.location.pathname;
if (sent[pageKey]) return; // already notified for this post
sent[pageKey] = new Date().toISOString();
try { localStorage.setItem(sentKey, JSON.stringify(sent)); } catch(e) {}

// Write notification to user's notification list
var notifKey = NOTIF_KEY + ':' + email;
var rn = [];
try { rn = JSON.parse(localStorage.getItem(notifKey) || '[]'); } catch(e) {}
// Avoid duplicate shoutout notif for same post
var alreadyExists = rn.some(function(n) { return n.type === 'shoutout' && n.pageUrl === pageKey; });
if (alreadyExists) return;
var pageTitle = document.title || pageKey;
rn.unshift({
  id: 'shoutout_' + Date.now(),
  type: 'shoutout',
  read: false,
  fromName: usernameMap[MODERATOR_EMAIL] || 'Stefan',
  preview: '\uD83D\uDCE3 You were shouted out in: ' + pageTitle,
  time: new Date().toISOString(),
  pageUrl: pageKey
});
try { localStorage.setItem(notifKey, JSON.stringify(rn)); } catch(e) {}
// GAS HOOKUP: push shoutout notification server-side:
// if (GAS_URL) fetch(GAS_URL, { method:'POST', headers:{'Content-Type':'application/json'},
//   body: JSON.stringify({ action:'sendShoutout', email: email, pageUrl: pageKey, pageTitle: pageTitle }) }).catch(function(){});
```

}

// ── TESTING CHECKLIST ────────────────────────────────
// Built entirely in JS so no special chars touch Blogger XML parser
var CHECKLIST_KEY = ‘airdriftChecklist’;

var CHECKLIST_DATA = [
{ section: ‘1. Sign In & Session’, items: [
‘Welcome modal appears ~1.5s after load on first visit’,
‘Maybe Later dismisses modal and never shows it again’,
‘Sign in from modal completes Google auth flow’,
‘Modal skipped when already signed in’,
‘Username prompt appears on brand new account sign-in’,
‘Custom username saved and applied to comments’,
‘Dismiss username modal uses Google display name’,
‘Username uniqueness enforced’,
‘Offensive username rejected with error and strike’,
‘Session persists across tab close and reopen’,
‘Sign out clears bell, sticky box, and flair panels’,
‘Sign out clears notifications from previous user’,
]},
{ section: ‘2. Signed-In Toast’, items: [
‘Toast appears bottom-right on fresh sign-in’,
‘Toast shows username with Profile and Dismiss buttons’,
‘Toast only shows once per session (not on navigation)’,
‘Toast starts fading after 3 seconds’,
‘Toast fade takes approximately 5 seconds’,
‘Hovering or clicking stops the fade’,
‘Profile button restores toast to full opacity and opens card’,
‘Dismiss button fades toast over 5 seconds’,
‘Closing profile card fades toast over 5 seconds’,
]},
{ section: ‘3. Profile Card’, items: [
‘Click username opens profile card’,
‘Click same username again closes card’,
‘Tap anywhere outside card closes it’,
‘Card shows flair badge for flaired users’,
‘Card shows tenure badge for qualifying users’,
‘Card shows member since date’,
‘Card shows comment count’,
‘Card shows community rating’,
‘Negative community rating shows red glow’,
‘Author badge visible on your own card’,
‘Mod badge visible on assigned mod cards’,
‘Bio saves and displays immediately without closing card’,
‘Bio shows even if it was empty before saving’,
‘Username color swatches update without closing card’,
‘Color updates live in open card name’,
‘Subscriber+ gets basic color palette’,
‘Member+ gets premium color palette’,
‘Author always gets all profile options’,
‘Community rank label uses unique Google Font’,
‘Zenith badge picker in Settings tab for Zenith users’,
‘Tenure badge picker updates badge in card immediately’,
‘Subscriptions list in Settings tab’,
‘DM button visible to mod on others cards’,
]},
{ section: ‘4. Posting Comments’, items: [
‘Post a comment in All sort (appears at bottom, scrolls to it)’,
‘Post with Newest sort (appears at top)’,
‘Post with Hot sort (pinned to top for session)’,
‘Character counter updates live’,
‘Rate limit: 5 comments per minute enforced’,
‘Rate limit: 50 comments per hour enforced’,
‘Rate limit persists across page refresh’,
‘Rate limit persists across tab close’,
‘Mods exempt from rate limit’,
‘Spam filter: banned phrase caught’,
‘Spam filter: character substitution (leet-speak) caught’,
‘Moderator bypasses spam filter’,
‘Pending comment visible to author only with label’,
‘Non-English comment shows Translate button’,
‘Translation works correctly’,
‘Subscriber+ formatting: bold, italic, quote, code’,
‘Non-Subscriber formatting renders as plain text’,
]},
{ section: ‘5. Sticky Comment Box’, items: [
‘Sticky box hidden at top of page’,
‘Sticky hidden when main form is visible’,
‘Sticky appears when form is scrolled away’,
‘Bottom padding prevents sticky from blocking buttons’,
‘Sticky disappears when form scrolls back into view’,
‘Sticky submit button posts comment correctly’,
]},
{ section: ‘6. Replies & Threading’, items: [
‘Reply to a top-level comment’,
‘Reply to a reply (nested threading)’,
‘Show all replies toggle works’,
‘Continue Thread button appears at depth limit’,
‘Navigate into thread (Previous Thread)’,
‘Return to main thread’,
‘Member+ replies get priority border’,
]},
{ section: ‘7. Pagination & Sorting’, items: [
‘All sort is default’,
‘Newest sort works’,
‘Hot sort works’,
‘Search filter works’,
‘Pagination appears at 21+ comments’,
‘Start button appears on page 3+’,
‘Highlighted comments float to top in All sort’,
‘Show More loads next 20 comments’,
]},
{ section: ‘8. Voting’, items: [
‘Upvote works’,
‘Downvote works’,
‘Switch vote (upvote then downvote changes both)’,
‘Remove vote (click same vote again)’,
‘Cannot vote own comment’,
‘Zero score hidden from display’,
‘Positive score shows green’,
‘Negative score shows red’,
‘Votes preserved after comment delete’,
‘Votes preserved after reply delete’,
]},
{ section: ‘9. Edit & Delete’, items: [
‘Edit within 10-minute window’,
‘Edit timer countdown shows’,
‘Save edit updates comment in place’,
‘Delete comment with no replies: fully removed’,
‘Delete comment with replies: shows Deleted placeholder’,
‘Delete reply works’,
‘Vote score preserved on delete’,
]},
{ section: ‘10. Flair System’, items: [
‘Assign flair by email address’,
‘Assign flair by username’,
‘Assign flair to multiple users at once (comma-separated)’,
‘No-change detection when same flair already assigned’,
‘Remove flair clears assignment’,
‘Page scope flair (this page only)’,
‘All pages scope flair’,
‘Article restriction type’,
‘Interview restriction type’,
‘Flair gradients render correctly (JS-injected CSS)’,
‘Flair Color command changes tier color’,
‘Flair Color with hover tooltip text’,
‘Flair Color with per-user stamp’,
‘Flair Code command updates redemption code’,
‘Assign Flair works for users not yet on current page’,
‘Seasonal Drifter hover tooltip updates each season’,
]},
{ section: ‘11. Flair Tenure Badges’, items: [
‘Tenure tracking starts on flair assign’,
‘No badge shown below 3 months’,
‘Stakeholder (❂) at 3 months – silver shimmer’,
‘VIP (✧) at 6 months – silver shimmer’,
‘Epic (◈) at 9 months – silver shimmer’,
‘Knighted (⚜) at 12 months – orange shimmer’,
‘Legendary (⚔) at 18 months – orange shimmer’,
‘Mythic (✤) at 24 months – orange shimmer’,
‘Eternal (⁂) at 30 months – orange shimmer’,
‘Transcendent (❈) at 36 months – purple foil’,
‘Alpha (❃) at 42 months – purple foil’,
‘Apex (⍟) at 48 months – purple foil’,
‘Omega (♛) at 54 months – purple foil’,
‘Zenith (✺) at 60 months – purple foil + modal + notification’,
‘Zenith badge picker in Settings tab’,
‘Badge tooltip shows badge name on hover’,
‘Badge visible in profile card’,
‘Tenure only applies to Subscriber, Member, Collector’,
‘Tenure cleared on flair removal’,
‘Flair Time command sets tenure with username’,
‘Flair Time command sets tenure with email’,
‘Flair Time on Supporter tier (no badge, but tracked)’,
‘Flair Time on unflaired user returns error’,
‘Flair Time result message shown’,
]},
{ section: ‘12. Notifications’, items: [
‘Bell appears on reply to own comment’,
‘Bell appears on reply to own reply’,
‘Notifications are user-specific’,
‘Bell fades after 7 seconds when no unread items’,
‘Notifications button in own profile card’,
‘Cleared notifications do not return on refresh’,
‘Click notification scrolls to item on same page’,
‘Click notification navigates cross-page’,
‘Top-level comment notification toggle (mod setting)’,
‘Shoutout notification when @[Name] used in post body’,
‘No repeat shoutout on page refresh’,
‘Zenith unlock notification appears’,
‘Clicking outside notification panel closes it on mobile’,
‘Clicking outside notification panel closes it on desktop’,
‘Dismiss clears bell’,
‘Mark all read clears unread indicators’,
]},
{ section: ‘13. @Mentions’, items: [
‘@mention autocomplete dropdown appears’,
‘Author always appears in dropdown on all pages’,
‘Select mention inserts name into text’,
‘Rendered mention is clickable in posted comment’,
‘Clicking mention scrolls to that users latest comment’,
‘Mention notification received by mentioned user’,
‘@[Name] in post body renders as clickable span (no @ shown)’,
‘Multi-word post body mention works: @[Name with spaces]’,
‘Clicking post body mention opens profile card’,
‘Shoutout notification sent once per post per user’,
‘Unrecognized post body names still render styled’,
]},
{ section: ‘14. Admin Commands’, items: [
‘Change Username retroactively updates all past comments’,
‘Assign Mod promotes multiple users at once’,
‘Remove Mod demotes user’,
‘Ban User: confirmation prompt shown’,
‘Ban User: confirmation text correct’,
‘Ban User: safeguard prevents accidental ban’,
‘Reinstate User lifts ban’,
‘Warn User sends alert’,
‘All commands are case-insensitive’,
‘Mixed username and email in one command works’,
‘Commands dropdown: all commands grouped correctly’,
‘Tab jumps to next argument field’,
‘Comma in field jumps to next field’,
‘Enter submits command’,
‘Cancel resets panel cleanly’,
‘Flair Code command works’,
‘Flair Color command works’,
‘Flair Time command works’,
‘Adjust Rating offsets community score’,
‘View Users blank: shows all users sortable table’,
‘View Users with name: filters to that user’,
‘Banned Users: shows banned list’,
‘Banned Users: error if none or wrong names’,
‘Restrict Page adds access rule and persists’,
‘Unrestrict Page removes rule’,
]},
{ section: ‘15. Shadow Ban’, items: [
‘Banned phrase posts go to pending’,
‘Pending comment visible to author only’,
‘Pending hidden from all other users’,
‘Existing comments stay visible after ban’,
‘New posts hidden from others after ban’,
‘No pending approval message shown to banned user’,
‘Shadow-banned posts visible in mod dashboard’,
‘Reinstate removes shadow ban’,
‘Approve pending comment makes it public’,
‘Reject pending removes it’,
]},
{ section: ‘16. Report System’, items: [
‘Report button shows confirmation modal for non-mods’,
‘Yes Report files the report’,
‘Nevermind cancels without filing’,
‘Mod reporting opens dashboard silently’,
‘Delete reported comment from dashboard’,
‘Dismiss report from dashboard’,
‘Cannot report own comment (regular user)’,
‘Report rate limit enforced’,
‘Report rate persists across refresh’,
‘3 reports flags user in dashboard’,
‘Report abuse tracking in dashboard’,
]},
{ section: ‘17. Moderation Dashboard’, items: [
‘Dashboard shows when pending or reported items exist’,
‘Dashboard hidden when empty’,
‘Close button works’,
‘Ban button visible to master mod only’,
‘Warn button visible to master mod only’,
‘Ban and Warn hidden from assigned mods’,
‘Assigned mod sees dashboard’,
‘Mod self-report log visible to master mod’,
‘Report Activity section visible to master mod’,
‘Reported-by attribution shown’,
‘Chats section lists all DM threads’,
‘Reopen DM from Chats section’,
‘Notification Settings toggle works’,
‘Testing checklist persists checked state’,
‘Checklist Reset button clears all items’,
]},
{ section: ‘18. Moderator Badge’, items: [
‘Assigned mod gets moderator badge’,
‘Badge visible to all users on mod comments’,
‘Badge removed on Remove Mod command’,
‘Author badge on your own comments’,
]},
{ section: ‘19. Reactions & Gamification’, items: [
‘Reaction + button appears inline between Report and star’,
‘Picker opens and stays on screen on mobile’,
‘Clicking reaction toggles on/off with count’,
‘Pulse animation fires on click’,
‘Supporter+ required; non-qualifying sees pills only’,
‘Author can always react’,
‘Streak badge appears after 4 consecutive weekly comments’,
‘Streak resets if user misses a week’,
‘Monthly Spotlight: Top of the Month badge shown’,
‘Spotlight tooltip says Monthly top contributor’,
‘Community rank unlock modal fires on threshold’,
‘Rank modal uses rank-specific Google Font’,
‘Highlight star visible on comments for Author only’,
‘Highlighted comment floats to top in All sort’,
‘+5 points added to leaderboard on highlight’,
‘Leaderboard trophy button opens panel’,
‘Leaderboard closes on outside tap’,
‘All Time / 12 Months / 30 Days filters work’,
]},
{ section: ‘20. Flair Display & Alignment’, items: [
‘Featured Artist symbol alignment correct’,
‘Tenure badge appears to right of flair’,
‘Tenure badge in profile card correct position’,
‘Flair gradient CSS survives Blogger XML sanitizer’,
‘Drifter symbol renders on mobile’,
]},
{ section: ‘21. General & Cross-Page’, items: [
‘Comment rate limit survives page refresh’,
‘Comment rate limit survives tab close’,
‘Report rate persists across refresh’,
‘Widget hidden on homepage’,
‘Widget hidden on static pages’,
‘Widget shown on post pages’,
‘Per-page comment isolation (page A comments dont appear on page B)’,
‘No SAXParseException errors in Blogger’,
‘Sign-in banner slides in on return visits’,
‘Sign-in banner dismisses for rest of session’,
‘Welcome modal only shows on very first ever visit’,
]},
];

function buildChecklist() {
var section = document.getElementById(‘mod-checklist-section’);
if (!section) return;
var saved = {};
try { saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || ‘{}’); } catch(e) {}

```
var header = document.createElement('div');
header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
var h4 = document.createElement('h4');
h4.style.margin = '0';
h4.textContent = '\u2705 Testing Checklist';
var resetBtn = document.createElement('button');
resetBtn.textContent = 'Reset';
resetBtn.style.cssText = 'background:none;border:1px solid #333;color:#555;font-size:10px;padding:3px 8px;border-radius:4px;cursor:pointer;font-family:inherit;';
resetBtn.onclick = function() {
  if (!window.confirm('Reset all checklist items?')) return;
  localStorage.removeItem(CHECKLIST_KEY);
  section.querySelectorAll('.checklist-item').forEach(function(cb) { cb.checked = false; });
};
header.appendChild(h4);
header.appendChild(resetBtn);
section.appendChild(header);

var body = document.createElement('div');
body.style.cssText = 'max-height:400px;overflow-y:auto;';

CHECKLIST_DATA.forEach(function(group) {
  var sectionLabel = document.createElement('div');
  sectionLabel.style.cssText = 'font-size:10px;color:#FF6B35;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 5px;font-weight:700;';
  sectionLabel.textContent = group.section;
  body.appendChild(sectionLabel);

  group.items.forEach(function(itemText) {
    var key = itemText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    var label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;cursor:pointer;font-size:11px;color:#888;line-height:1.4;';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'checklist-item';
    cb.setAttribute('data-key', key);
    cb.style.cssText = 'margin-top:2px;flex-shrink:0;accent-color:#b89f37;';
    if (saved[key]) cb.checked = true;
    cb.onchange = function() {
      var s = {};
      section.querySelectorAll('.checklist-item').forEach(function(c) {
        if (c.checked) s[c.getAttribute('data-key')] = true;
      });
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(s));
    };
    var span = document.createElement('span');
    span.textContent = itemText;
    label.appendChild(cb);
    label.appendChild(span);
    body.appendChild(label);
  });
});

section.appendChild(body);
```

}