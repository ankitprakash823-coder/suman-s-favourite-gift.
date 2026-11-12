// Replace this with a direct URL to your audio file when you are ready.
function initializeLoveFeatures() {
const LOVE_SONG_URL = "";
const isEmbeddedPage = window.self !== window.top;

const startDate = new Date(2025, 8, 13);
const now = new Date();
const calendarDays = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
const daysTogether = Math.max(0, Math.floor((calendarDays(now) - calendarDays(startDate)) / 86400000));

const dayCounter = document.createElement("aside");
dayCounter.className = "love-day-counter";
dayCounter.hidden = isEmbeddedPage;
dayCounter.setAttribute("aria-label", `${daysTogether} days together since September 13, 2025`);
dayCounter.innerHTML = `<strong>${daysTogether}</strong><span>days together</span>`;
document.body.append(dayCounter);

const musicPlayer = document.createElement("section");
musicPlayer.className = "love-music-player";
musicPlayer.setAttribute("aria-label", "Music player");
musicPlayer.hidden = isEmbeddedPage;
musicPlayer.innerHTML = `
  <button type="button" class="love-music-previous" aria-label="Previous track" title="Previous track">⏮</button>
  <button type="button" class="love-music-play" aria-label="Play music" title="Play music">▶</button>
  <button type="button" class="love-music-pause" aria-label="Pause music" title="Pause music" disabled>Ⅱ</button>
  <button type="button" class="love-music-next" aria-label="Next track" title="Next track">⏭</button>
  <button type="button" class="love-music-add" aria-label="Add music tracks" title="Add music tracks">＋</button>
  <span class="love-music-drag-handle" role="button" tabindex="0" aria-label="Move music player" title="Drag to move music player">♫</span>
  <input id="love-volume" type="range" min="0" max="1" step="0.05" value="0.7" aria-label="Music volume">
  <span class="love-music-status" role="status" aria-live="polite" hidden></span>
`;
document.body.append(musicPlayer);

const musicDragHandle = musicPlayer.querySelector(".love-music-drag-handle");
let musicDrag = null;
musicDragHandle.addEventListener("pointerdown", (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  const bounds = musicPlayer.getBoundingClientRect();
  musicDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: bounds.left, top: bounds.top };
  musicDragHandle.setPointerCapture(event.pointerId);
});
musicDragHandle.addEventListener("pointermove", (event) => {
  if (!musicDrag || musicDrag.pointerId !== event.pointerId) return;
  const maxLeft = Math.max(0, window.innerWidth - musicPlayer.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - musicPlayer.offsetHeight);
  const left = Math.min(maxLeft, Math.max(0, musicDrag.left + event.clientX - musicDrag.startX));
  const top = Math.min(maxTop, Math.max(0, musicDrag.top + event.clientY - musicDrag.startY));
  musicPlayer.style.left = `${left}px`;
  musicPlayer.style.top = `${top}px`;
  musicPlayer.style.right = "auto";
  musicPlayer.style.bottom = "auto";
});
const endMusicDrag = (event) => {
  if (musicDrag?.pointerId === event.pointerId) musicDrag = null;
};
musicDragHandle.addEventListener("pointerup", endMusicDrag);
musicDragHandle.addEventListener("pointercancel", endMusicDrag);
musicDragHandle.addEventListener("keydown", (event) => {
  const offsets = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
  const offset = offsets[event.key];
  if (!offset) return;
  event.preventDefault();
  const bounds = musicPlayer.getBoundingClientRect();
  const maxLeft = Math.max(0, window.innerWidth - bounds.width);
  const maxTop = Math.max(0, window.innerHeight - bounds.height);
  const left = Math.min(maxLeft, Math.max(0, bounds.left + offset[0]));
  const top = Math.min(maxTop, Math.max(0, bounds.top + offset[1]));
  musicPlayer.style.left = `${left}px`;
  musicPlayer.style.top = `${top}px`;
  musicPlayer.style.right = "auto";
  musicPlayer.style.bottom = "auto";
});

