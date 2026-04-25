import { getVideoStream, getAudioAnalyser } from './src/capture.js';
import * as compositor from './src/compositor.js';

import blobEffect from './src/effects/blob.js';
import drawingEffect from './src/effects/drawing.js';
import glitchEffect from './src/effects/glitch.js';
import mirrorEffect from './src/effects/mirror.js';
import asciiEffect from './src/effects/ascii.js';
import emojiFilterEffect from './src/effects/emoji-filter.js';
import monkeyEffect from './src/effects/monkey.js';

const effects = {
  [blobEffect.name]: blobEffect,
  [drawingEffect.name]: drawingEffect,
  [glitchEffect.name]: glitchEffect,
  [mirrorEffect.name]: mirrorEffect,
  [asciiEffect.name]: asciiEffect,
  [emojiFilterEffect.name]: emojiFilterEffect,
  [monkeyEffect.name]: monkeyEffect,
};

function enableEffect(name) {
  const effect = effects[name];
  if (!effect) {
    console.error(`Unknown effect "${name}".`);
    return;
  }
  compositor.enableEffect(name, effect);
}

function disableEffect(name) {
  compositor.disableEffect(name);
}

window.app = {
  compositor,
  enableEffect,
  disableEffect,
};

document.addEventListener('DOMContentLoaded', async () => {
  const videoEl = await getVideoStream();

  let audio;
  try {
    audio = await getAudioAnalyser();
  } catch (error) {
    console.error('Audio analyser unavailable. Continuing without audio reactivity.', error);
    audio = undefined;
  }

  compositor.init(videoEl, audio);
  compositor.start();
});
