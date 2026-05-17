<template>
  <div>
    <div class="tabs is-boxed">
      <spectateMenu></spectateMenu>
    </div>

    <div class="container cinematic-export">
      <div class="export-header">
        <div>
          <h1 class="export-title">Cinematic Export</h1>
          <p class="export-subtitle">Record the World of Warcraft game window while Duskhaven Studio plays your cinematic.</p>
        </div>
        <button class="button refresh-button" v-on:click="loadSources" :disabled="isRecording">
          Refresh Sources
        </button>
      </div>

      <div class="export-layout">
        <section class="source-panel">
          <div class="export-panel-heading">Capture source</div>
          <div class="source-list">
            <div v-if="!sources.length" class="source-empty">
              No World of Warcraft window found.
            </div>
            <button
              v-for="source in sources"
              v-bind:key="source.id"
              class="source-option"
              v-bind:class="{ 'is-selected': selectedSource && selectedSource.id === source.id }"
              v-on:click="selectSource(source)"
              :disabled="isRecording"
            >
              <img v-bind:src="source.thumbnail" v-bind:alt="source.name">
              <span>{{ source.name }}</span>
            </button>
          </div>
        </section>

        <section class="record-panel">
          <div class="export-panel-heading">Recording</div>

          <canvas
            v-show="isRecording"
            ref="livePreview"
            class="preview"
          ></canvas>

          <video
            v-show="!isRecording"
            ref="preview"
            class="preview"
            v-bind:src="recordedUrl"
            v-bind:controls="hasRecording"
            autoplay
            muted
          ></video>

          <div class="record-grid">
            <div>
              <label class="label">Duration</label>
              <input
                class="record-input"
                type="number"
                min="1"
                step="1"
                v-model.number="recordingDuration"
                v-on:change="normalizeRecordingDuration"
                :disabled="isRecording"
              >
            </div>
            <div>
              <label class="label">Format</label>
              <div class="record-value">WebM</div>
            </div>
            <div>
              <label class="label">Waypoints</label>
              <div class="record-value">{{ cinematicSteps.length }}</div>
            </div>
            <div>
              <label class="label">Status</label>
              <div class="record-value">{{ status }}</div>
            </div>
          </div>

          <label class="checkbox checkbox-custom autoplay-toggle">
            Start cinematic when recording begins
            <input
              type="checkbox"
              v-model="autoPlay"
              :disabled="isRecording"
            />
            <div class="checkbox_indicator"></div>
          </label>

          <div class="actions">
            <button
              class="action-button record-button"
              v-on:click="startRecording"
              :disabled="!canRecord"
            >
              Record
            </button>
            <button
              class="action-button stop-button"
              v-on:click="stopRecording"
              :disabled="!isRecording"
            >
              Stop
            </button>
            <button
              class="action-button save-button"
              v-on:click="saveRecording"
              :disabled="!hasRecording || isRecording"
            >
              Save WebM
            </button>
          </div>

          <p class="hint">{{ hint }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
const { desktopCapturer, ipcRenderer } = require('electron');
const { dialog } = require('@electron/remote');
const remote = require('@electron/remote');
const fs = require('fs');

function blobToBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Buffer.from(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

function getMimeType() {
  const types = [
    'video/webm; codecs=vp9',
    'video/webm; codecs=vp8',
    'video/webm',
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

export default {
  name: 'cinematicExport',
  components: {
    spectateMenu: require('./spectateMenu'),
  },
  computed: {
    canRecord() {
      return this.selectedSource && !this.isRecording && this.cinematicSteps.length > 1;
    },
    cinematicDuration() {
      return Number(this.$store.state.camera.cinematicSpeed || 10);
    },
    cinematicSteps() {
      return this.$store.state.camera.cinematicSteps;
    },
    hasRecording() {
      return Boolean(this.recordedBlob);
    },
  },
  data() {
    return {
      autoPlay: true,
      canvasStream: null,
      chunks: [],
      drawFrame: null,
      hint: 'Open World of Warcraft, then refresh sources if the game window is not listed.',
      isRecording: false,
      mediaRecorder: null,
      outputPath: null,
      recordedBlob: null,
      recordedUrl: null,
      recordingDuration: 10,
      selectedSource: null,
      sources: [],
      status: 'Ready',
      stream: null,
      sourceVideo: null,
      timeout: null,
      wasLooping: false,
    };
  },
  mounted() {
    this.recordingDuration = this.cinematicDuration;
    this.expandWindow();
    this.loadSources();
  },
  destroyed() {
    this.clearRecordingTimeout();
    this.stopPreview();
    this.clearRecording();
  },
  methods: {
    expandWindow() {
      const win = remote.getCurrentWindow();
      const bounds = win.getBounds();
      const width = Math.max(bounds.width, 1500);
      const height = Math.max(bounds.height, 900);
      win.setMinimumSize(1300, 760);
      win.setSize(width, height);
    },
    loadSources() {
      this.status = 'Loading sources';
      this.hint = 'Looking for the World of Warcraft window.';

      const sourceTimeout = setTimeout(() => {
        if (this.status === 'Loading sources') {
          this.status = 'Still loading';
          this.hint = 'Source discovery is taking longer than expected. Try Refresh Sources after WoW is already open.';
        }
      }, 3000);

      this.getCaptureSources().then((sources) => {
        clearTimeout(sourceTimeout);
        this.sources = this.filterCaptureSources(sources);
        this.selectedSource = this.sources[0] || null;
        this.status = this.selectedSource ? 'Ready' : 'No sources found';
        this.hint = this.selectedSource
          ? 'Ready to record the game window.'
          : 'World of Warcraft was not found as a capturable window. Open WoW, use windowed or borderless mode, then refresh sources.';
      }).catch((error) => {
        clearTimeout(sourceTimeout);
        this.status = 'Source error';
        this.hint = error.message;
      });
    },
    filterCaptureSources(sources) {
      return sources.filter(source => {
        const isWindow = source.id.indexOf('window:') === 0;
        const isWow = source.name.toLowerCase().indexOf('world of warcraft') !== -1;
        return isWindow && isWow;
      });
    },
    getCaptureSources() {
      if (ipcRenderer && ipcRenderer.invoke) {
        return ipcRenderer.invoke('duskhaven:get-capture-sources');
      }

      return desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 220, height: 124 },
      }).then(sources => sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      })));
    },
    selectSource(source) {
      this.selectedSource = source;
    },
    normalizeRecordingDuration() {
      const duration = Number(this.recordingDuration);
      this.recordingDuration = Number.isFinite(duration) && duration > 0
        ? Math.max(1, Math.round(duration))
        : this.cinematicDuration;
    },
    startRecording() {
      this.normalizeRecordingDuration();
      this.clearRecording();
      this.status = 'Starting';
      this.hint = 'Recording only the selected game window.';
      this.createStream().then((stream) => {
        this.stream = stream;
        return this.createCanvasStream(stream);
      }).then((recordStream) => {
        this.canvasStream = recordStream;
        this.chunks = [];

        const options = { bitsPerSecond: 60000000 };
        const mimeType = getMimeType();
        if (mimeType) options.mimeType = mimeType;

        const recorder = new MediaRecorder(recordStream, options);
        this.mediaRecorder = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) this.chunks.push(event.data);
        };
        recorder.onstop = this.prepareRecordingPreview;
        recorder.start(250);

        this.isRecording = true;
        this.status = 'Recording';
        if (this.autoPlay) this.playCinematicForExport();
        this.timeout = setTimeout(this.stopRecording, this.recordingDuration * 1000);
      }).catch((error) => {
        this.status = 'Recording error';
        this.hint = error.message;
        this.stopPreview();
      });
    },
    createStream() {
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: this.selectedSource.id,
            maxWidth: 3840,
            maxHeight: 2160,
            maxFrameRate: 120,
          },
        },
      };
      return navigator.mediaDevices.getUserMedia(constraints);
    },
    createCanvasStream(stream) {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().then(() => {
            const track = stream.getVideoTracks()[0];
            const settings = track && track.getSettings ? track.getSettings() : {};
            const sourceWidth = video.videoWidth || settings.width || 1920;
            const sourceHeight = video.videoHeight || settings.height || 1080;
            const cropTop = Math.min(34, Math.floor(sourceHeight * 0.08));
            const canvas = this.$refs.livePreview;
            const context = canvas.getContext('2d');

            canvas.width = sourceWidth;
            canvas.height = Math.max(1, sourceHeight - cropTop);
            context.imageSmoothingEnabled = false;

            const paint = () => {
              context.drawImage(
                video,
                0,
                cropTop,
                sourceWidth,
                sourceHeight - cropTop,
                0,
                0,
                canvas.width,
                canvas.height,
              );
              this.drawFrame = requestAnimationFrame(paint);
            };

            this.sourceVideo = video;
            paint();
            resolve(canvas.captureStream(120));
          }).catch(reject);
        };
        video.onerror = reject;
      });
    },
    playCinematicForExport() {
      this.wasLooping = this.$store.state.camera.loopCinematic;
      if (this.wasLooping) this.$store.commit('setLoopCinematic', false);
      window.dispatchEvent(new CustomEvent('duskhaven-play-cinematic-from-start'));
    },
    stopRecording() {
      this.clearRecordingTimeout();
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
      this.status = 'Preparing preview';
      this.mediaRecorder.stop();
      if (this.wasLooping) this.$store.commit('setLoopCinematic', true);
    },
    prepareRecordingPreview() {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      this.recordedBlob = blob;
      this.recordedUrl = URL.createObjectURL(blob);
      this.status = 'Preview ready';
      this.hint = 'Review the recording, then save it if it looks good.';
      this.isRecording = false;
      this.stopPreview();
    },
    saveRecording() {
      if (!this.recordedBlob) return;
      const defaultPath = `duskhaven-cinematic-${Date.now()}.webm`;
      const outputPath = dialog.showSaveDialogSync({
        title: 'Save Duskhaven Cinematic',
        defaultPath,
        filters: [{ name: 'WebM Video', extensions: ['webm'] }],
      });
      if (!outputPath) return;

      this.outputPath = outputPath;
      blobToBuffer(this.recordedBlob).then((buffer) => {
        fs.writeFileSync(this.outputPath, buffer);
        this.status = 'Saved';
        this.hint = `Saved to ${this.outputPath}`;
        this.isRecording = false;
        this.stopPreview();
      }).catch((error) => {
        this.status = 'Save error';
        this.hint = error.message;
        this.isRecording = false;
        this.stopPreview();
      });
    },
    clearRecording() {
      if (this.recordedUrl) URL.revokeObjectURL(this.recordedUrl);
      this.recordedBlob = null;
      this.recordedUrl = null;
      this.outputPath = null;
    },
    clearRecordingTimeout() {
      if (!this.timeout) return;
      clearTimeout(this.timeout);
      this.timeout = null;
    },
    stopPreview() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      if (this.canvasStream) {
        this.canvasStream.getTracks().forEach(track => track.stop());
        this.canvasStream = null;
      }
      if (this.drawFrame) {
        cancelAnimationFrame(this.drawFrame);
        this.drawFrame = null;
      }
      if (this.sourceVideo) {
        this.sourceVideo.srcObject = null;
        this.sourceVideo = null;
      }
      if (this.$refs.preview) this.$refs.preview.srcObject = null;
      this.mediaRecorder = null;
    },
  },
};
</script>