const musicFilePicker = document.createElement("input");
musicFilePicker.className = "love-music-file-picker";
musicFilePicker.type = "file";
musicFilePicker.accept = "audio/*";
musicFilePicker.multiple = true;
musicFilePicker.setAttribute("aria-label", "Choose music files");
document.body.append(musicFilePicker);

const music = new Audio();
music.preload = "none";
music.volume = 0.7;
const tracks = LOVE_SONG_URL.trim()
  ? [{ name: "Configured music", url: LOVE_SONG_URL.trim(), owned: false }]
  : [];
let currentTrackIndex = -1;
let playbackRequestId = 0;
const unavailableTracks = new Set();
const playButton = musicPlayer.querySelector(".love-music-play");
const pauseButton = musicPlayer.querySelector(".love-music-pause");
const previousButton = musicPlayer.querySelector(".love-music-previous");
const nextButton = musicPlayer.querySelector(".love-music-next");
const addButton = musicPlayer.querySelector(".love-music-add");
const musicStatus = musicPlayer.querySelector(".love-music-status");
const showMusicStatus = (message) => {
  musicStatus.textContent = message;
  musicStatus.hidden = false;
  window.clearTimeout(showMusicStatus.timeoutId);
  showMusicStatus.timeoutId = window.setTimeout(() => { musicStatus.hidden = true; }, 4000);
};

function requestMusicFiles() {
  showMusicStatus("Choose one or more audio files to start your music.");
  musicFilePicker.click();
}

function updateMusicControls() {
  playButton.disabled = !music.paused;
  pauseButton.disabled = music.paused;
}

async function playTrack(index) {
  if (!tracks.length) {
    requestMusicFiles();
    return;
  }
  if (unavailableTracks.size === tracks.length) {
    showMusicStatus("No playable tracks remain. Choose new audio files.");
    return;
  }

  const requestId = ++playbackRequestId;
  let trackIndex = ((index % tracks.length) + tracks.length) % tracks.length;

  for (let attempt = 0; attempt < tracks.length; attempt += 1) {
    if (requestId !== playbackRequestId) return;
    if (unavailableTracks.has(tracks[trackIndex].url)) {
      trackIndex = (trackIndex + 1) % tracks.length;
      continue;
    }

    const track = tracks[trackIndex];
    currentTrackIndex = trackIndex;
    music.pause();
    music.src = track.url;
    music.load();
    try {
      await music.play();
      if (requestId !== playbackRequestId) return;
      musicPlayer.title = `Now playing: ${track.name}`;
      showMusicStatus(`Now playing: ${track.name}`);
      return;
    } catch (error) {
      if (requestId !== playbackRequestId) return;
      if (unavailableTracks.has(track.url)) return;
      console.error(`Could not play music track "${track.name}".`, error);
      unavailableTracks.add(track.url);
      if (unavailableTracks.size === tracks.length) {
        updateMusicControls();
        showMusicStatus(`Could not play "${track.name}". Choose a playable audio file.`);
        return;
      }
      showMusicStatus(`Could not play "${track.name}". Trying the next track.`);
      trackIndex = (trackIndex + 1) % tracks.length;
    }
  }
}

async function resumeMusic() {
  if (currentTrackIndex < 0 || unavailableTracks.size === tracks.length) {
    requestMusicFiles();
    return;
  }
  if (music.ended) {
    await playTrack(currentTrackIndex);
    return;
  }
  try {
    await music.play();
  } catch (error) {
    console.error("Could not resume the current music track.", error);
    showMusicStatus("Music could not be resumed. Choose another audio file.");
  }
}

playButton.addEventListener("click", resumeMusic);
pauseButton.addEventListener("click", () => music.pause());
nextButton.addEventListener("click", () => {
  if (!tracks.length) {
    requestMusicFiles();
    return;
  }
  void playTrack(currentTrackIndex < 0 ? 0 : currentTrackIndex + 1);
});
previousButton.addEventListener("click", () => {
  if (!tracks.length) {
    requestMusicFiles();
    return;
  }
  if (currentTrackIndex >= 0 && music.currentTime > 3) {
    music.currentTime = 0;
    void resumeMusic();
    return;
  }
  void playTrack(currentTrackIndex < 0 ? tracks.length - 1 : currentTrackIndex - 1);
});
addButton.addEventListener("click", requestMusicFiles);

