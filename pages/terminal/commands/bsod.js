const STYLE_ID = 'bsod-style';

const CSS = `
.bsod {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #0000aa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
}
.bsod-inner { max-width: 640px; padding: 0 16px; }
.bsod-title-row { text-align: center; margin-bottom: 1em; }
.bsod-title { background: #c0c0c0; color: #0000aa; padding: 0 8px; }
.bsod-text, .bsod-title {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #fff;
}
.bsod-text { margin: 0; white-space: pre-wrap; }
.bsod-cursor { animation: bsod-blink 1s step-end infinite; }
@keyframes bsod-blink { 50% { opacity: 0; } }
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export default {
  name: 'bsod',
  description: 'Blue Screen of Death',
  hidden: true,
  execute(_args, _terminal) {
    // Don't stack overlays if it's already showing
    if (document.getElementById('bsod')) return;
    injectStyle();

    const screen = document.createElement('div');
    screen.id = 'bsod';
    screen.className = 'bsod';
    screen.tabIndex = 0;
    screen.innerHTML = `
      <div class="bsod-inner">
        <div class="bsod-title-row"><span class="bsod-title"> Windows </span></div>
        <pre class="bsod-text">An exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +
00010E36. The current application will be terminated.

*  Press any key to terminate the current application.
*  Press CTRL+ALT+DEL again to restart your computer. You will
   lose any unsaved information in all applications.

                 Press any key to continue <span class="bsod-cursor">_</span></pre>
      </div>`;

    document.body.appendChild(screen);
    screen.focus();

    const dismiss = (e) => {
      e.preventDefault();
      e.stopPropagation();
      screen.remove();
      document.removeEventListener('keydown', dismiss, true);
      // Return focus to the prompt the user was typing into
      document.getElementById('term-input')?.focus();
    };

    // Capture phase so the dismissing keypress isn't typed into the terminal
    document.addEventListener('keydown', dismiss, true);
    screen.addEventListener('click', dismiss);
  },
};