<style scoped>
.cinematic-export {
  padding-top: 18px;
}

.export-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 18px;
}

.export-title {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  margin: 0 0 8px;
}

.export-subtitle {
  color: #c6d0e2;
  font-size: 15px;
  line-height: 1.35;
  margin: 0;
}

.export-layout {
  align-items: start;
  display: grid;
  gap: 14px;
  grid-template-columns: 220px 1fr;
}

.source-panel,
.record-panel {
  background: #10141c;
  border: 1px solid #273249;
  padding: 16px;
}

.source-panel {
  align-self: start;
}

.export-panel-heading {
  color: #40e7f1;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.source-list {
  display: grid;
  gap: 10px;
  max-height: 74px;
  overflow-y: auto;
  padding-right: 4px;
}

.source-option {
  align-items: center;
  background: #161b26;
  border: 1px solid #273249;
  color: #e8e8ea;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-columns: 64px 1fr;
  padding: 8px;
  text-align: left;
}

.source-option:hover,
.source-option.is-selected {
  border-color: #40e7f1;
  box-shadow: 0 0 14px rgba(64, 231, 241, 0.18);
}

.source-option img {
  background: #0b1018;
  height: 36px;
  object-fit: cover;
  width: 64px;
}

.source-option span {
  font-size: 13px;
  line-height: 1.2;
}