musicFilePicker.addEventListener("change", () => {
  const selectedFiles = Array.from(musicFilePicker.files || []);
  musicFilePicker.value = "";
  if (!selectedFiles.length) return;

  const firstAddedTrackIndex = tracks.length;
  const shouldStartAddedTrack = music.paused;
  selectedFiles.forEach((file) => {
    tracks.push({ name: file.name, url: URL.createObjectURL(file), owned: true });
  });
  if (shouldStartAddedTrack || currentTrackIndex < 0) {
    void playTrack(firstAddedTrackIndex);
  } else {
    showMusicStatus(`${selectedFiles.length} track${selectedFiles.length === 1 ? "" : "s"} added to the playlist.`);
  }
});

music.addEventListener("play", updateMusicControls);
music.addEventListener("pause", updateMusicControls);
music.addEventListener("ended", () => {
  if (currentTrackIndex >= 0) void playTrack((currentTrackIndex + 1) % tracks.length);
});
music.addEventListener("error", () => {
  const failedTrack = tracks[currentTrackIndex];
  if (!failedTrack || unavailableTracks.has(failedTrack.url)) return;
  console.error(`Could not load music track "${failedTrack.name}".`, music.error);
  unavailableTracks.add(failedTrack.url);
  if (unavailableTracks.size === tracks.length) {
    updateMusicControls();
    showMusicStatus(`Could not load "${failedTrack.name}". Choose a playable audio file.`);
    return;
  }
  showMusicStatus(`Could not load "${failedTrack.name}". Trying the next track.`);
  void playTrack((currentTrackIndex + 1) % tracks.length);
});
musicPlayer.querySelector("#love-volume").addEventListener("input", (event) => {
  music.volume = Number(event.currentTarget.value);
});
window.addEventListener("beforeunload", () => {
  tracks.forEach((track) => {
    if (track.owned) URL.revokeObjectURL(track.url);
  });
});

const letterBackdrop = document.createElement("div");
letterBackdrop.className = "love-letter-backdrop";
letterBackdrop.hidden = true;
letterBackdrop.innerHTML = `
  <section class="love-letter" role="dialog" aria-modal="true" aria-labelledby="love-letter-title">
    <button class="love-letter-close" type="button" aria-label="Close secret letter">×</button>
    <div class="love-letter-icon" aria-hidden="true">♡</div>
    <h2 id="love-letter-title">A little secret for you</h2>
    <p>My dearest Suman,</p>
    <p>Every ordinary day feels a little brighter because I get to share this story with you. Thank you for the laughter, the little moments, and all the love you bring into my life.</p>
    <p>No matter how many pages we turn, my favorite part will always be the ones we create together.</p>
    <p class="love-letter-sign">Always yours, with all my heart ♡</p>
  </section>
`;
document.body.append(letterBackdrop);

const closeLetterButton = letterBackdrop.querySelector(".love-letter-close");
const closeLetter = () => { letterBackdrop.hidden = true; };
closeLetterButton.addEventListener("click", closeLetter);
letterBackdrop.addEventListener("click", (event) => {
  if (event.target === letterBackdrop) closeLetter();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !letterBackdrop.hidden) closeLetter();
});

const confettiCanvas = document.createElement("canvas");
confettiCanvas.className = "love-confetti";
confettiCanvas.setAttribute("aria-hidden", "true");
confettiCanvas.hidden = true;
document.body.append(confettiCanvas);

