<style>
  /* ============================================
     BASE STYLES
     ============================================ */
  * { box-sizing: border-box; }
  
  .custom-comments-section {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e2e8f0;
    max-width: 100%;
  }

  /* COMMENT CONTAINER */
  .comments-container {
    background: #111111;
    border: 1px solid #2a2a2a;
    border-left: 4px solid #2a5f7f;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
  }

  @media (min-width: 768px) {
    .comments-container {
      padding: 30px;
      margin: 30px 0;
    }
  }

  .comments-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid #2a5f7f;
    flex-wrap: wrap;
    gap: 15px;
  }

  .comments-header h2 {
    color: #b89f37;
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  @media (min-width: 768px) {
    .comments-header h2 {
      font-size: 20px;
    }
  }

  .comments-filter {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  @media (max-width: 480px) {
    .comments-filter {
      width: 100%;
      gap: 6px;
    }
  }

  .filter-btn {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    transition: all 0.2s;
    white-space: nowrap;
  }

  @media (min-width: 768px) {
    .filter-btn {
      font-size: 12px;
    }
  }

  .filter-btn:hover,
  .filter-btn.active {
    background: #FF6B35;
    color: white;
    border-color: #FF6B35;
  }

  /* SEARCH INPUT */
  #search-input {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    width: 100%;
    transition: all 0.2s;
  }

  @media (min-width: 640px) {
    #search-input {
      width: 150px;
    }
  }

  #search-input::placeholder { color: #666666; }

  #search-input:focus {
    outline: none;
    border-color: #FF6B35;
  }

  /* COMMENT ITEM */
  .comment-item {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 12px;
    transition: all 0.2s;
  }

  @media (min-width: 768px) {
    .comment-item {
      padding: 20px;
      margin-bottom: 15px;
    }
  }

  .comment-item:hover {
    border-color: #FF6B35;
    box-shadow: 0 2px 8px rgba(255, 107, 53, 0.1);
  }

  .comment-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .comment-author {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .comment-name {
    color: #FF6B35;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  @media (min-width: 768px) {
    .comment-name {
      font-size: 14px;
    }
  }

  .comment-name:hover { text-decoration: underline; }

  .comment-badge {
    background: linear-gradient(135deg, #FF6B35 0%, #b89f37 100%);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
    display: inline-block;
    vertical-align: middle;
    margin-left: 4px;
  }

  @media (min-width: 768px) {
    .comment-badge {
      font-size: 10px;
    }
  }
  .mod-badge {
    background: linear-gradient(135deg, #2a5f7f 0%, #1a3f5f 100%);
    color: white; padding: 2px 6px; border-radius: 3px;
    font-size: 9px; font-weight: 700; text-transform: uppercase; margin-left: 4px;
  }
  @media (min-width: 768px) { .mod-badge { font-size: 10px; } }

  .comment-meta {
    color: #666666;
    font-size: 11px;
    margin-bottom: 10px;
  }

  @media (min-width: 768px) {
    .comment-meta {
      font-size: 12px;
    }
  }

  .comment-text {
    color: #b89f37;
    font-size: 13px;
    line-height: 1.6;
    margin: 12px 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  @media (min-width: 768px) {
    .comment-text {
      font-size: 14px;
      margin: 15px 0;
    }
  }

  .comment-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 12px;
  }

  @media (min-width: 768px) {
    .comment-actions {
      gap: 20px;
      margin-top: 15px;
    }
  }

  .vote-button {
    background: none;
    border: none;
    color: #666666;
    cursor: pointer;
    font-size: 12px;
    padding: 4px 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  @media (min-width: 768px) {
    .vote-button {
      font-size: 14px;
    }
  }

  .vote-button:hover { color: #b89f37; }
  .vote-button.active-up { color: #4CAF50; }
  .vote-button.active-down { color: #ff1744; }

  .action-btn {
    background: none;
    border: none;
    color: #666666;
    cursor: pointer;
    font-size: 11px;
    padding: 4px 8px;
    font-weight: 600;
    transition: all 0.2s;
  }

  @media (min-width: 768px) {
    .action-btn {
      font-size: 12px;
    }
  }

  .action-btn:hover { color: #FF6B35; }

  /* FORM STYLES */
  .comment-form {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
  }

  @media (min-width: 768px) {
    .comment-form {
      padding: 20px;
      margin-bottom: 30px;
    }
  }

  .form-textarea {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    padding: 12px;
    border-radius: 4px;
    font-family: inherit;
    margin-bottom: 12px;
    font-size: 14px;
    min-height: 100px;
    resize: vertical;
    display: block;
  }

  .form-textarea::placeholder { color: #666666; }

  .form-textarea:focus {
    outline: none;
    border-color: #FF6B35;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
  }

  .char-count {
    color: #666666;
    font-size: 11px;
    text-align: right;
    margin-top: -8px;
    margin-bottom: 8px;
  }

  @media (min-width: 768px) {
    .char-count {
      font-size: 12px;
    }
  }

  .form-buttons {
    display: flex;
    gap: 10px;
    flex-direction: column;
  }

  @media (min-width: 480px) {
    .form-buttons {
      flex-direction: row;
    }
  }

  .submit-btn {
    background: linear-gradient(135deg, #FF6B35 0%, #b89f37 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s;
    width: 100%;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-appearance: none;
    appearance: none;
  }

  @media (min-width: 480px) {
    .submit-btn {
      width: auto;
    }
  }

  .submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  }

  .submit-btn:active { transform: translateY(0); }

  /* PAGINATION */


  .auth-prompt {
    text-align: center;
    padding: 20px;
  }

  @media (min-width: 768px) {
    .auth-prompt {
      padding: 40px 20px;
    }
  }

  .auth-prompt p {
    color: #b89f37;
    margin-bottom: 15px;
    font-size: 14px;
  }

  @media (min-width: 768px) {
    .auth-prompt p {
      font-size: 16px;
    }
  }

  .auth-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 100%;
  }

  @media (min-width: 480px) {
    .auth-buttons {
      max-width: 300px;
      margin: 0 auto;
    }
  }

  /* RESPONSIVE HEADER */
  .comments-header-wrapper {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  @media (min-width: 768px) {
    .comments-header-wrapper {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .search-and-filter {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  @media (min-width: 768px) {
    .search-and-filter {
      flex-direction: row;
      width: auto;
    }
  }
  /* REPLIES */
  .replies-section {
    margin-top: 12px;
    border-top: 1px solid #1e1e1e;
    padding-top: 10px;
  }

  .reply-item {
    background: #0f0f0f;
    border: 1px solid #222;
    border-left: 3px solid #2a5f7f;
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 8px;
  }

  .reply-item:hover {
    border-left-color: #FF6B35;
  }

  /* Each nesting level indents by 16px, border shifts color slightly */
  .reply-depth-1 { margin-left: 0px;  border-left-color: #2a5f7f; }
  .reply-depth-2 { margin-left: 16px; border-left-color: #3a7f5f; }
  .reply-depth-3 { margin-left: 32px; border-left-color: #5f6f2a; }
  .reply-depth-4 { margin-left: 48px; border-left-color: #7f3a2a; }
  .reply-depth-deep { margin-left: 64px; border-left-color: #555; }

  .reply-name {
    color: #FF6B35;
    font-weight: 700;
    font-size: 12px;
  }

  .reply-meta {
    color: #666;
    font-size: 11px;
    margin: 3px 0 6px;
  }

  .reply-text {
    color: #b89f37;
    font-size: 12px;
    line-height: 1.5;
    word-wrap: break-word;
  }

  .reply-form {
    margin-top: 10px;
    display: none;
  }

  .reply-form.open {
    display: block;
  }

  .reply-textarea {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    padding: 10px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 13px;
    min-height: 70px;
    resize: vertical;
    display: block;
    margin-bottom: 8px;
  }

  .reply-textarea::placeholder { color: #666; }

  .reply-textarea:focus {
    outline: none;
    border-color: #FF6B35;
    box-shadow: 0 0 0 2px rgba(255,107,53,0.2);
  }

  .reply-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .reply-btn {
    background: linear-gradient(135deg, #FF6B35, #b89f37);
    color: white;
    border: none;
    padding: 7px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }

  .reply-btn:hover { opacity: 0.88; }

  .cancel-btn {
    background: none;
    border: 1px solid #333;
    color: #888;
    padding: 7px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .cancel-btn:hover { color: #FF6B35; border-color: #FF6B35; }

  .show-replies-btn {
    background: none;
    border: none;
    color: #2a5f7f;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 0;
    margin-top: 6px;
  }

  .show-replies-btn:hover { color: #FF6B35; }

  /* ── SEARCH REPLY RESULTS ── */
  #search-reply-results { margin-top: 8px; }
  .search-reply-item {
    border-left: 3px solid #2a5f7f;
    background: #0d0d0d;
    border-radius: 0 6px 6px 0;
    padding: 10px 14px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .search-reply-item:hover { border-color: #FF6B35; background: #111; }
  .search-reply-meta { font-size: 10px; color: #555; margin-bottom: 4px; }
  .search-reply-meta .sri-label { color: #2a5f7f; font-weight: 600; margin-right: 4px; }
  .search-reply-name { color: #b89f37; font-weight: 600; }
  .search-reply-text { font-size: 13px; color: #aaa; line-height: 1.5; }
  .search-reply-text em { color: #FF6B35; font-style: normal; font-weight: 600; }
  #search-reply-header {
    font-size: 11px; color: #555;
    margin: 14px 0 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #1e1e1e;
  }

  /* ── SIGNED-IN TOAST ── */
  #signin-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(10,10,10,0.92);
    border: 1px solid #2a5f7f;
    color: #b89f37;
    font-size: 12px;
    padding: 8px 14px;
    border-radius: 6px;
    z-index: 99995;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  #signin-toast.visible  { opacity: 1; pointer-events: auto; }
  /* fading class only reduces opacity — pointer-events stays auto so user can tap */
  #signin-toast.fading   { opacity: 0; pointer-events: auto; }

  /* ── PROFILE CARD ── */
  #profile-card {
    position: absolute;
    background: #111;
    border: 1px solid #2a5f7f;
    border-radius: 10px;
    padding: 18px 22px 14px;
    min-width: 300px;
    max-width: 380px;
    z-index: 99990;
    box-shadow: 0 8px 28px rgba(0,0,0,0.75);
    display: none;
    font-size: 13px;
    color: #888;
    line-height: 1.9;
  }
  #profile-card .pc-name    { font-size: 15px; font-weight: 700; color: #b89f37; margin-bottom: 4px; }
  #profile-card .pc-row     { display: flex; justify-content: space-between; align-items: center; }
  #profile-card .pc-label   { color: #c0394d; font-size: 11px; }
  #profile-card .pc-value   { color: #aaa; font-size: 12px; font-weight: 600; }
  #profile-card .pc-rank    { margin: 4px 0 4px; font-size: 18px; line-height: 1.3; }
  #profile-card .pc-rank-label { font-size: 12px; color: #b89f37; font-weight: 600; letter-spacing: 0.02em; }
  #profile-card .pc-flair   { margin-top: 4px; }
  #profile-card .pc-tenure  { font-size: 11px; color: #FF6B35; margin-top: 2px; }
  #profile-card .pc-tabs    { display: flex; gap: 0; border-bottom: 1px solid #1e1e1e; margin: 10px -22px 0; padding: 0 22px; }
  #profile-card .pc-tab     { font-size: 11px; color: #555; padding: 5px 10px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.2s; }
  #profile-card .pc-tab.active { color: #b89f37; border-bottom-color: #b89f37; }
  #profile-card .pc-tab-panel { display: none; padding-top: 10px; }
  #profile-card .pc-tab-panel.active { display: block; }
  #profile-card .pc-setting-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #1a1a1a; }
  #profile-card .pc-setting-label { font-size: 12px; color: #aaa; }
  #profile-card .pc-setting-sub  { font-size: 10px; color: #555; }
  /* Toggle switch */
  .pc-toggle { position:relative; width:32px; height:18px; flex-shrink:0; }
  .pc-toggle input { opacity:0; width:0; height:0; }
  .pc-toggle .slider { position:absolute; inset:0; background:#222; border-radius:18px; cursor:pointer; transition:background 0.2s; border:1px solid #2a2a2a; }
  .pc-toggle .slider::before { content:''; position:absolute; width:12px; height:12px; left:2px; bottom:2px; background:#555; border-radius:50%; transition:transform 0.2s; }
  .pc-toggle input:checked + .slider { background:#2a5f7f; }
  .pc-toggle input:checked + .slider::before { transform:translateX(14px); background:#b89f37; }

  /* ── FLAIR TENURE BADGE ── */
  /* Tenure shimmer keyframe */
  /* Tenure badge base */
  /* Shimmer keyframe — sweeps left to right */
  @keyframes tenureShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  /* Outer span: positioning + tooltip only, no clip ─ so tooltip inherits color safely */
  .flair-tenure {
    margin-left: 5px;
    vertical-align: middle;
    cursor: default;
    position: relative;
    display: inline-block;
  }

  /* Inner span: the visible badge text ─ gets gradient or solid color */
  .flair-tenure .tn {
    font-size: 10px;
    font-weight: 800;
    font-family: Georgia, 'Times New Roman', serif;
    letter-spacing: 0.04em;
    padding: 1px 5px;
    border-radius: 3px;
    display: inline-block;
  }

  /* Silver — mirror metallic shimmer, Stakeholder through Epic */
  .tenure-silver .tn {
    background-image: linear-gradient(90deg,
      #6a8a9a 0%, #a0bcc8 10%, #d8ecf4 22%, #ffffff 30%, #c8dce8 38%,
      #8aaabb 50%, #c0d8e4 62%, #f0f8ff 72%, #ffffff 78%, #b0cad6 88%, #6a8a9a 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: tenureShimmer 7s linear infinite;
  }

  /* Orange — left-to-right shimmer, Knighted through Eternal */
  .tenure-orange .tn {
    background-image: linear-gradient(90deg,
      #b85a20 0%, #FF6B35 20%, #f0c050 40%, #FF8C55 60%, #b89f37 80%, #b85a20 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: tenureShimmer 6s linear infinite;
  }

  /* Purple — foil/iridescent shimmer, Transcendent and above */
  .tenure-purple .tn {
    background-image: linear-gradient(90deg,
      #1a0630 0%, #6a1a90 8%, #b07ad6 18%, #f0d0ff 26%, #c8a0e8 33%,
      #80c0e0 40%, #b0e0f8 46%, #d4a4e8 54%,
      #f8e0ff 60%, #e8c4f8 66%, #8840b8 76%,
      #60a0d0 82%, #c084e8 90%, #1a0630 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: tenureShimmer 8s linear infinite;
    filter: drop-shadow(0 0 3px rgba(180,100,230,0.45));
  }

  /* Tooltip on outer span — plain solid text, no gradient interference */
  .flair-tenure::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #aaa;
    border: 1px solid #2a5f7f;
    font-size: 10px;
    font-weight: 400;
    font-family: Georgia, 'Times New Roman', serif;
    white-space: nowrap;
    padding: 4px 8px;
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 9999;
  }
  .flair-tenure:hover::after { opacity: 1; }

  /* ── STICKY COMMENT BOX ── */
  #sticky-comment-box {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9990;
    background: #0a0a0a;
    border-top: 1px solid #2a2a2a;
    padding: 3px 10px 3px;
    display: none;
    flex-direction: column;
    gap: 1px;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.5);
    box-sizing: border-box;
    width: 100%;
  }
  #sticky-comment-input {
    width: 100%;
    min-width: 0;
    background: #111;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    height: 34px;
    outline: none;
    box-sizing: border-box;
    margin-top: 2px;
  }
  #sticky-comment-input:focus { border-color: #FF6B35; }
  #sticky-comment-box .sticky-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-bottom: 2px;
  }
  #sticky-submit-btn {
    background: linear-gradient(135deg, #FF6B35, #b89f37);
    color: white;
    border: none;
    padding: 4px 28px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  #sticky-submit-btn:hover { opacity: 0.88; }

  /* ── NOTIFICATION BELL ── */
  #notif-bell {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 9999;
    display: none;
    transition: opacity 7s ease;
    opacity: 1;
    pointer-events: auto;
  }
  #notif-bell.fading {
    pointer-events: none;
  }
  #notif-bell-btn {
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 50px;
    padding: 8px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #b89f37;
    font-size: 24px;
    transition: all 0.2s;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
  }
  #notif-bell-btn:hover { border-color: #FF6B35; color: #FF6B35; }
  #notif-count {
    background: #FF6B35;
    color: white;
    border-radius: 50px;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 6px;
    min-width: 18px;
    text-align: center;
    display: none;
  }
  #notif-panel {
    position: fixed;
    top: 56px;
    right: 16px;
    z-index: 9998;
    width: calc(100vw - 32px);
    max-width: 380px;
    max-height: 420px;
    overflow-y: auto;
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    display: none;
  }
  #notif-panel.open { display: block; }
  .notif-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #1e1e1e;
  }
  .notif-header span { color: #b89f37; font-size: 13px; font-weight: 700; }
  .notif-clear-btn {
    background: none;
    border: none;
    color: #666;
    font-size: 11px;
    cursor: pointer;
  }
  .notif-clear-btn:hover { color: #FF6B35; }
  .notif-item {
    padding: 12px 16px;
    border-bottom: 1px solid #1a1a1a;
    cursor: pointer;
    transition: background 0.2s;
  }
  .notif-item:hover { background: #1a1a1a; }
  .notif-item.unread { border-left: 3px solid #FF6B35; }
  .notif-item.read   { border-left: 3px solid #2a2a2a; opacity: 0.7; }
  .notif-name { color: #FF6B35; font-size: 12px; font-weight: 700; }
  .notif-text { color: #b89f37; font-size: 12px; margin-top: 3px; }
  .notif-meta { color: #666; font-size: 11px; margin-top: 3px; }
  .notif-empty { color: #666; font-size: 12px; padding: 20px 16px; text-align: center; }

  /* ── SPAM FILTER + MODERATOR DASHBOARD ── */
  .comment-pending {
    color: #555;
    font-style: italic;
    font-size: 13px;
    padding: 10px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .comment-pending::before { content: '\23F3'; }
  #mod-dashboard {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 99999;
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
  }
  #mod-dashboard-box {
    background: #0d0d0d;
    border: 1px solid #2a5f7f;
    border-radius: 10px;
    padding: 24px;
    width: 100%;
    max-width: 640px;
    margin-top: 20px;
  }
  #mod-dashboard-box h3 { color: #b89f37; font-size: 16px; margin: 0 0 16px; }
  .mod-section { margin-bottom: 24px; }
  .mod-section h4 { color: #FF6B35; font-size: 13px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .mod-item {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .mod-item-meta { color: #555; font-size: 11px; margin-bottom: 4px; }
  .mod-item-text { color: #888; margin-bottom: 8px; word-break: break-word; }
  .mod-item-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .mod-approve-btn { background: #1a4d1a; color: #4CAF50; border: 1px solid #4CAF50; border-radius: 4px; padding: 4px 12px; font-size: 11px; cursor: pointer; }
  .mod-approve-btn:hover { background: #4CAF50; color: white; }
  .mod-reject-btn  { background: #4d1a1a; color: #ff4444; border: 1px solid #ff4444; border-radius: 4px; padding: 4px 12px; font-size: 11px; cursor: pointer; }
  .mod-reject-btn:hover  { background: #ff4444; color: white; }
  .mod-flagged-email { color: #FF6B35; font-weight: 700; }
  .mod-empty { color: #333; font-size: 12px; font-style: italic; }

  /* ── SPAM FILTER + MOD DASHBOARD ── */
  .comment-pending {
    color: #555;
    font-style: italic;
    font-size: 13px;
    padding: 10px 0;
    border-left: 3px solid #2a2a2a;
    padding-left: 10px;
  }
  #mod-dashboard {
    background: #0d0d0d;
    border: 1px solid #7f2a2a;
    border-radius: 8px;
    padding: 16px;
    margin: 0 0 20px;
    display: none;
  }
  #mod-dashboard h4 { color: #FF6B35; font-size: 13px; margin: 0 0 12px; }
  .mod-section { margin-bottom: 14px; }
  .mod-section h5 { color: #b89f37; font-size: 12px; margin: 0 0 8px; }
  .mod-item {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 4px;
    padding: 10px 12px;
    margin-bottom: 6px;
    font-size: 12px;
    color: #888;
  }
  .mod-item .mod-author { color: #FF6B35; font-weight: 700; margin-bottom: 4px; }
  .mod-item .mod-text   { color: #aaa; margin-bottom: 6px; }
  .mod-item .mod-actions { display:flex; gap:8px; flex-wrap:wrap; }
  .mod-approve-btn { background:none; border:1px solid #4CAF50; color:#4CAF50; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; }
  .mod-approve-btn:hover { background:#4CAF50; color:#000; }
  .mod-reject-btn  { background:none; border:1px solid #ff4444; color:#ff4444; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; }
  .mod-reject-btn:hover  { background:#ff4444; color:#fff; }
  .flagged-user-item { color:#FF6B35; font-size:12px; padding:4px 0; border-bottom:1px solid #1a1a1a; }

  /* ── PROFILE ICON BUTTON ── */
  #header-profile-btn {
    background: none;
    border: 1px solid #2a5f7f;
    color: #2a5f7f;
    font-size: 11px;
    font-weight: 600;
    font-family: inherit;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    display: none;
    flex-shrink: 0;
    transition: border-color 0.2s, color 0.2s;
    white-space: nowrap;
  }
  #header-profile-btn:hover { border-color: #FF6B35; color: #FF6B35; }

  /* ── VIEWER COUNT ── */
  #viewer-count {
    font-size: 10px;
    color: #444;
    display: none;
    white-space: nowrap;
  }
  #viewer-count.has-viewers { color: #2a5f7f; }

  /* ── TRANSLATE BUTTON ── */
  .translate-btn {
    background: none;
    border: none;
    color: #2a5f7f;
    font-size: 10px;
    cursor: pointer;
    padding: 0 4px;
    opacity: 0.7;
    font-family: inherit;
  }
  .translate-btn:hover { opacity: 1; }
  .translated-text { color: #888; font-style: italic; }
  .translated-tag { font-size: 9px; color: #555; margin-left: 4px; }

  /* ── DM WINDOW ── */
  #dm-window {
    position: fixed;
    bottom: 0;
    right: 24px;
    width: 320px;
    height: 440px;
    background: #0f0f0f;
    border: 1px solid #2a5f7f;
    border-bottom: none;
    border-radius: 10px 10px 0 0;
    z-index: 99980;
    display: none;
    flex-direction: column;
    box-shadow: 0 -6px 24px rgba(0,0,0,0.7);
    font-size: 13px;
    overflow: hidden;
  }
  #dm-header {
    background: linear-gradient(135deg, #1a3f5f, #0f2840);
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #b89f37;
    font-weight: 700;
    font-size: 13px;
    flex-shrink: 0;
    border-bottom: 1px solid #1e3a50;
    gap: 8px;
    overflow: hidden;
  }
  #dm-header-title { display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden; }
  #dm-header-title #dm-title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #dm-header-title #dm-subtitle { font-size:10px; color:#555; font-weight:400; white-space:nowrap; flex-shrink:0; }
  #dm-header-actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
  #dm-status-bar {
    padding: 4px 14px;
    font-size: 10px;
    color: #FF6B35;
    background: rgba(255,107,53,0.06);
    border-bottom: 1px solid #1e1e1e;
    display: none;
    flex-shrink: 0;
  }
  #dm-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    scroll-behavior: smooth;
  }
  .dm-msg-wrap { display:flex; flex-direction:column; max-width:82%; }
  .dm-msg-wrap.mine  { align-self: flex-end; align-items: flex-end; }
  .dm-msg-wrap.theirs { align-self: flex-start; align-items: flex-start; }
  .dm-msg {
    padding: 8px 12px;
    border-radius: 14px;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-word;
  }
  .dm-msg-wrap.mine  .dm-msg {
    background: linear-gradient(135deg, #2a5f7f, #1a3f5f);
    color: #e0d4a0;
    border-radius: 14px 14px 4px 14px;
  }
  .dm-msg-wrap.theirs .dm-msg {
    background: #1e1e1e;
    border: 1px solid #2a2a2a;
    color: #ccc;
    border-radius: 14px 14px 14px 4px;
  }
  .dm-msg-sender { font-size: 9px; color: #555; margin-bottom: 2px; }
  .dm-msg-time   { font-size: 9px; color: #444; margin-top: 2px; }
  #dm-input-row {
    display: flex;
    gap: 6px;
    padding: 10px;
    border-top: 1px solid #1e1e1e;
    background: #0f0f0f;
    flex-shrink: 0;
  }
  #dm-input {
    flex: 1;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #ddd;
    padding: 7px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  #dm-input:focus { border-color: #2a5f7f; }
  #dm-input:disabled { opacity: 0.4; cursor: not-allowed; }
  #dm-send-btn {
    background: linear-gradient(135deg, #2a5f7f, #1a3f5f);
    color: #b89f37;
    border: none;
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    white-space: nowrap;
    transition: opacity 0.2s;
  }
  #dm-send-btn:hover { opacity: 0.85; }
  .dm-btn-sm {
    background: none;
    border: 1px solid #2a2a2a;
    color: #888;
    font-size: 10px;
    padding: 3px 7px;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: border-color 0.2s, color 0.2s;
    flex-shrink: 0;
  }
  .dm-btn-sm:hover { border-color: #FF6B35; color: #FF6B35; }
  .dm-btn-sm.danger { border-color: #662222; color: #cc4444; }
  .dm-btn-sm.danger:hover { border-color: #ff4444; color: #ff4444; }

  /* ── VIEWUSERS TABLE ── */
  #viewusers-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 99985;
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding: 30px 10px;
    overflow-y: auto;
  }
  #viewusers-box {
    background: #111;
    border: 1px solid #2a5f7f;
    border-radius: 10px;
    padding: 20px;
    width: 100%;
    max-width: 900px;
    font-size: 12px;
    color: #aaa;
  }
  #viewusers-box h3 { color: #b89f37; margin-bottom: 12px; }
  #viewusers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  #viewusers-table th {
    color: #2a5f7f;
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid #2a2a2a;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
  }
  #viewusers-table th:hover { color: #b89f37; }
  #viewusers-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #1a1a1a;
    vertical-align: middle;
  }
  #viewusers-table tr:hover td { background: rgba(42,95,127,0.08); }

  /* ── COMMENTS VIEWER ── */
  #user-comments-modal {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 560px;
    max-height: 70vh;
    background: #111;
    border: 1px solid #2a5f7f;
    border-radius: 10px;
    z-index: 99986;
    display: none;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    overflow: hidden;
  }
  #user-comments-drag-handle {
    background: linear-gradient(135deg, #1a1a1a, #111);
    border-bottom: 1px solid #2a2a2a;
    padding: 10px 16px;
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    flex-shrink: 0;
  }
  #user-comments-drag-handle:active { cursor: grabbing; }
  #user-comments-box {
    padding: 14px 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  #user-comments-box h4 { color: #b89f37; margin-bottom: 10px; font-size: 13px; }
  .uc-item {
    border-left: 2px solid #2a5f7f;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: #0d0d0d;
    border-radius: 0 6px 6px 0;
    font-size: 12px;
    color: #aaa;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .uc-item:hover { border-color: #FF6B35; }
  .uc-item-meta { font-size: 10px; color: #555; margin-bottom: 3px; }

  /* ── LIGHT MODE ── */
  body.airdrift-light #airdrift-comments,
  body.airdrift-light .custom-comments-section {
    background: #f5f0e8 !important;
    color: #2a2016 !important;
  }
  body.airdrift-light .comment-item { background: #ede8de; border-color: #d4c9b5; }
  body.airdrift-light .comment-text { color: #2a2016; }
  body.airdrift-light .comment-meta { color: #7a6a50; }
  body.airdrift-light .comment-name { color: #5a3e10 !important; }
  body.airdrift-light .comment-input-wrapper textarea,
  body.airdrift-light #comment-input {
    background: #fff !important; color: #2a2016 !important; border-color: #c4b49a !important;
  }
  body.airdrift-light .filter-btn { background: #e8e0d0; color: #5a3e10; border-color: #c4b49a; }
  body.airdrift-light .filter-btn.active { background: #5a3e10; color: #f5f0e8; }
  body.airdrift-light #profile-card { background: #f5f0e8; border-color: #c4b49a; color: #5a3e10; }
  body.airdrift-light #profile-card .pc-name { color: #5a3e10; }
  body.airdrift-light #profile-card .pc-label { color: #9a8a70; }
  body.airdrift-light #profile-card .pc-value { color: #2a2016; }
  body.airdrift-light .vote-button { color: #7a6a50; }
  body.airdrift-light .action-btn  { color: #5a4f3a; }
  body.airdrift-light .reply-item  { background: #ede8de; }
  body.airdrift-light .reply-text  { color: #2a2016; }
  body.airdrift-light .search-input, body.airdrift-light #search-input {
    background: #fff; color: #2a2016; border-color: #c4b49a;
  }
  body.airdrift-light h2 { color: #2a2016; }
  body.airdrift-light .comments-header { border-color: #c4b49a; }
  /* Tenure tooltip in light mode */
  body.airdrift-light .flair-tenure::after {
    background: #f5f0e8;
    color: #5a3e10;
    border-color: #c4b49a;
  }

  /* ── LEADERBOARD PANEL ── */
  #leaderboard-panel {
    position: fixed;
    top: 0;
    right: -380px;
    width: 360px;
    max-width: 100vw;
    height: 100vh;
    background: #0f0f0f;
    border-left: 1px solid #2a5f7f;
    z-index: 99970;
    display: flex;
    flex-direction: column;
    box-shadow: -6px 0 24px rgba(0,0,0,0.7);
    transition: right 0.3s ease;
    overflow: hidden;
  }
  #leaderboard-panel.open { right: 0; }
  @media (max-width: 400px) { #leaderboard-panel { width: 100vw; } }
  #leaderboard-header {
    background: linear-gradient(135deg, #1a3f5f, #0f2840);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    border-bottom: 1px solid #2a5f7f;
  }
  #leaderboard-header h3 { margin:0; font-size:15px; color:#b89f37; font-weight:700; }
  #leaderboard-filters {
    display: flex;
    gap: 6px;
    padding: 10px 16px;
    border-bottom: 1px solid #1a1a1a;
    flex-shrink: 0;
  }
  .lb-filter-btn {
    background: none;
    border: 1px solid #2a2a2a;
    color: #666;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .lb-filter-btn.active { border-color: #b89f37; color: #b89f37; background: rgba(184,159,55,0.08); }
  .lb-filter-btn:hover:not(.active) { border-color: #444; color: #aaa; }
  #leaderboard-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px;
  }
  .lb-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    margin-bottom: 4px;
    transition: background 0.15s;
    cursor: default;
  }
  .lb-entry:hover { background: rgba(42,95,127,0.1); }
  .lb-rank {
    font-size: 12px;
    font-weight: 700;
    color: #555;
    width: 22px;
    text-align: right;
    flex-shrink: 0;
  }
  .lb-rank.top1 { color: #FFD700; font-size: 14px; }
  .lb-rank.top2 { color: #C0C0C0; font-size: 13px; }
  .lb-rank.top3 { color: #CD7F32; font-size: 13px; }
  .lb-name { font-size: 13px; color: #b89f37; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lb-flair { flex-shrink: 0; }
  .lb-score {
    font-size: 12px;
    color: #aaa;
    font-weight: 600;
    flex-shrink: 0;
    text-align: right;
    min-width: 48px;
  }
  .lb-score-detail { font-size: 9px; color: #555; margin-top: 1px; }
  #leaderboard-footer {
    padding: 8px 16px;
    border-top: 1px solid #1a1a1a;
    font-size: 10px;
    color: #444;
    flex-shrink: 0;
  }

  /* ── HIGHLIGHT BUTTON &amp; STYLE ── */
  .highlight-btn {
    background: none;
    border: none;
    color: #555;
    font-size: 11px;
    cursor: pointer;
    padding: 0 4px;
    font-family: inherit;
    transition: color 0.2s;
  }
  .highlight-btn:hover { color: #b89f37; }
  .highlight-btn.highlighted { color: #b89f37; }
  .comment-item.is-highlighted {
    border-left: 3px solid #b89f37 !important;
    background: rgba(184,159,55,0.05) !important;
  }
  .highlight-badge {
    font-size: 9px;
    color: #b89f37;
    font-weight: 700;
    margin-left: 6px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  /* ── REACTIONS ── */
  .reactions-bar { display:flex; gap:4px; flex-wrap:wrap; margin-top:4px; }
  .reactions-inline { display:inline-flex; gap:3px; align-items:center; margin:0 2px; }
  .reaction-btn {
    background: rgba(255,255,255,0.04);
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 2px 7px;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    transition: all 0.15s;
    color: #aaa;
    font-family: inherit;
    line-height: 1.4;
  }
  .reaction-btn:hover { border-color: #b89f37; background: rgba(184,159,55,0.08); }
  .reaction-btn.reacted { border-color: #b89f37; background: rgba(184,159,55,0.12); color: #b89f37; }
  .reaction-count { font-size: 11px; font-weight: 600; }
  .reaction-add-btn {
    background: none; border: 1px dashed #333; border-radius: 12px;
    padding: 2px 7px; font-size: 12px; cursor: pointer;
    color: #444; font-family: inherit; transition: all 0.15s;
  }
  .reaction-add-btn:hover { border-color: #666; color: #888; }
  .reaction-picker {
    position: absolute; z-index: 9000;
    background: #1a1a1a; border: 1px solid #2a5f7f;
    border-radius: 8px; padding: 6px 8px;
    display: flex; gap: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  }
  .reaction-picker-btn {
    background: none; border: none; font-size: 18px;
    cursor: pointer; padding: 2px 4px; border-radius: 4px;
    transition: background 0.15s;
  }
  .reaction-picker-btn:hover { background: rgba(255,255,255,0.1); }
  @keyframes reactionPulse {
    0%   { transform: scale(1); }
    45%  { transform: scale(1.3); }
    100% { transform: scale(1); }
  }
  .reaction-btn.pulsing {
    animation: reactionPulse 0.4s ease-out;
  }

  /* ── BIO ── */
  .pc-bio { font-size: 12px; color: #888; font-style: italic; margin: 4px 0 8px; line-height: 1.5; }
  .pc-bio-edit { width:100%; background:#111; border:1px solid #2a2a2a; color:#aaa; padding:5px 8px;
    border-radius:4px; font-size:11px; font-family:inherit; resize:vertical; min-height:48px;
    outline:none; margin-bottom:4px; }
  .pc-bio-edit:focus { border-color:#2a5f7f; }

  /* ── COMMENT FORMATTING ── */
  .comment-text strong, .reply-text strong { font-weight:700; color:inherit; }
  .comment-text em, .reply-text em { font-style:italic; }
  .comment-text .fmt-quote, .reply-text .fmt-quote {
    border-left: 2px solid #2a5f7f; padding-left: 8px; color: #777;
    margin: 4px 0; font-style: italic; display: block;
  }
  .comment-text .fmt-code, .reply-text .fmt-code {
    font-family: monospace; background: rgba(42,95,127,0.12);
    padding: 0 4px; border-radius: 3px; font-size: 11px; color: #7abde0;
  }

  /* ── REPLY PRIORITY (Member+) ── */
  .reply-item.reply-priority {
    border-left: 2px solid rgba(184,159,55,0.35) !important;
  }

  /* ── STREAK BADGE ── */
  .streak-badge {
    font-size: 10px; color: #FF6B35; font-weight: 700;
    margin-left: 4px; vertical-align: middle;
    title: 'Active streak';
  }

  /* ── SPOTLIGHT BADGE ── */
  .spotlight-badge {
    font-size: 10px; font-weight: 700; margin-left: 4px;
    background: linear-gradient(135deg, #b89f37, #FF6B35);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ── SIGN-IN BANNER ── */
  #signin-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99960;
    background: linear-gradient(135deg, #1a3f5f, #0f2840);
    border-bottom: 1px solid #2a5f7f;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.5);
    transform: translateY(-100%);
    transition: transform 0.35s ease;
  }
  #signin-banner.visible { transform: translateY(0); }
  #signin-banner-text {
    font-size: 12px;
    color: #aaa;
    flex: 1;
    min-width: 0;
  }
  #signin-banner-text strong { color: #b89f37; }
  #signin-banner-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
  #signin-banner-btn {
    background: linear-gradient(135deg, #FF6B35, #b89f37);
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
  }
  #signin-banner-btn:hover { opacity: 0.88; }
  #signin-banner-dismiss {
    background: none;
    border: none;
    color: #444;
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.2s;
  }
  #signin-banner-dismiss:hover { color: #888; }
  /* Nudge page content down when banner is visible */
  body.signin-banner-open { padding-top: 46px !important; transition: padding-top 0.35s ease; }

  /* ── TYPING INDICATOR ── */
  .typing-indicator {
    min-height: 18px;
    font-size: 11px;
    color: #555;
    font-style: italic;
    margin-top: 4px;
    transition: opacity 0.3s;
  }
  .typing-dot {
    display: inline-block;
    animation: typingBounce 1.2s infinite;
    margin: 0 1px;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
    40%            { opacity: 1;   transform: translateY(-3px); }
  }

  /* ── WELCOME MODAL ── */
  #welcome-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    z-index: 99998;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  #welcome-modal-box {
    background: #111;
    border: 1px solid #2a5f7f;
    border-radius: 10px;
    padding: 24px 24px 28px;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    text-align: center;
  }
  #welcome-modal-box .welcome-icon {
    font-size: 36px;
    margin-bottom: 12px;
  }
  #welcome-modal-box h3 {
    color: #b89f37;
    font-size: 18px;
    margin: 0 0 10px;
  }
  #welcome-modal-box p {
    color: #888;
    font-size: 13px;
    line-height: 1.7;
    margin: 0 0 24px;
  }
  #welcome-modal-box p strong {
    color: #b89f37;
  }
  .welcome-modal-btns {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .welcome-signin-btn {
    background: linear-gradient(135deg, #FF6B35, #b89f37);
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .welcome-signin-btn:hover { opacity: 0.88; }
  .welcome-dismiss-btn {
    background: none;
    border: 1px solid #2a2a2a;
    color: #555;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .welcome-dismiss-btn:hover { border-color: #555; color: #888; }

  /* ── USERNAME MODAL ── */
  #username-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  #username-modal-box {
    background: #111;
    border: 1px solid #2a5f7f;
    border-radius: 10px;
    padding: 28px 24px;
    max-width: 420px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
  }
  #username-modal-box h3 {
    color: #b89f37;
    font-size: 16px;
    margin: 0 0 8px;
  }
  #username-modal-box p {
    color: #888;
    font-size: 12px;
    margin: 0 0 16px;
    line-height: 1.6;
  }
  #username-modal-box .default-name {
    color: #FF6B35;
    font-weight: 700;
  }
  #username-input {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    margin-bottom: 8px;
    box-sizing: border-box;
  }
  #username-input:focus { border-color: #FF6B35; }
  #username-error {
    color: #FF6B35;
    font-size: 11px;
    min-height: 16px;
    margin-bottom: 12px;
  }
  .username-modal-btns {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  /* ── @MENTIONS ── */
  .mention { color: #FF6B35; font-weight: 700; cursor: pointer; }
  .mention:hover { text-decoration: underline; }
  .mention-dropdown {
    position: absolute;
    background: #111;
    border: 1px solid #2a5f7f;
    border-radius: 6px;
    z-index: 1000;
    max-height: 180px;
    overflow-y: auto;
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  .mention-item {
    padding: 8px 12px;
    cursor: pointer;
    color: #b89f37;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .mention-item:hover { background: #1a1a1a; color: #FF6B35; }

  /* ── EDIT / DELETE ── */
  .edit-textarea {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #FF6B35;
    color: #b89f37;
    padding: 10px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 13px;
    min-height: 80px;
    resize: vertical;
    display: block;
    width: 100%;
    margin-top: 8px;
  }
  .edit-timer { color: #FF6B35; font-size: 11px; margin-top: 4px; }
  .deleted-comment { color: #444; font-style: italic; font-size: 13px; margin: 8px 0; }

  .continue-thread-btn {
    display: block;
    background: none;
    border: 1px solid #2a5f7f;
    color: #2a5f7f;
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 6px;
    transition: all 0.2s;
  }
  .continue-thread-btn:hover { border-color: #FF6B35; color: #FF6B35; }

  .thread-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #1e1e1e;
  }
  .thread-nav-btn {
    background: none;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .thread-nav-btn:hover { border-color: #FF6B35; color: #FF6B35; }

  .reply-pagination {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .reply-page-btn {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    color: #b89f37;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .reply-page-btn:hover:not(:disabled) {
    background: #FF6B35;
    color: white;
    border-color: #FF6B35;
  }

  .reply-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .reply-page-indicator {
    color: #666;
    font-size: 11px;
  }
  /* ── FLAIR BASE ── */
  .flair { display:inline-flex; align-items:baseline; gap:3px; font-weight:700; vertical-align:baseline; margin-left:4px; line-height:1; }
  /* ── FLAIR TIER SIZES (gradient CSS injected by JS to survive Blogger) ── */
  .flair-newcomer .flair-symbol { font-size:11px; vertical-align:middle; color:#4a72c4; }
  .flair-newcomer .flair-text   { color:#4a72c4; font-size:13px; font-style:italic; }
  .flair-supporter .flair-symbol { vertical-align:baseline; color:#c0c0c0; font-size:13px; }
  .flair-supporter .flair-text   { color:#c0c0c0; font-size:14px; }
  .flair-subscriber .flair-symbol { vertical-align:baseline; font-size:19px; filter:drop-shadow(0 0 4px rgba(45,122,74,0.6)); }
  .flair-subscriber .flair-text   { font-size:14px; }
  .flair-member .flair-symbol     { vertical-align:baseline; font-size:14px; filter:drop-shadow(0 0 4px rgba(201,168,76,0.5)); }
  .flair-member .flair-text       { font-size:14px; }
  .flair-collector .flair-symbol  { vertical-align:baseline; font-size:16px; filter:drop-shadow(0 0 5px rgba(168,85,214,0.6)); }
  .flair-collector .flair-text    { font-size:14px; }
  .flair-artist .flair-symbol     { font-size:22px; vertical-align:-7px; line-height:1; filter:drop-shadow(0 0 6px rgba(240,64,48,0.5)); }
  .flair-artist .flair-text       { font-size:14px; vertical-align:-7px; }
  .flair-writer .flair-symbol     { vertical-align:baseline; font-size:15px; filter:drop-shadow(0 0 5px rgba(32,178,170,0.5)); }
  .flair-writer .flair-text       { font-size:14px; }
  .flair-input-section { margin:0 0 18px; padding:12px 16px; background:#0a0a0a; border:1px solid #1e1e1e; border-radius:6px; display:flex; align-items:center; flex-wrap:wrap; gap:10px; }
  .flair-input-section label { color:#666; font-size:12px; flex-shrink:0; }
  .flair-code-input { background:#111; border:1px solid #2a2a2a; color:#b89f37; padding:6px 10px; border-radius:4px; font-size:12px; width:160px; outline:none; }
  .flair-code-input:focus { border-color:#FF6B35; }
  .flair-code-btn { background:linear-gradient(135deg,#FF6B35,#b89f37); color:white; border:none; padding:6px 14px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer; }
  .flair-code-btn:hover { opacity:0.88; }
  .flair-status { font-size:12px; color:#aaa; }
  .flair-admin-panel { margin:0 0 18px; padding:14px 16px; background:#0a0a0a; border:1px solid #2a5f7f; border-radius:6px; }
  .flair-admin-panel h4 { color:#b89f37; font-size:13px; margin:0 0 10px; }
  .flair-admin-row { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start; }
  .flair-admin-input { background:#111; border:1px solid #2a2a2a; color:#b89f37; padding:6px 10px; border-radius:4px; font-size:12px; width:200px; outline:none; }
  .flair-admin-input:focus { border-color:#FF6B35; }
  .flair-admin-select { background:#111; border:1px solid #2a2a2a; color:#b89f37; padding:6px 10px; border-radius:4px; font-size:12px; outline:none; }
</style>

<!-- Rank fonts from Google Fonts -->
<link rel='preconnect' href='https://fonts.googleapis.com' />
<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin='anonymous' />
<link href='https://fonts.googleapis.com/css2?family=Abril+Fatface&amp;family=Alfa+Slab+One&amp;family=Audiowide&amp;family=Black+Ops+One&amp;family=Boogaloo&amp;family=Bungee+Shade&amp;family=Butcherman&amp;family=Caveat&amp;family=Cinzel&amp;family=Cinzel+Decorative&amp;family=Creepster&amp;family=Dancing+Script&amp;family=Exo+2&amp;family=IM+Fell+English&amp;family=Libre+Baskerville&amp;family=Lobster&amp;family=Metal+Mania&amp;family=Monoton&amp;family=Orbitron&amp;family=Oswald&amp;family=Pacifico&amp;family=Permanent+Marker&amp;family=Playfair+Display&amp;family=Righteous&amp;family=Rubik+Glitch&amp;family=Rye&amp;family=Titan+One&amp;family=Uncial+Antiqua&amp;family=Zen+Tokyo+Zoo&amp;display=swap' rel='stylesheet' />

<div class='custom-comments-section' id='airdrift-comments'>
  <div class='comments-container'>
    <div class='comments-header'>
      <div style='display:flex;align-items:center;gap:8px;'>
        <h2 style='margin:0;'>💬 Comments</h2>
        <span id='viewer-count'></span>
      </div>
      <div style='display:flex;align-items:center;gap:10px;flex-wrap:wrap;'>
        <div id='signout-btn' style='display:none;flex-wrap:wrap;gap:7px;align-items:center;'>
          <button id='header-profile-btn' onclick='openProfileIconCard(event)'>Profile</button>
          <button class='action-btn' onclick='signOut()' style='color:#FF6B35;border:1px solid #FF6B35;border-radius:4px;padding:5px 10px;font-size:11px;'>Sign Out</button>
          <button id='mod-dashboard-btn' class='action-btn' onclick='openDashboard()' style='color:#2a5f7f;border:1px solid #2a5f7f;border-radius:4px;padding:5px 10px;font-size:11px;display:none;'>&#9881;&#65039; Dashboard</button>
          <button id='notif-view-btn' class='action-btn' onclick='showNotifBell()' style='color:#b89f37;border:1px solid #b89f37;border-radius:4px;padding:5px 10px;font-size:11px;display:none;'>&#x1F6CE;&#xFE0F; Notifications</button>
          <button id='subscribe-btn' class='action-btn' onclick='toggleSubscribeDiscussion()' style='display:none;font-size:11px;padding:5px 10px;border-radius:4px;border:1px solid #2a5f7f;color:#2a5f7f;'>&#x1F514; Subscribe</button>
          <button id='open-dm-btn' class='action-btn' onclick='reopenDmWindow()' style='display:none;font-size:11px;padding:5px 10px;border-radius:4px;border:1px solid #b89f37;color:#b89f37;'>&#x1F4AC; Chat</button>
          <button class='action-btn' onclick='openLeaderboard()' style='font-size:11px;padding:5px 10px;border-radius:4px;border:1px solid #b89f37;color:#b89f37;'>&#x1F3C6; Leaderboard</button>
        </div>
        <div class='search-and-filter'>
        <input id='search-input' onkeyup='searchComments(this.value)' placeholder='Search comments...' type='text'/>
        <div class='comments-filter'>
          <button class='filter-btn active' onclick='filterComments(&apos;all&apos;, event)'>All</button>
          <button class='filter-btn' onclick='filterComments(&apos;hot&apos;, event)'>🔥 Hot</button>
          <button class='filter-btn' onclick='filterComments(&apos;newest&apos;, event)'>&#10024; Newest</button>
        </div>
        </div>
      </div>
    </div>

    <!-- Auth Section: shown when logged out -->
    <div id='auth-section'>
      <div class='comment-form auth-prompt'>
        <p>🔑 Sign in to join the conversation</p>
        <div class='auth-buttons'>
          <button class='submit-btn' id='google-signin-btn' onclick='signInWithGoogle()'>🌐 Sign in with Google</button>
        </div>
      </div>
    </div>

    <!-- Comment Form: shown when logged in -->
    <div id='user-info-section' style='display:none;'>
      <div class='comment-form'>
        <textarea class='form-textarea' id='comment-input' maxlength='5000' placeholder='Share your thoughts... (use @ to mention)'></textarea>
        <div class='char-count'><span id='char-count'>0</span>/5000</div>
        <div class='form-buttons'>
          <button class='submit-btn' onclick='submitComment()'>Post Comment</button>
        </div>
        <div class='typing-indicator' id='typing-main'></div>
      </div>
    </div>

    <!-- Moderator Dashboard (moderator only) -->


    <div class='flair-input-section' id='flair-input-section' style='display:none;'>
      <label>&#127894; Enter or Update Flair:</label>
      <input class='flair-code-input' id='flair-code-input' type='text' placeholder='Enter your code...'/>
      <button class='flair-code-btn' onclick='submitFlairCode()'>Apply</button>
      <span class='flair-status' id='flair-status'></span>
    </div>

    <!-- Unified Admin Panel -->
    <div class='flair-admin-panel' id='flair-admin-panel' style='display:none;'>
      <h4>&#9881;&#65039; Admin</h4>
      <div class='flair-admin-row' style='align-items:flex-start;gap:8px;flex-wrap:wrap;'>

        <!-- Shared textarea -->
        <textarea class='flair-admin-input' id='flair-admin-email'
          style='height:60px;resize:vertical;font-family:inherit;width:100%;box-sizing:border-box;'
          placeholder='Username, email, or arguments...'></textarea>

        <!-- Command selector row -->
        <div style='display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:100%;'>
          <select class='flair-admin-select' id='cmd-select' onchange='cmdSelectChange()'>
            <option value=''>Commands</option>
            <optgroup label='Flair'>
              <option value='AssignFlair'>Assign Flair</option>
              <option value='FlairCode'      data-args='Flair, Code'>Flair Code</option>
              <option value='FlairColor'     data-args='Flair, #Color, Hover Text (optional)'>Flair Color</option>
              <option value='FlairTime'      data-args='Username, Months, Days'>Flair Time</option>
            </optgroup>
            <optgroup label='Moderators'>
              <option value='AssignMod'      data-args='Username'>Assign Mod</option>
              <option value='RemoveMod'      data-args='Username'>Remove Mod</option>
            </optgroup>
            <optgroup label='Users'>
              <option value='BanUser'        data-args='Username'>Ban User</option>
              <option value='ReinstateUser'  data-args='Username'>Reinstate User</option>
              <option value='WarnUser'       data-args='Username'>Warn User</option>
              <option value='Changeusername' data-args='Old Username, New Username'>Change Username</option>
              <option value='DMuser'         data-args='Username'>DM User</option>
            </optgroup>
            <optgroup label='Data'>
              <option value='AdjustRating'   data-args='Username, Points'>Adjust Rating</option>
              <option value='ViewUsers'      data-args='Username (optional, or leave blank)'>View Users</option>
              <option value='BannedUsers'    data-args='Username (optional, or leave blank)'>Banned Users</option>
              <option value='RestrictPage'   data-args='URL Slug, Flair1, Flair2, ...'>Restrict Page</option>
              <option value='UnrestrictPage' data-args='URL Slug'>Unrestrict Page</option>
            </optgroup>
          </select>

          <!-- Flair-specific dropdowns (only for AssignFlair) -->
          <select class='flair-admin-select' id='flair-admin-tier' onchange='toggleTypeDropdown()' style='display:none;'>
            <option value=''>-- Tier --</option>
            <option value='newcomer'>&#xAA5C; Drifter</option>
            <option value='supporter'>&#9733; Supporter</option>
            <option value='subscriber'>✵ Subscriber</option>
            <option value='member'>&#9670; Member</option>
            <option value='collector'>&#10070; Collector</option>
            <option value='artist'>&#10022; Featured Artist</option>
            <option value='writer'>&#9998; Featured Writer</option>
            <option value='none'>Remove flair</option>
          </select>
          <select class='flair-admin-select' id='flair-admin-scope' style='display:none;'>
            <option value='all'>All pages</option>
            <option value='page'>This page only</option>
          </select>
          <select class='flair-admin-select' id='flair-admin-type' style='display:none;'>
            <option value=''>-- Page type --</option>
            <option value='article'>Article</option>
            <option value='interview'>Interview</option>
            <option value='none'>Remove type</option>
          </select>

          <!-- Arg fields for non-flair commands -->
          <div id='cmd-args-wrap' style='display:none;'>
            <div id='cmd-args-fields' style='display:flex;gap:6px;flex-wrap:wrap;'></div>
          </div>

          <!-- Submit / Cancel -->
          <button class='flair-code-btn' id='cmd-submit-btn' onclick='cmdSubmit()' style='display:none;'>Submit</button>
          <button class='cancel-btn' id='cmd-cancel-btn' onclick='cmdCancel()' style='display:none;'>Cancel</button>
          <span class='flair-status' id='flair-admin-status'></span>
          <span class='flair-status' id='cmd-status'></span>
        </div>
      </div>
    </div>



    <div id='search-reply-results'></div>
    <div id='comments-list'></div>



  </div>
</div>

<!-- Sticky Comment Box -->
<div id='sticky-comment-box'>
  <textarea id='sticky-comment-input' placeholder='Write a comment...' maxlength='5000'></textarea>
  <div class='typing-indicator' id='typing-sticky'></div>
  <div class='sticky-actions'>
    <button id='sticky-submit-btn' onclick='submitStickyComment()'>Post</button>
  </div>
</div>

<!-- Notification Bell -->
<div id='notif-bell'>
  <button id='notif-bell-btn' onclick='toggleNotifPanel()'>&#x1F6CE;&#xFE0F;<span id='notif-count'></span></button>
</div>
<div id='notif-panel'>
  <div class='notif-header'>
    <span>&#x1F6CE;&#xFE0F; Notifications</span>
    <div style='display:flex;gap:10px;'>
      <button class='notif-clear-btn' onclick='dismissNotifBell()'>Dismiss</button>
      <button class='notif-clear-btn' onclick='clearNotifications()'>Mark all read</button>
      <button class='notif-clear-btn' style='color:#ff4444;' onclick='clearAllNotifications()'>Clear all</button>
    </div>
  </div>
  <div id='notif-list'></div>
</div>

<!-- Moderator Dashboard -->
<div id='mod-dashboard'>
  <div id='mod-dashboard-box'>
    <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;'>
      <h3>&#9881;&#65039; Moderator Dashboard</h3>
      <button class='cancel-btn' onclick='dismissModDashboard()'>&#10005; Close</button>
    </div>
    <div class='mod-section'>
      <h4>&#9888;&#65039; Pending Approval</h4>
      <div id='mod-pending-list'></div>
    </div>
    <div class='mod-section'>
      <h4>&#128680; Reported Comments</h4>
      <div id='mod-reported-list'></div>
    </div>
    <div class='mod-section'>
      <h4>&#128308; Flagged Users (3+ strikes)</h4>
      <div id='mod-flagged-list'></div>
    </div>

    <div class='mod-section' id='mod-report-abuse-section' style='display:none;'>
      <h4>&#128204; Report Activity (3+ reports)</h4>
      <div id='mod-report-abuse-list'></div>
    </div>
    <div class='mod-section' id='mod-flagged-owner-section' style='display:none;border-left:3px solid #b89f37;padding-left:10px;'>
      <h5 style='color:#b89f37;margin-bottom:8px;'>&#128681; Flagged for Your Review</h5>
      <div id='mod-flagged-owner-list'></div>
    </div>
    <div class='mod-section' style='border-top:1px solid #1e1e1e;padding-top:14px;'>
      <h4>&#x1F4AC; Chats</h4>
      <div id='mod-chats-list'></div>
    </div>
    <div class='mod-section' style='border-top:1px solid #1e1e1e;padding-top:14px;'>
      <h4>&#9881;&#65039; Notification Settings</h4>
      <div style='display:flex;justify-content:space-between;align-items:center;padding:4px 0;'>
        <div>
          <div style='font-size:12px;color:#aaa;'>All new top-level comments</div>
          <div style='font-size:10px;color:#555;'>Toggle off if volume is overwhelming</div>
        </div>
        <label class='pc-toggle'>
          <input type='checkbox' id='dash-toplevel-notif-toggle' onchange='toggleTopLevelNotifs(this)' />
          <span class='slider'></span>
        </label>
      </div>
    </div>

    <div class='mod-section' style='border-top:1px solid #1e1e1e;padding-top:14px;'>
      <div id='mod-checklist-section'></div>
    </div>

  </div>
</div>

<!-- Leaderboard Panel -->
<div id='leaderboard-panel'>
  <div id='leaderboard-header'>
    <h3>&#x1F3C6; Leaderboard</h3>
    <button onclick='closeLeaderboard()' style='background:none;border:none;color:#555;cursor:pointer;font-size:18px;line-height:1;'>&#x2715;</button>
  </div>
  <div id='leaderboard-filters'>
    <button class='lb-filter-btn active' data-period='all'    onclick='lbSetPeriod(this)'>All Time</button>
    <button class='lb-filter-btn'        data-period='year'   onclick='lbSetPeriod(this)'>12 Months</button>
    <button class='lb-filter-btn'        data-period='month'  onclick='lbSetPeriod(this)'>30 Days</button>
  </div>
  <div id='leaderboard-list'></div>
  <div id='leaderboard-footer'>Scoring: votes + 1pt per reply received + 5pts per highlight</div>
</div>

<!-- DM Window -->
<div id='dm-window'>
  <div id='dm-header'>
    <div id='dm-header-title'>
      <span>&#x1F4AC;</span>
      <span id='dm-title'>Direct Message</span>
      <span id='dm-subtitle' style='font-size:10px;color:#555;font-weight:400;'></span>
    </div>
    <div id='dm-header-actions'>
      <button id='dm-change-username-btn' class='dm-btn-sm' onclick='dmChangeUsername()' style='display:none;border-color:#b89f37;color:#b89f37;'>Rename</button>
      <button id='dm-end-btn' class='dm-btn-sm danger' onclick='endDmChat()' style='display:none;'>End Chat</button>
      <button onclick='closeDmWindow()' style='background:none;border:none;color:#555;cursor:pointer;font-size:16px;line-height:1;padding:0 2px;'>&#x2715;</button>
    </div>
  </div>
  <div id='dm-status-bar'></div>
  <div id='dm-messages'></div>
  <div id='dm-input-row'>
    <input id='dm-input' type='text' placeholder='Message...' maxlength='500' onkeydown='if(event.key==="Enter")sendDmMessage()' />
    <button id='dm-send-btn' onclick='sendDmMessage()'>Send</button>
  </div>
</div>

<!-- ViewUsers Modal -->
<div id='viewusers-modal' onclick='if(event.target===this)closeViewUsers()'>
  <div id='viewusers-box'>
    <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;'>
      <h3 style='margin:0;'>&#x1F465; All Users</h3>
      <div style='display:flex;gap:8px;'>
        <button onclick='downloadViewUsersCSV()' style='background:none;border:1px solid #2a5f7f;color:#2a5f7f;padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer;'>&#11015;&#65039; CSV</button>
        <button onclick='closeViewUsers()' style='background:none;border:none;color:#555;cursor:pointer;font-size:16px;'>&#x2715;</button>
      </div>
    </div>
    <div id='viewusers-controls' style='margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;'></div>
    <div style='overflow-x:auto;'><table id='viewusers-table'><thead id='viewusers-head'></thead><tbody id='viewusers-body'></tbody></table></div>
  </div>
</div>

<!-- User Comments Modal -->
<div id='user-comments-modal'>
  <div id='user-comments-drag-handle' onmousedown='initDragUC(event)'>
    <h4 id='user-comments-title' style='margin:0;color:#b89f37;font-size:13px;'>Comments</h4>
    <button onclick='closeUserComments()' style='background:none;border:none;color:#555;cursor:pointer;font-size:16px;line-height:1;'>&#x2715;</button>
  </div>
  <div id='user-comments-box'>
    <div id='user-comments-list'></div>
  </div>
</div>

<!-- Signed-in Toast -->
<div id='signin-toast'></div>

<!-- Profile Card -->
<div id='profile-card'></div>

<!-- Welcome Modal -->
<!-- Sign-in Banner -->
<div id='signin-banner'>
  <div id='signin-banner-text'>
    <strong>Join the conversation.</strong> Sign in to comment, react, and connect with the community.
  </div>
  <div id='signin-banner-actions'>
    <button id='signin-banner-btn' onclick='signInWithGoogle()'>Sign In</button>
    <button id='signin-banner-dismiss' onclick='dismissSignInBanner()' title='Dismiss'>&#x2715;</button>
  </div>
</div>

<div id='welcome-modal' style='display:none;'>
  <div id='welcome-modal-box'>
    <img src='https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhdDMl4zY_rJiw81rJas4DPfvOFINkX4Gjy5yWM8FcNC_Zwb27QCPDNDcdWlR8DpKpG00eFUu4ZjL-z8hh3OzxEwEVUSAefl1VHgpaBxIGTnCUsyrBtOFWO6f2cyHMW4o0maiJekc5ckj-2m5sleRzspPzE_w7uXPYVcJ1u2U4xyoANbNATOCQaLZrLFO2S/s800/AirdriftSignals%20Logo%20Flag%20GIF.gif'
         id='welcome-flag-img'
         alt='AirdriftSignals Flag'
         style='width:100%;max-width:340px;border-radius:8px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;'/>
    <h3>Welcome to Airdrift<em>Signals</em> Music Magazine &#x1F3B6;&#x1F3A7;</h3>
    <p>
      <strong>Sign in with Google</strong> to join the conversation.<br/>
      Post comments &amp; replies, receive <strong>notifications</strong> when
      someone replies to you, vote on comments, and more.
    </p>
    <div class='welcome-modal-btns'>
      <button class='welcome-signin-btn' onclick='welcomeSignIn()'>&#x1F30E; Sign in with Google</button>
      <button class='welcome-dismiss-btn' onclick='dismissWelcomeModal()'>Maybe later</button>
    </div>
  </div>
</div>

<!-- Username Modal -->
<div id='username-modal' style='display:none;'>
  <div id='username-modal-box'>
    <h3>Choose your username</h3>
    <p>You can only set this once. If you dismiss this, your name from your Google account will be used: <span class='default-name' id='modal-default-name'></span></p>
    <input id='username-input' type='text' maxlength='40' placeholder='Enter a username...'/>
    <div id='username-error'></div>
    <div class='username-modal-btns'>
      <button class='cancel-btn' onclick='dismissUsernameModal()'>Use my Google name</button>
      <button class='submit-btn' onclick='confirmUsername()'>Set Username</button>
    </div>
  </div>
</div>

<!-- Mention Dropdown -->
<div id='mention-dropdown' class='mention-dropdown' style='display:none;'></div>

<!-- Google Sign-In Library -->
<script async='async' defer='defer' src='https://accounts.google.com/gsi/client'></script>

<script src='https://cdn.jsdelivr.net/gh/airdriftsignals/CommentsPlatform/airdriftcomments.js' type='text/javascript'></script>