.source-empty {
  border: 1px solid #273249;
  color: #93a2bd;
  font-size: 13px;
  line-height: 1.35;
  padding: 14px;
}

.preview {
  background: #070b11;
  border: 1px solid #273249;
  height: 430px;
  object-fit: contain;
  width: 100%;
}

.record-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, 1fr);
  margin: 14px 0;
}

.record-value,
.record-input {
  background: #161b26;
  border: 1px solid #273249;
  color: #fff;
  min-height: 38px;
  padding: 8px 10px;
}

.record-input {
  font: inherit;
  outline: none;
  width: 100%;
}

.record-input:focus {
  border-color: #40e7f1;
  box-shadow: 0 0 12px rgba(64, 231, 241, 0.18);
}

.autoplay-toggle {
  margin: 10px 0 14px;
}

.actions {
  display: flex;
  gap: 10px;
}

.button,
.action-button {
  transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.action-button {
  background: #10141c;
  border: 1px solid #273249;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  min-width: 104px;
  padding: 10px 16px;
}

.refresh-button,
.record-button {
  border-color: #40e7f1;
}

.refresh-button:hover,
.record-button:hover {
  background: #123947;
  border-color: #62f2fb;
  box-shadow: 0 0 16px rgba(64, 231, 241, 0.22);
}

.stop-button:hover,
.save-button:hover {
  background: #161b26;
  border-color: #40e7f1;
}

.button[disabled],
.action-button[disabled] {
  cursor: not-allowed;
  opacity: 0.55;
}

.hint {
  color: #93a2bd;
  font-size: 13px;
  margin-top: 12px;
}
</style>