function celebrate() {
  const context = confettiCanvas.getContext("2d");
  if (!context) {
    console.error("Confetti animation is unavailable because canvas could not be initialized.");
    letterBackdrop.hidden = false;
    closeLetterButton.focus();
    return;
  }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  confettiCanvas.width = width * pixelRatio;
  confettiCanvas.height = height * pixelRatio;
  confettiCanvas.style.width = `${width}px`;
  confettiCanvas.style.height = `${height}px`;
  context.scale(pixelRatio, pixelRatio);

  const colors = ["#d7ad58", "#f0d998", "#d98585", "#91a784", "#c5a1c8", "#fff4d5"];
  const pieces = Array.from({ length: 125 }, () => ({
    x: Math.random() * width,
    y: -Math.random() * height * 0.7,
    speed: 2 + Math.random() * 4,
    drift: (Math.random() - 0.5) * 2.2,
    size: 4 + Math.random() * 6,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.15,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startedAt = performance.now();
  confettiCanvas.hidden = false;

  function draw(time) {
    context.clearRect(0, 0, width, height);
    pieces.forEach((piece) => {
      piece.y += piece.speed;
      piece.x += piece.drift;
      piece.rotation += piece.spin;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.65);
      context.restore();
    });

    if (!reducedMotion && time - startedAt < 2600) {
      window.requestAnimationFrame(draw);
    } else {
      context.clearRect(0, 0, width, height);
      confettiCanvas.hidden = true;
    }
  }

  window.requestAnimationFrame(draw);
  letterBackdrop.hidden = false;
  closeLetterButton.focus();
}

let previousBackgroundClick = null;
let doubleClickCount = 0;
let eggOpened = false;

document.addEventListener("click", (event) => {
  const isBackground = event.target instanceof Element && event.target.classList.contains("desk");
  if (!isBackground || eggOpened || !letterBackdrop.hidden) {
    previousBackgroundClick = null;
    doubleClickCount = 0;
    return;
  }

  const currentClick = { time: Date.now(), x: event.clientX, y: event.clientY };
  if (
    previousBackgroundClick
    && currentClick.time - previousBackgroundClick.time <= 500
    && Math.hypot(currentClick.x - previousBackgroundClick.x, currentClick.y - previousBackgroundClick.y) <= 32
  ) {
    doubleClickCount += 1;
    previousBackgroundClick = null;
    if (doubleClickCount === 3) {
      eggOpened = true;
      celebrate();
    }
    return;
  }

  previousBackgroundClick = currentClick;
  window.setTimeout(() => {
    if (previousBackgroundClick === currentClick) previousBackgroundClick = null;
  }, 520);
});

const siteDirectory = new URL(".", window.location.href).pathname;
function getLocalPageLink(anchor) {
  if (anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return null;
  const destination = new URL(anchor.href, window.location.href);
  if (
    destination.protocol !== window.location.protocol
    || destination.origin !== window.location.origin
    || !destination.pathname.startsWith(siteDirectory)
    || !/\.html$/i.test(destination.pathname)
  ) return null;
  return destination.href;
}

function isUnmodifiedNavigationClick(event) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

if (isEmbeddedPage) {
  document.addEventListener("click", (event) => {
    if (!isUnmodifiedNavigationClick(event) || !(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    if (!anchor) return;
    const pageUrl = getLocalPageLink(anchor);
    if (!pageUrl) return;
    event.preventDefault();
    window.parent.postMessage(
      { type: "love-scrapbook-page-navigation", url: pageUrl },
      window.location.protocol === "file:" ? "*" : window.location.origin,
    );
  });
} else {
  let pageFrame = null;

  function showPageInPersistentFrame(pageUrl) {
    if (!pageFrame) {
      pageFrame = document.createElement("iframe");
      pageFrame.className = "love-page-frame";
      pageFrame.title = "Scrapbook page";
      document.body.append(pageFrame);
    }
    pageFrame.src = pageUrl;
  }

  document.addEventListener("click", (event) => {
    if (pageFrame || !isUnmodifiedNavigationClick(event) || !(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    if (!anchor) return;
    const pageUrl = getLocalPageLink(anchor);
    if (!pageUrl) return;
    event.preventDefault();
    showPageInPersistentFrame(pageUrl);
  });

  window.addEventListener("message", (event) => {
    if (!pageFrame || event.source !== pageFrame.contentWindow) return;
    if (window.location.protocol !== "file:" && event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== "love-scrapbook-page-navigation" || typeof event.data.url !== "string") return;
    const destination = document.createElement("a");
    destination.href = event.data.url;
    const pageUrl = getLocalPageLink(destination);
    if (pageUrl) showPageInPersistentFrame(pageUrl);
  });
}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLoveFeatures, { once: true });
} else {
  initializeLoveFeatures();
}
