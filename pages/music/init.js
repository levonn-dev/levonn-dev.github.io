import { loadWMPTemplate } from '../../scripts/wmp.js';

const contentEl = document.querySelector(
  '.win98-window[data-window-id="music"] .win98-content'
);

const ALBUM_DIR = 'assets/music/Charlie%20Noble';

const album = {
  title:       'Charlie Noble',
  artist:      'Charlie Noble',
  meta:        '2012 ; Rock ; 7 tracks',
  cover:       `${ALBUM_DIR}/cover.jpg`,
  downloadUrl: 'assets/downloads/Charlie%20Noble.zip',
  tracks: [
    { title: 'Intro',                  duration: '1:52', src: `${ALBUM_DIR}/01%20-%20Intro.mp3` },
    { title: 'No Union',               duration: '2:53', src: `${ALBUM_DIR}/02%20-%20No%20Union.mp3` },
    { title: 'Cigarette in Your Hand', duration: '4:14', src: `${ALBUM_DIR}/03%20-%20Cigarette%20in%20Your%20Hand.mp3` },
    { title: 'Left Me Here',           duration: '3:14', src: `${ALBUM_DIR}/04%20-%20Left%20Me%20Here.mp3` },
    { title: 'Rise Again',             duration: '2:53', src: `${ALBUM_DIR}/05%20-%20Rise%20Again.mp3` },
    { title: 'Anchors Up',             duration: '2:43', src: `${ALBUM_DIR}/06%20-%20Anchors%20Up.mp3` },
    { title: 'City On Strike',         duration: '3:22', src: `${ALBUM_DIR}/07%20-%20City%20On%20Strike.mp3` },
  ],
};

const about =
  "I'm a drummer and have been playing since I was old enough to hold the sticks. " +
  "I've played in many bands and recorded many albums; this was the last album " +
  "I recorded and the one I'm still the most proud of.";

if (contentEl) {
  await loadWMPTemplate(contentEl, { album, about });
}
