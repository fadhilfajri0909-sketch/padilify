<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Padilify</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',system-ui,sans-serif; -webkit-tap-highlight-color:transparent; }
  body { background:#0a0a0a; color:#fff; height:100vh; overflow:hidden; display:flex; flex-direction:column; max-width:500px; margin:0 auto; position:relative; }

  .app-header { position:relative; padding:28px 20px 16px; background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 60%, #0a0a0a 100%); overflow:hidden; flex-shrink:0; }
  .app-header::before { content:''; position:absolute; inset:0; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200'%3E%3Ctext x='50%25' y='60%25' font-size='120' font-family='Impact' fill='%23ffffff' opacity='0.05' text-anchor='middle' font-style='italic'%3EPADIL%3C/text%3E%3C/svg%3E"); background-size:cover; pointer-events:none; }
  .header-top { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:2; margin-bottom:18px; }
  .brand { font-size:32px; font-weight:900; letter-spacing:-1px; color:#fff; }
  .brand .dot { color:#1db954; }
  .header-btns { display:flex; gap:10px; }
  .icon-btn { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:15px; display:flex; align-items:center; justify-content:center; cursor:pointer; }

  .chips { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; position:relative; z-index:2; }
  .chips::-webkit-scrollbar { display:none; }
  .chip { padding:9px 18px; border-radius:20px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); font-size:13px; font-weight:600; white-space:nowrap; cursor:pointer; display:flex; align-items:center; gap:6px; color:#e0e0e0; }
  .chip.active { background:#fff; color:#000; border-color:#fff; }

  .scroll-area { flex:1; overflow-y:auto; padding-bottom:180px; }
  .scroll-area::-webkit-scrollbar { display:none; }

  .section { padding:20px 20px 0; }
  .section-title { display:flex; align-items:center; gap:8px; font-size:19px; font-weight:800; margin-bottom:14px; color:#fff; }
  .section-title i { color:#f59e0b; font-size:17px; }
  .section-title.purple i { color:#a855f7; }

  .quick-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .quick-card { display:flex; align-items:center; gap:10px; background:#1a1a1a; border-radius:10px; padding:8px; cursor:pointer; position:relative; overflow:hidden; }
  .quick-card img { width:52px; height:52px; border-radius:6px; object-fit:cover; flex-shrink:0; background:#333; }
  .quick-info { flex:1; min-width:0; }
  .quick-title { font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .quick-artist { font-size:11px; color:#999; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .quick-play { position:absolute; right:10px; top:50%; transform:translateY(-50%); width:32px; height:32px; border-radius:50%; background:#fff; color:#000; display:none; align-items:center; justify-content:center; font-size:12px; }
  .quick-card.playing .quick-play { display:flex; }

  .empty-state { text-align:center; padding:60px 30px; background:#141414; border-radius:20px; border:1px solid #222; }
  .empty-state .icon-circle { width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:32px; color:#666; }
  .empty-state h3 { font-size:17px; font-weight:800; margin-bottom:10px; }
  .empty-state p { font-size:13px; color:#888; line-height:1.5; }
  .empty-state.pink .icon-circle { background:rgba(236,72,153,0.1); color:#ec4899; }

  .search-input-wrap { display:flex; gap:8px; background:#1a1a1a; border-radius:14px; padding:6px; margin-bottom:20px; border:1px solid #2a2a2a; }
  .search-input-wrap input { flex:1; background:transparent; border:none; outline:none; padding:10px 14px; color:#fff; font-size:14px; }
  .search-input-wrap input::placeholder { color:#666; }
  .search-input-wrap button { padding:0 20px; border-radius:10px; background:#fff; color:#000; border:none; font-weight:700; font-size:13px; cursor:pointer; }

  .search-results { display:flex; flex-direction:column; gap:4px; }
  .result-item { display:flex; align-items:center; gap:12px; padding:10px; border-radius:10px; cursor:pointer; }
  .result-item.active { background:#1a1a1a; }
  .result-item.active .result-title { color:#1db954; }
  .result-item img { width:52px; height:52px; border-radius:6px; object-fit:cover; flex-shrink:0; background:#222; }
  .result-item .info { flex:1; min-width:0; }
  .result-item .result-title { font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .result-item .result-artist { font-size:11px; color:#999; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .result-item .result-dur { font-size:11px; color:#888; }

  .releases-grid { display:flex; gap:14px; overflow-x:auto; padding-bottom:8px; margin:0 -20px; padding-left:20px; padding-right:20px; }
  .releases-grid::-webkit-scrollbar { display:none; }
  .release-card { flex-shrink:0; width:150px; cursor:pointer; }
  .release-card .cover { width:150px; height:150px; border-radius:12px; overflow:hidden; position:relative; background:#222; margin-bottom:10px; }
  .release-card .cover img { width:100%; height:100%; object-fit:cover; }
  .release-card .cover .play-float { position:absolute; bottom:8px; right:8px; width:38px; height:38px; border-radius:50%; background:rgba(0,0,0,0.7); color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; }
  .release-card .name { font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .release-card .sub { font-size:11px; color:#999; margin-top:2px; }

  .profile-hero { text-align:center; padding:20px 0 30px; }
  .profile-avatar { width:110px; height:110px; border-radius:50%; background:linear-gradient(135deg,#1db954,#0a3d1f); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:44px; color:#fff; font-weight:900; border:3px solid #1db954; }
  .profile-hero h2 { font-size:24px; font-weight:900; margin-bottom:6px; }
  .profile-hero h2 .accent { color:#1db954; }
  .profile-hero p { font-size:13px; color:#999; }

  .info-card { background:#1a1a1a; border-radius:16px; padding:18px; margin-bottom:14px; border:1px solid #242424; }
  .info-card .card-head { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:800; color:#ec4899; letter-spacing:1px; margin-bottom:14px; }
  .info-card .card-head.purple { color:#a855f7; }
  .info-card .card-head.green { color:#1db954; }
  .info-row { display:flex; justify-content:space-between; padding:10px 0; font-size:13px; border-bottom:1px solid #242424; }
  .info-row:last-child { border-bottom:none; }
  .info-row .label { color:#999; }
  .info-row .value { font-weight:700; }
  .info-row .value.green { color:#1db954; }

  .bottom-nav { position:fixed; bottom:0; left:0; right:0; max-width:500px; margin:0 auto; background:#0a0a0a; border-top:1px solid #1a1a1a; display:flex; justify-content:space-around; padding:8px 4px 12px; z-index:100; }
  .nav-item { display:flex; flex-direction:column; align-items:center; gap:3px; padding:6px 10px; color:#666; cursor:pointer; border-radius:12px; font-size:10px; font-weight:600; flex:1; text-decoration:none; }
  .nav-item i { font-size:18px; pointer-events:none; }
  .nav-item span { pointer-events:none; }
  .nav-item.active { color:#fff; background:rgba(255,255,255,0.08); }

  .mini-player { position:fixed; bottom:70px; left:12px; right:12px; max-width:476px; margin:0 auto; background:#1a1a1a; border-radius:14px; padding:10px 12px; display:none; align-items:center; gap:12px; z-index:101; border:1px solid #2a2a2a; cursor:pointer; }
  .mini-player.show { display:flex; }
  .mini-player .cover { width:44px; height:44px; border-radius:8px; background:#8b6f47; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; overflow:hidden; }
  .mini-player .cover img { width:100%; height:100%; object-fit:cover; }
  .mini-player .info { flex:1; min-width:0; }
  .mini-player .title { font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mini-player .artist { font-size:11px; color:#999; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mini-player .btn-round { width:36px; height:36px; border-radius:50%; background:transparent; border:none; color:#fff; font-size:14px; cursor:pointer; }
  .mini-player .play-btn { width:38px; height:38px; background:#fff; color:#000; border-radius:50%; border:none; font-size:13px; cursor:pointer; flex-shrink:0; }

  .full-player { position:fixed; inset:0; max-width:500px; margin:0 auto; background:#1a1a1a; z-index:200; display:flex; flex-direction:column; transform:translateY(100%); transition:transform 0.35s; overflow:hidden; }
  .full-player.open { transform:translateY(0); }
  .fp-bg { position:absolute; inset:0; background-size:cover; background-position:center; filter:blur(60px) saturate(1.5); transform:scale(1.3); opacity:0.5; z-index:0; }
  .fp-bg::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%); }
  .fp-content { position:relative; z-index:1; display:flex; flex-direction:column; height:100%; padding:16px 24px 24px; overflow-y:auto; }
  .fp-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  .fp-top .icon-btn { background:transparent; border:none; font-size:20px; }
  .fp-label { text-align:center; flex:1; }
  .fp-label .small { font-size:10px; letter-spacing:2px; color:#aaa; text-transform:uppercase; margin-bottom:3px; }
  .fp-label .artist-line { font-size:13px; font-weight:600; }
  .fp-cover-wrap { display:flex; justify-content:center; margin-bottom:24px; }
  .fp-cover { width:280px; height:280px; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.7); background:#8b6f47; display:flex; align-items:center; justify-content:center; font-size:80px; color:rgba(255,255,255,0.15); }
  .fp-cover img { width:100%; height:100%; object-fit:cover; }
  .fp-title-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
  .fp-title-info { flex:1; min-width:0; }
  .fp-title { font-size:20px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .fp-artist { font-size:13px; color:#aaa; margin-top:3px; }
  .fp-actions { display:flex; gap:10px; }
  .fp-actions .icon-btn { width:42px; height:42px; }
  .fp-time { display:flex; justify-content:space-between; font-size:11px; color:#999; margin-bottom:6px; }
  .fp-progress { height:5px; background:rgba(255,255,255,0.15); border-radius:5px; margin-bottom:16px; cursor:pointer; position:relative; }
  .fp-progress-fill { height:100%; width:0%; background:#fff; border-radius:5px; position:relative; }
  .fp-progress-fill::after { content:''; position:absolute; right:-7px; top:50%; transform:translateY(-50%); width:14px; height:14px; border-radius:50%; background:#fff; opacity:0; }
  .fp-progress:hover .fp-progress-fill::after { opacity:1; }
  .fp-volume { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
  .fp-volume i { color:#ccc; font-size:15px; }
  .fp-volume .vol-bar { flex:1; height:4px; background:rgba(255,255,255,0.15); border-radius:4px; cursor:pointer; }
  .fp-volume .vol-fill { height:100%; width:100%; background:#fff; border-radius:4px; }
  .fp-volume .vol-pct { font-size:11px; color:#ccc; min-width:32px; text-align:right; }
  .fp-controls { display:flex; align-items:center; justify-content:space-around; margin-top:auto; padding-top:12px; }
  .fp-controls button { background:transparent; border:none; color:#fff; font-size:22px; cursor:pointer; width:48px; height:48px; display:flex; align-items:center; justify-content:center; }
  .fp-controls .fp-play { width:68px; height:68px; background:#fff; color:#000; border-radius:50%; font-size:24px; }

  .page { display:none; }
  .page.active { display:block; }

  .loading { text-align:center; padding:30px; color:#888; font-size:13px; }
  .loading i { animation:spin 1s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  audio { display:none; }

  .toast { position:fixed; bottom:160px; left:50%; transform:translateX(-50%) translateY(20px); background:#1db954; color:#000; padding:10px 20px; border-radius:20px; font-size:13px; font-weight:700; opacity:0; pointer-events:none; transition:0.3s; z-index:300; max-width:80%; text-align:center; }
  .toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
  .toast.error { background:#ef4444; color:#fff; }

  .loading-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:none; align-items:center; justify-content:center; z-index:400; flex-direction:column; gap:14px; }
  .loading-overlay.show { display:flex; }
  .loading-overlay .spinner { width:50px; height:50px; border:4px solid rgba(255,255,255,0.1); border-top-color:#1db954; border-radius:50%; animation:spin 0.8s linear infinite; }
  .loading-overlay .text { font-size:14px; font-weight:600; }
</style>
</head>
<body>

<header class="app-header">
  <div class="header-top">
    <div class="brand" id="pageTitle">Padilify<span class="dot">.</span></div>
    <div class="header-btns">
      <button class="icon-btn" onclick="switchPage('search')"><i class="fa-solid fa-magnifying-glass"></i></button>
      <button class="icon-btn" onclick="switchPage('profile')"><i class="fa-regular fa-user"></i></button>
    </div>
  </div>
  <div class="chips" id="homeChips">
    <div class="chip active" data-chip="all">Semua</div>
    <div class="chip" data-chip="pop"><i class="fa-solid fa-fire"></i> Pop</div>
    <div class="chip" data-chip="chill"><i class="fa-solid fa-mug-hot"></i> Chill</div>
    <div class="chip" data-chip="rap"><i class="fa-solid fa-microphone"></i> Rap</div>
    <div class="chip" data-chip="rock"><i class="fa-solid fa-guitar"></i> Rock</div>
  </div>
</header>

<div class="scroll-area">
  <div class="page active" id="page-home">
    <div class="section">
      <div class="section-title"><i class="fa-solid fa-bolt"></i> Quick Picks</div>
      <div class="quick-grid" id="quickGrid"><div class="loading"><i class="fa-solid fa-circle-notch"></i> Memuat...</div></div>
    </div>
    <div class="section">
      <div class="section-title purple"><i class="fa-solid fa-circle-dot"></i> Trending</div>
      <div class="releases-grid" id="trendingGrid"><div class="loading"><i class="fa-solid fa-circle-notch"></i> Memuat...</div></div>
    </div>
  </div>

  <div class="page" id="page-search">
    <div class="section">
      <div class="search-input-wrap">
        <input type="text" placeholder="Cari lagu, artis..." id="searchInput">
        <button id="searchBtn">Cari</button>
      </div>
      <div class="search-results" id="searchResults">
        <div class="empty-state" style="margin-top:20px;">
          <div class="icon-circle"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h3>Cari Musik</h3>
          <p>Ketik judul lagu atau nama artis</p>
        </div>
      </div>
    </div>
  </div>

  <div class="page" id="page-library">
    <div class="section">
      <div class="empty-state">
        <div class="icon-circle"><i class="fa-solid fa-music"></i></div>
        <h3>Belum Ada Playlist</h3>
        <p>Buat playlist pertamamu</p>
      </div>
    </div>
  </div>

  <div class="page" id="page-liked">
    <div class="section">
      <div class="empty-state pink" id="likedEmpty">
        <div class="icon-circle"><i class="fa-solid fa-heart"></i></div>
        <h3>Belum ada lagu disukai</h3>
        <p>Klik ikon hati untuk menyimpan</p>
      </div>
      <div class="search-results" id="likedList"></div>
    </div>
  </div>

  <div class="page" id="page-offline">
    <div class="section">
      <div class="empty-state">
        <div class="icon-circle"><i class="fa-solid fa-plane-slash"></i></div>
        <h3>Belum Ada Lagu Offline</h3>
        <p>Simpan lagu untuk diputar offline</p>
      </div>
    </div>
  </div>

  <div class="page" id="page-profile">
    <div class="section">
      <div class="profile-hero">
        <div class="profile-avatar">P</div>
        <h2>Padil<span class="accent">ify</span></h2>
        <p>Streaming Musik dengan Spotify 🎵</p>
      </div>
      <div class="info-card">
        <div class="card-head green"><i class="fa-brands fa-spotify"></i> APLIKASI</div>
        <div class="info-row"><span class="label">Nama</span><span class="value">Padilify</span></div>
        <div class="info-row"><span class="label">Versi</span><span class="value">v5.2.0</span></div>
        <div class="info-row"><span class="label">Source</span><span class="value green">● YouTube API</span></div>
      </div>
      <div class="info-card">
        <div class="card-head purple"><i class="fa-solid fa-code"></i> DEVELOPER</div>
        <div class="info-row"><span class="label">Developed by</span><span class="value">Padil</span></div>
        <div class="info-row"><span class="label">❤️ Lagu disukai</span><span class="value" id="likedCount">0</span></div>
      </div>
    </div>
  </div>
</div>

<div class="mini-player" id="miniPlayer">
  <div class="cover" id="miniCover"><i class="fa-solid fa-music"></i></div>
  <div class="info">
    <div class="title" id="miniTitle">-</div>
    <div class="artist" id="miniArtist">-</div>
  </div>
  <button class="play-btn" id="miniPlayBtn"><i class="fa-solid fa-play"></i></button>
  <button class="btn-round" id="miniHeart"><i class="fa-regular fa-heart"></i></button>
</div>

<nav class="bottom-nav">
  <a class="nav-item active" data-page="home"><i class="fa-solid fa-house"></i><span>Home</span></a>
  <a class="nav-item" data-page="search"><i class="fa-solid fa-magnifying-glass"></i><span>Search</span></a>
  <a class="nav-item" data-page="library"><i class="fa-solid fa-chart-simple"></i><span>Library</span></a>
  <a class="nav-item" data-page="offline"><i class="fa-solid fa-plane-slash"></i><span>Offline</span></a>
  <a class="nav-item" data-page="liked"><i class="fa-regular fa-heart"></i><span>Liked</span></a>
  <a class="nav-item" data-page="profile"><i class="fa-regular fa-user"></i><span>Profile</span></a>
</nav>

<div class="full-player" id="fullPlayer">
  <div class="fp-bg" id="fpBg"></div>
  <div class="fp-content">
    <div class="fp-top">
      <button class="icon-btn" id="closePlayer"><i class="fa-solid fa-chevron-down"></i></button>
      <div class="fp-label">
        <div class="small">Sedang Diputar</div>
        <div class="artist-line" id="fpHeaderArtist">-</div>
      </div>
      <button class="icon-btn"><i class="fa-solid fa-chart-simple"></i></button>
    </div>
    <div class="fp-cover-wrap">
      <div class="fp-cover" id="fpCover"><i class="fa-solid fa-music"></i></div>
    </div>
    <div class="fp-title-row">
      <div class="fp-title-info">
        <div class="fp-title" id="fpTitle">-</div>
        <div class="fp-artist" id="fpArtist">-</div>
      </div>
      <div class="fp-actions">
        <button class="icon-btn" id="fpDownload"><i class="fa-solid fa-download"></i></button>
        <button class="icon-btn" id="fpHeart"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="fp-time">
      <span id="fpCurrent">0:00</span>
      <span id="fpTotal">0:00</span>
    </div>
    <div class="f
