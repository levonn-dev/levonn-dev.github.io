// Loads the shared Windows Media Player chrome from templates/wmp.html into a content element.
// config: { album, about }
//   album = { title, artist, meta, cover, downloadUrl?, tracks: [{ title, duration, src }] }
//   about = string of paragraph text shown above the tracklist
// Wires HTML5 audio playback for the supplied tracks.

import { templateLoader } from './dom.js';

const loadTemplate = templateLoader('templates/wmp.html');

export async function loadWMPTemplate(contentEl, { album, about } = {}) {
  const frag = await loadTemplate();

  if (album) {
    if (album.cover)  frag.querySelector('.wmp-cover').src         = album.cover;
    if (album.title)  frag.querySelector('.wmp-album-title').textContent  = album.title;
    if (album.artist) frag.querySelector('.wmp-album-artist').textContent = album.artist;
    if (album.meta)   frag.querySelector('.wmp-album-meta').textContent   = album.meta;

    if (album.downloadUrl) {
      const dl = frag.querySelector('.wmp-download');
      dl.href = album.downloadUrl;
      dl.hidden = false;
    }

    const tbody = frag.querySelector('.wmp-tracklist tbody');
    (album.tracks || []).forEach((track, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.idx = idx;
      const tdNum   = document.createElement('td');
      const tdTitle = document.createElement('td');
      const tdDur   = document.createElement('td');
      tdNum.textContent   = String(idx + 1).padStart(2, '0');
      tdTitle.textContent = track.title;
      tdDur.textContent   = track.duration;
      tr.append(tdNum, tdTitle, tdDur);
      tbody.appendChild(tr);
    });
  }

  if (about) frag.querySelector('.wmp-about').textContent = about;

  contentEl.innerHTML = '';
  contentEl.appendChild(frag);

  if (album && album.tracks && album.tracks.length) {
    initPlayback(contentEl, album.tracks);
  }
}

function initPlayback(contentEl, tracks) {
  const audio    = new Audio();
  audio.preload  = 'auto'; // force full buffering so seeks land reliably
  const playBtn  = contentEl.querySelector('.wmp-play');
  const stopBtn  = contentEl.querySelector('.wmp-stop');
  const prevBtn  = contentEl.querySelector('.wmp-prev');
  const nextBtn  = contentEl.querySelector('.wmp-next');
  const progress = contentEl.querySelector('.wmp-progress');
  const timeEl   = contentEl.querySelector('.wmp-time');
  const rows     = contentEl.querySelectorAll('.wmp-tracklist tbody tr');

  let currentIdx = -1;
  let scrubbing  = false; // user is currently dragging the slider

  const fmt = (s) => {
    if (!isFinite(s)) return '00:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  // Parse the duration string in the track config ("M:SS") into seconds so we
  // can set progress.max immediately, without waiting for loadedmetadata. This
  // avoids a race where a fresh drag before metadata arrives clamps the slider
  // value to 0 (because progress.max is still 0) and then seeks to the start.
  const durationSeconds = (durStr) => {
    const parts = String(durStr).split(':').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return 0;
    return parts[0] * 60 + parts[1];
  };

  const highlight = (idx) => {
    rows.forEach((tr, i) => tr.classList.toggle('playing', i === idx));
  };

  const load = (idx) => {
    currentIdx = idx;
    audio.src = tracks[idx].src;
    progress.max   = durationSeconds(tracks[idx].duration);
    progress.value = 0;
    highlight(idx);
  };

  const play = () => {
    if (currentIdx < 0) load(0);
    audio.play();
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
  };

  const next = () => {
    load((currentIdx + 1) % tracks.length);
    play();
  };

  const prev = () => {
    load((currentIdx - 1 + tracks.length) % tracks.length);
    play();
  };

  audio.addEventListener('play',  () => { playBtn.innerHTML = '&#9208;'; });
  audio.addEventListener('pause', () => { playBtn.innerHTML = '&#9654;'; });

  // End of track: advance to next, but stop at end of album rather than wrap.
  audio.addEventListener('ended', () => {
    if (currentIdx >= tracks.length - 1) {
      stop();
    } else {
      next();
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    progress.max = isFinite(audio.duration) ? audio.duration : 0;
  });
  audio.addEventListener('durationchange', () => {
    progress.max = isFinite(audio.duration) ? audio.duration : 0;
  });

  audio.addEventListener('timeupdate', () => {
    if (!scrubbing) progress.value = audio.currentTime;
    timeEl.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  });

  audio.addEventListener('error', () => {
    timeEl.textContent = 'Error loading track';
    highlight(-1);
  });

  playBtn.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
  stopBtn.addEventListener('click', stop);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // Scrubber: suppress timeupdate writebacks while the user is dragging
  // (so the thumb doesn't fight the live playback position), and commit the
  // seek on release. We don't pause audio during the drag - that interacted
  // poorly with the element's first-play state and caused seeks to snap
  // back to 0. Letting audio continue playing during drag is the pattern
  // used by most media apps and is more reliable.
  progress.addEventListener('pointerdown', () => { scrubbing = true; });
  progress.addEventListener('pointerup',   () => {
    audio.currentTime = Number(progress.value);
    scrubbing = false;
  });
  progress.addEventListener('keydown', () => { scrubbing = true; });
  progress.addEventListener('keyup',   () => {
    audio.currentTime = Number(progress.value);
    scrubbing = false;
  });

  rows.forEach((tr, i) => tr.addEventListener('click', () => { load(i); play(); }));

  // Stop audio when the music window is closed; otherwise it would keep
  // playing in the background with no visible UI to control it.
  const winEl = contentEl.closest('.win98-window');
  const id = winEl?.dataset.windowId;
  if (id && window.windowManager?.onClose) {
    window.windowManager.onClose(id, () => {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (_) { /* swallow */ }
    });
  }
}
