
(() => {
  const startBtn = document.getElementById('start-btn');
  const captureBtn = document.getElementById('capture-btn');
  const resetBtn = document.getElementById('reset-btn');
  const video = document.getElementById('video');
  const output = document.getElementById('output-section');

  const EMOJI_MAP = {
    happy: '😄',
    sad: '😢',
    angry: '😠',
    surprised: '😲',
    fearful: '😨',
    disgusted: '🤢',
    neutral: '😐',
  };

  let modelsLoaded = false;
  let stream = null;

  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

  async function ensureModels() {
    if (modelsLoaded) return;
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  }

  async function startCamera() {
    output.innerHTML = '';
    await ensureModels();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      await video.play();
      startBtn.textContent = 'Restart Camera';
      captureBtn.disabled = false;
      resetBtn.disabled = false;
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  }

  function resetAll() {
    captureBtn.disabled = true;
    resetBtn.disabled = true;
    startBtn.textContent = 'Start Camera';
    output.innerHTML = '';
    if (video) video.pause();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  function renderResults(detections) {
    output.setAttribute('aria-busy', 'false');
    output.innerHTML = '';

    if (!detections || detections.length === 0) {
      output.innerHTML = '<p class="small-muted">No faces detected. Try again.</p>';
      return;
    }

    const expressions = detections[0].expressions;
    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
    const [dominantExpression, confidence] = sorted[0];

    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <h2 class="result-title">Detection Results</h2>
      <div class="result-dominant">Dominant: <strong>${dominantExpression} ${EMOJI_MAP[dominantExpression] || ''}</strong> — ${Math.round(confidence * 100)}%</div>
      <div class="grid">
        ${sorted
          .map(([expr, val]) => `
            <div class="expr-row">
              <span>${EMOJI_MAP[expr] || ''} ${expr}</span>
              <span>${Math.round(val * 100)}%</span>
              <div class="bar"><span style="width:${Math.round(val * 100)}%"></span></div>
            </div>
          `)
          .join('')}
      </div>
    `;
    output.appendChild(card);
  }

  async function captureAndAnalyze() {
    if (!video) return;
    output.setAttribute('aria-busy', 'true');

    // Analyze current video frame without drawing overlays
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    renderResults(detections);
  }

  startBtn.addEventListener('click', startCamera);
  captureBtn.addEventListener('click', captureAndAnalyze);
  resetBtn.addEventListener('click', resetAll);

  window.addEventListener('beforeunload', resetAll);
})();
