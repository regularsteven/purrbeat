const DEFAULT_CONFIG = Object.freeze({
  numHands: 2,
  minHandDetectionConfidence: 0.55,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  runningMode: 'VIDEO',
});

const BUNDLE_URLS = [
  new URL('../assets/mediapipe/vision_bundle.js', import.meta.url).href,
  new URL('../assets/mediapipe/vision_bundle.mjs', import.meta.url).href,
];
const WASM_DIR_URL = new URL('../assets/mediapipe/wasm/', import.meta.url).href;
const MODEL_URL = new URL('../assets/mediapipe/hand_landmarker.task', import.meta.url).href;

async function verifyAsset(url) {
  let response = await fetch(url, { method: 'HEAD' });
  if (response.status === 405) {
    response = await fetch(url, { method: 'GET' });
  }
  if (!response.ok) {
    throw new Error(`Asset unavailable: ${url}`);
  }
}

async function verifyAnyAsset(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      await verifyAsset(url);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No asset URL could be verified.');
}

export function getMediaPipeAssetPaths() {
  return {
    bundleUrl: BUNDLE_URLS[0],
    fallbackBundleUrl: BUNDLE_URLS[1],
    wasmDirUrl: WASM_DIR_URL,
    modelUrl: MODEL_URL,
  };
}

export async function createMediaPipeHandRuntime(customConfig = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...customConfig,
  };

  await verifyAnyAsset(BUNDLE_URLS);
  await verifyAsset(MODEL_URL);

  let vision;
  let loadedBundleUrl = '';
  let importError = null;
  for (const bundleUrl of BUNDLE_URLS) {
    try {
      vision = await import(bundleUrl);
      loadedBundleUrl = bundleUrl;
      break;
    } catch (error) {
      importError = error;
    }
  }

  if (!vision) {
    throw new Error(
      `Unable to load MediaPipe runtime bundle from ${BUNDLE_URLS.join(' or ')}. ${importError?.message || 'Unknown import error'}`,
    );
  }

  const { FilesetResolver, HandLandmarker } = vision;
  if (!FilesetResolver || !HandLandmarker) {
    throw new Error(`MediaPipe bundle from ${loadedBundleUrl || 'unknown path'} does not export FilesetResolver and HandLandmarker.`);
  }

  const fileset = await FilesetResolver.forVisionTasks(WASM_DIR_URL);
  const handLandmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
    },
    runningMode: config.runningMode,
    numHands: config.numHands,
    minHandDetectionConfidence: config.minHandDetectionConfidence,
    minHandPresenceConfidence: config.minHandPresenceConfidence,
    minTrackingConfidence: config.minTrackingConfidence,
  });

  return {
    detectForVideo(video, timestampMs) {
      return handLandmarker.detectForVideo(video, timestampMs);
    },
    close() {
      handLandmarker.close();
    },
  };
}
