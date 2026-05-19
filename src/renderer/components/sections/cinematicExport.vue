<template>
  <div>
    <div class="tabs is-boxed">
      <spectateMenu></spectateMenu>
    </div>

    <div class="container cinematic-export">
      <div class="export-header">
        <div>
          <h1 class="export-title">运镜导出</h1>
          <p class="export-subtitle">在 Duskhaven Studio 播放运镜时录制魔兽世界游戏窗口。</p>
        </div>
        <button class="button refresh-button" v-on:click="loadSources" :disabled="isRecording">
          刷新源
        </button>
      </div>

      <div class="export-layout">
        <section class="source-panel">
          <div class="export-panel-heading">捕获源</div>
          <div class="source-list">
            <div v-if="!sources.length" class="source-empty">
              未找到魔兽世界窗口。
            </div>
            <button
              v-for="source in sources"
              v-bind:key="source.id"
              class="source-option"
              v-bind:class="{ 'is-selected': selectedSource && selectedSource.id === source.id }"
              v-on:click="selectSource(source)"
              :disabled="isRecording"
            >
              <img v-if="source.thumbnail" v-bind:src="source.thumbnail" v-bind:alt="source.name">
              <span v-else class="source-screen-icon"></span>
              <span>{{ source.name }}</span>
            </button>
          </div>

          <div class="crop-panel">
            <div class="export-panel-heading">裁剪导出</div>
            <p class="crop-hint">{{ cropHint }}</p>
            <div class="crop-actions">
              <button class="log-button" v-if="!isCropping" v-on:click="startCropEditor" :disabled="isRecording || !hasRecording">选择裁剪区域</button>
              <button class="log-button crop-confirm-button" v-if="isCropping" v-on:click="confirmCrop" :disabled="isRecording">确认裁剪</button>
              <button class="log-button" v-on:click="resetCrop" :disabled="isRecording">重置</button>
              <button class="log-button" v-on:click="useWindowClientCrop" :disabled="isRecording || !recordingBounds">使用游戏区域</button>
            </div>
          </div>
        </section>

        <section class="record-panel">
          <div class="export-panel-heading">录制</div>

          <div v-show="isRecording" class="preview recording-slate">
            <div class="recording-dot"></div>
            <div>
              <strong>正在录制运镜</strong>
              <span>实时预览已暂停以保证导出质量。</span>
            </div>
          </div>

          <div v-show="!isRecording" ref="previewShell" class="preview-shell" v-on:click="togglePreviewPlaybackFromShell">
            <video
              ref="preview"
              class="preview"
              v-bind:class="{ 'is-crop-preview': hasRecording && hasActiveCrop && !isCropping }"
              v-bind:style="previewCropStyle"
              v-bind:src="recordedUrl"
              v-bind:controls="hasRecording && !isCropping && !isCropPreview"
              autoplay
              muted
              v-on:canplay="onPreviewMetadata"
              v-on:durationchange="onPreviewMetadata"
              v-on:ended="previewPaused = true"
              v-on:loadeddata="onPreviewMetadata"
              v-on:loadedmetadata="onPreviewMetadata"
              v-on:pause="previewPaused = true"
              v-on:play="previewPaused = false"
              v-on:timeupdate="syncPreviewTime"
            ></video>
            <div v-if="isCropPreview" class="preview-controls">
              <div class="preview-scrub-row">
                <span class="preview-time">{{ formattedPreviewCurrentTime }}</span>
                <input
                  class="preview-scrubber"
                  type="range"
                  min="0"
                  v-bind:max="previewDuration || 0"
                  step="0.01"
                  v-bind:value="previewCurrentTime"
                  v-on:click.stop
                  v-on:input="seekPreview"
                >
                <span class="preview-time">{{ formattedPreviewDuration }}</span>
              </div>
              <div class="preview-button-row">
                <button class="preview-control-button" type="button" v-on:click.stop="togglePreviewPlayback">
                  {{ previewPaused ? '播放' : '暂停' }}
                </button>
                <button
                  class="preview-control-button icon-button"
                  type="button"
                  v-bind:aria-label="previewFullscreen ? '退出全屏预览' : '全屏预览'"
                  v-bind:title="previewFullscreen ? '退出全屏' : '全屏'"
                  v-on:click.stop="togglePreviewFullscreen"
                >
                  <span v-if="!previewFullscreen" class="preview-icon preview-icon-maximize"></span>
                  <span v-else class="preview-icon preview-icon-minimize"></span>
                </button>
              </div>
            </div>
            <div v-if="hasRecording && isCropping" class="crop-editor" v-on:click.stop>
              <div class="crop-shade"></div>
              <div
                class="crop-box"
                v-bind:style="cropBoxStyle"
                v-on:mousedown.prevent="startCropDrag($event, 'move')"
              >
                <span class="crop-handle crop-handle-nw" v-on:mousedown.stop.prevent="startCropDrag($event, 'nw')"></span>
                <span class="crop-handle crop-handle-n" v-on:mousedown.stop.prevent="startCropDrag($event, 'n')"></span>
                <span class="crop-handle crop-handle-ne" v-on:mousedown.stop.prevent="startCropDrag($event, 'ne')"></span>
                <span class="crop-handle crop-handle-e" v-on:mousedown.stop.prevent="startCropDrag($event, 'e')"></span>
                <span class="crop-handle crop-handle-se" v-on:mousedown.stop.prevent="startCropDrag($event, 'se')"></span>
                <span class="crop-handle crop-handle-s" v-on:mousedown.stop.prevent="startCropDrag($event, 's')"></span>
                <span class="crop-handle crop-handle-sw" v-on:mousedown.stop.prevent="startCropDrag($event, 'sw')"></span>
                <span class="crop-handle crop-handle-w" v-on:mousedown.stop.prevent="startCropDrag($event, 'w')"></span>
                <span class="crop-label">保留此区域</span>
              </div>
            </div>
          </div>

          <div class="record-grid">
            <div>
              <label class="label">时长</label>
              <input
                class="record-input"
                type="number"
                min="1"
                step="1"
                v-model.number="recordingDuration"
                :disabled="isRecording"
              >
            </div>
            <div>
              <label class="label">格式</label>
              <div class="record-value">MP4 母带</div>
            </div>
            <div>
              <label class="label">路径点</label>
              <div class="record-value">{{ cinematicSteps.length }}</div>
            </div>
            <div>
              <label class="label">状态</label>
              <div class="record-value">{{ status }}</div>
            </div>
          </div>

          <div class="actions">
            <button
              class="action-button record-button"
              v-on:click="startRecording"
              :disabled="!canRecord"
            >
              录制
            </button>
            <button
              class="action-button stop-button"
              v-on:click="stopRecording"
              :disabled="!isRecording"
            >
              停止
            </button>
            <button
              class="action-button save-button"
              v-on:click="saveRecording"
              :disabled="!hasRecording || isRecording"
            >
              {{ saveButtonLabel }}
            </button>
          </div>

          <p class="hint">{{ hint }}</p>
          <div v-if="ffmpegLog" class="ffmpeg-log-panel">
            <div class="ffmpeg-log-header">
              <span>FFmpeg 日志</span>
              <div>
                <button class="log-button" v-on:click="copyFfmpegLog">复制</button>
                <button class="log-button" v-on:click="clearFfmpegLog">清除</button>
              </div>
            </div>
            <pre class="ffmpeg-log">{{ ffmpegLog }}</pre>
          </div>
          <pre v-if="lastError" class="error-details">{{ lastError }}</pre>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
const { clipboard, desktopCapturer, ipcRenderer } = require('electron');
const { dialog } = require('@electron/remote');
const remote = require('@electron/remote');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_WINDOW_WIDTH = 1360;
const DEFAULT_WINDOW_HEIGHT = 430;
const DEFAULT_MIN_WIDTH = 1180;
const DEFAULT_MIN_HEIGHT = 410;
const EXPORT_BITRATE = 120000000;
const CAPTURE_FRAME_RATE = 120;
const EXPORT_FRAME_RATE = 60;
const WINDOW_TITLE_CROP_TOP = 40;
const EXPORT_WINDOW_WIDTH = 1500;
const EXPORT_WINDOW_HEIGHT = 900;
const EXPORT_MIN_WIDTH = 1300;
const EXPORT_MIN_HEIGHT = 760;

const EXPORT_PROFILES = {
  'mp4-master': {
      label: 'MP4 母带',
      description: '高质量 MP4 导出，适用于编辑、上传和存档。',
    extension: 'mp4',
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
    videoFilter: `fps=${EXPORT_FRAME_RATE},setpts=N/(${EXPORT_FRAME_RATE}*TB)`,
    ffmpegArgs: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv420p', '-fps_mode', 'cfr', '-bf', '0', '-g', String(EXPORT_FRAME_RATE), '-keyint_min', String(EXPORT_FRAME_RATE), '-movflags', '+faststart', '-an'],
  },
};

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
    'video/webm; codecs=vp8',
    'video/webm; codecs=vp9',
    'video/webm',
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function getFfmpegPath() {
  const ffmpegPath = require('ffmpeg-static');
  if (!ffmpegPath) return null;
  return ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}

function runFfmpeg(args, onLog) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();
    if (!ffmpegPath) {
      reject(new Error('未找到内置的 ffmpeg 二进制文件。'));
      return;
    }

    const ffmpeg = childProcess.spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    if (onLog) onLog(`> ${ffmpegPath} ${args.join(' ')}\n`);

    ffmpeg.stdout.on('data', data => {
      const text = data.toString();
      stdout += text;
      if (onLog) onLog(text);
    });

    ffmpeg.stderr.on('data', data => {
      const text = data.toString();
      stderr += text;
      if (onLog) onLog(text);
    });

    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(stderr || `ffmpeg 退出，错误码 ${code}`);
        error.ffmpegArgs = args;
        reject(error);
        return;
      }
      resolve({ stdout, stderr, output: `${stdout}\n${stderr}` });
    });
  });
}

function runFfmpegOptional(args, onLog) {
  return runFfmpeg(args, onLog).catch((error) => {
    if (onLog) onLog(`\n分析警告: ${error.message}\n`);
    return null;
  });
}

function parseTimestamp(value) {
  if (!value || value === 'N/A') return 0;
  const parts = value.split(':').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function getLastFrameProgress(output) {
  if (!output) return null;
  const matches = output.match(/frame=\s*\d+[^\r\n]*/g);
  if (!matches || !matches.length) return null;
  const last = matches[matches.length - 1];
  const frameMatch = last.match(/frame=\s*(\d+)/);
  const timeMatch = last.match(/time=([^\s]+)/);
  if (!frameMatch) return null;
  const frames = Number(frameMatch[1]);
  const seconds = timeMatch ? parseTimestamp(timeMatch[1]) : 0;
  return { frames, seconds };
}

function getVfrSummary(output) {
  if (!output) return null;
  const match = output.match(/VFR:([^\s]+)\s+\((\d+)\/(\d+)\)\s+min:\s*(\d+)\s+max:\s*(\d+)\s+avg:\s*(\d+)/);
  if (!match) return null;
  return {
    ratio: match[1],
    variableFrames: Number(match[2]),
    constantFrames: Number(match[3]),
    minMs: Number(match[4]),
    maxMs: Number(match[5]),
    avgMs: Number(match[6]),
  };
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
    recordingDuration: {
      get() {
        return this.cinematicDuration;
      },
      set(value) {
        const duration = Number(value);
        const normalizedDuration = Number.isFinite(duration) && duration > 0
          ? Math.max(1, Math.round(duration))
          : 10;
        this.$store.commit('setCinematicSpeed', normalizedDuration);
      },
    },
    saveButtonLabel() {
      return '保存 MP4';
    },
    cropBoxStyle() {
      const metrics = this.getPreviewMetrics();
      if (!metrics) return {};

      const crop = this.getNormalizedCrop();
      const x = metrics.videoLeft + crop.left * metrics.scaleX;
      const y = metrics.videoTop + crop.top * metrics.scaleY;
      const width = (metrics.videoWidth - crop.left - crop.right) * metrics.scaleX;
      const height = (metrics.videoHeight - crop.top - crop.bottom) * metrics.scaleY;

      return {
        height: `${Math.max(24, height)}px`,
        left: `${x}px`,
        top: `${y}px`,
        width: `${Math.max(24, width)}px`,
      };
    },
    cropHint() {
      if (this.isCropping) return '拖动裁剪框选择你要保留的预览区域，然后确认裁剪。';
      if (this.hasRecording && this.hasActiveCrop) return '预览正在显示已确认的裁剪区域。保存前可重新选择裁剪进行调整。';
      if (this.hasRecording) return '选择裁剪区域可在保存前直接在预览上绘制最终画面。';
      return '请先录制预览，然后在视频上选择裁剪区域。';
    },
    hasActiveCrop() {
      const crop = this.getNormalizedCrop();
      return crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;
    },
    isCropPreview() {
      return this.hasRecording && this.hasActiveCrop && !this.isCropping;
    },
    formattedPreviewCurrentTime() {
      return this.formatPreviewTime(this.previewCurrentTime);
    },
    formattedPreviewDuration() {
      return this.formatPreviewTime(this.previewDuration);
    },
    previewCropStyle() {
      if (!this.isCropPreview) return {};

      const videoWidth = this.previewVideoSize.width || 0;
      const videoHeight = this.previewVideoSize.height || 0;
      if (!videoWidth || !videoHeight) return {};

      const crop = this.getNormalizedCrop();
      const keepWidth = Math.max(1, videoWidth - crop.left - crop.right);
      const keepHeight = Math.max(1, videoHeight - crop.top - crop.bottom);
      const scaleX = videoWidth / keepWidth;
      const scaleY = videoHeight / keepHeight;

      return {
        height: `${scaleY * 100}%`,
        left: `${-(crop.left / keepWidth) * 100}%`,
        maxWidth: 'none',
        objectFit: 'fill',
        position: 'absolute',
        top: `${-(crop.top / keepHeight) * 100}%`,
        width: `${scaleX * 100}%`,
      };
    },
  },
  data() {
    return {
      chunks: [],
      crop: {
        bottom: 0,
        left: 0,
        right: 0,
        top: WINDOW_TITLE_CROP_TOP,
      },
      ffmpegLog: '',
      hint: '打开魔兽世界，如果游戏窗口未列出请刷新源。',
      isCropping: false,
      isRecording: false,
      lastError: '',
      mediaRecorder: null,
      outputPath: null,
      previewVideoSize: {
        height: 0,
        width: 0,
      },
      previewCurrentTime: 0,
      previewDuration: 0,
      previewFullscreen: false,
      previewPaused: true,
      recordingBounds: null,
      recordingCaptureId: null,
      recordingStartedAt: null,
      recordedBlob: null,
      recordedUrl: null,
      recordingMimeType: '',
      selectedSource: null,
      sources: [],
      status: '就绪',
      stream: null,
      timeout: null,
      wasLooping: false,
      cropDrag: null,
    };
  },
  mounted() {
    this.expandWindow();
    this.loadSources();
    document.addEventListener('fullscreenchange', this.syncPreviewFullscreen);
    document.addEventListener('keydown', this.handlePreviewKeydown, true);
    document.addEventListener('keyup', this.handlePreviewKeydown, true);
  },
  destroyed() {
    document.removeEventListener('fullscreenchange', this.syncPreviewFullscreen);
    document.removeEventListener('keydown', this.handlePreviewKeydown, true);
    document.removeEventListener('keyup', this.handlePreviewKeydown, true);
    this.clearRecordingTimeout();
    this.stopCropDrag();
    this.stopPreview();
    this.clearRecording();
    this.restoreWindow();
  },
  beforeRouteLeave(to, from, next) {
    this.restoreWindow();
    next();
  },
  methods: {
    expandWindow() {
      const win = remote.getCurrentWindow();
      const bounds = win.getBounds();
      const display = remote.screen.getDisplayMatching(bounds);
      const workArea = display && display.workAreaSize ? display.workAreaSize : { width: EXPORT_WINDOW_WIDTH, height: EXPORT_WINDOW_HEIGHT };
      const maxWidth = Math.max(DEFAULT_MIN_WIDTH, workArea.width - 24);
      const maxHeight = Math.max(DEFAULT_MIN_HEIGHT, workArea.height - 24);
      const width = Math.min(Math.max(bounds.width, EXPORT_WINDOW_WIDTH), maxWidth);
      const height = Math.min(Math.max(bounds.height, EXPORT_WINDOW_HEIGHT), maxHeight);
      win.setMinimumSize(Math.min(EXPORT_MIN_WIDTH, width), Math.min(EXPORT_MIN_HEIGHT, height));
      win.setSize(width, height);
    },
    restoreWindow() {
      const win = remote.getCurrentWindow();
      if (!win || win.isDestroyed()) return;
      win.setMinimumSize(DEFAULT_MIN_WIDTH, DEFAULT_MIN_HEIGHT);
      win.setSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT);
    },
    loadSources() {
      this.status = '加载源中';
      this.lastError = '';
      this.hint = '正在查找魔兽世界窗口。';

      const sourceTimeout = setTimeout(() => {
        if (this.status === 'Loading sources') {
          this.status = '仍在加载';
          this.hint = '源发现耗时超出预期。请确保魔兽世界已打开后尝试刷新源。';
        }
      }, 3000);

      this.getCaptureSources().then((sources) => {
        clearTimeout(sourceTimeout);
        this.sources = this.filterCaptureSources(sources);
        this.selectedSource = this.sources[0] || null;
        this.status = this.selectedSource ? '就绪' : '未找到源';
        this.hint = this.selectedSource
          ? '已准备好录制游戏窗口。'
          : '未找到可捕获的魔兽世界窗口。请打开魔兽世界，使用窗口或无边框模式，然后刷新源。';
      }).catch((error) => {
        clearTimeout(sourceTimeout);
        this.status = '源错误';
        this.hint = error.message;
      });
    },
    filterCaptureSources(sources) {
      return sources.filter(source => {
        const captureId = source.captureId || source.id;
        const isWindow = source.type === 'window'
          && source.captureMode === 'window'
          && source.id.indexOf('window:') === 0
          && captureId.indexOf('window:') === 0;
        const isWow = source.name.toLowerCase().indexOf('world of warcraft') !== -1;
        return isWindow && isWow;
      });
    },
    getCaptureSources() {
      if (ipcRenderer && ipcRenderer.invoke) {
        return ipcRenderer.invoke('duskhaven:get-capture-sources').then(sources => {
          return sources.map(source => {
            const captureId = source.captureId || source.id;
            return Object.assign({}, source, {
              type: 'window',
              captureMode: 'window',
              captureId,
            });
          });
        });
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
      this.recordingDuration = this.recordingDuration;
    },
    startRecording() {
      this.normalizeRecordingDuration();
      this.clearRecording();
      this.status = '启动中';
      this.ffmpegLog = '';
      this.lastError = '';
      this.hint = '录制前聚焦魔兽世界窗口。';
      this.appendFfmpegLog('准备捕获...\n');
      this.setRecordingPowerSave(true);
      this.focusSelectedSource().then((focused) => {
        this.appendFfmpegLog(`Focus request before capture: ${focused ? 'accepted' : 'not confirmed'}\n`);
        return new Promise(resolve => setTimeout(resolve, 850));
      }).then(() => this.prepareCaptureTarget()).then(() => this.createStream()).then((stream) => {
        this.stream = stream;
        this.chunks = [];
        this.logCaptureSettings(stream);

        const mimeType = getMimeType();
        this.recordingMimeType = mimeType;
        const options = { videoBitsPerSecond: EXPORT_BITRATE };
        if (mimeType) options.mimeType = mimeType;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && 'contentHint' in videoTrack) videoTrack.contentHint = 'motion';

        const recorder = new MediaRecorder(stream, options);
        this.mediaRecorder = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) this.chunks.push(event.data);
        };
        recorder.onstop = this.prepareRecordingPreview;
        return this.focusSelectedSource().then((focused) => {
          this.appendFfmpegLog(`Focus request before recorder start: ${focused ? 'accepted' : 'not confirmed'}\n`);
          return new Promise(resolve => setTimeout(resolve, 250));
        }).then(() => {
          this.recordingStartedAt = Date.now();
          recorder.start(100);

          this.isRecording = true;
          this.status = '录制中';
          this.hint = '正在录制聚焦的游戏窗口。保存的文件将在之后进行裁剪。';
          this.playCinematicForExport();
          this.focusSelectedSource();
          this.timeout = setTimeout(this.stopRecording, this.recordingDuration * 1000);
        });
      }).catch((error) => {
        this.setRecordingPowerSave(false);
        this.isRecording = false;
        this.status = '录制错误';
        this.hint = error.message;
        this.stopPreview();
      });
    },
    setRecordingPowerSave(enabled) {
      if (!ipcRenderer || !ipcRenderer.invoke) return Promise.resolve(false);
      return ipcRenderer.invoke('duskhaven:set-recording-power-save-blocker', enabled).catch(() => false);
    },
    focusSelectedSource() {
      if (!ipcRenderer || !ipcRenderer.invoke || !this.selectedSource) return Promise.resolve(false);
      return ipcRenderer.invoke('duskhaven:focus-capture-window', this.selectedSource.id);
    },
    getWindowBounds() {
      if (!ipcRenderer || !ipcRenderer.invoke || !this.selectedSource) return Promise.resolve(null);
      return ipcRenderer.invoke('duskhaven:get-window-bounds', this.selectedSource.id);
    },
    prepareCaptureTarget() {
      this.recordingCaptureId = this.selectedSource.captureId || this.selectedSource.id;
      this.recordingBounds = null;

      if (!this.recordingCaptureId || this.recordingCaptureId.indexOf('window:') !== 0) {
        throw new Error('捕获源不是魔兽世界应用程序窗口。请刷新源并重新选择魔兽世界窗口。');
      }

      return this.getWindowBounds().then((bounds) => {
        if (bounds) {
          this.recordingBounds = bounds;
          this.useWindowClientCrop();
        }
        this.appendFfmpegLog('Capture mode: application window\n');
        this.appendFfmpegLog(`Capture source: ${this.recordingCaptureId}\n`);
        if (bounds) {
          this.appendFfmpegLog(`Window bounds: ${JSON.stringify(bounds)}\n`);
        }
      });
    },
    logCaptureSettings(stream) {
      const track = stream.getVideoTracks()[0];
      if (!track || !track.getSettings) return;
      this.appendFfmpegLog(`Capture track settings: ${JSON.stringify(track.getSettings())}\n`);
    },
    createStream() {
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: this.recordingCaptureId || this.selectedSource.id,
            minWidth: 1280,
            minHeight: 720,
            maxWidth: 3840,
            maxHeight: 2160,
            minFrameRate: EXPORT_FRAME_RATE,
            maxFrameRate: CAPTURE_FRAME_RATE,
          },
        },
      };
      return navigator.mediaDevices.getUserMedia(constraints);
    },
    playCinematicForExport() {
      this.wasLooping = this.$store.state.camera.loopCinematic;
      if (this.wasLooping) this.$store.commit('setLoopCinematic', false);
      window.dispatchEvent(new CustomEvent('duskhaven-play-cinematic-from-start'));
    },
    stopRecording() {
      this.clearRecordingTimeout();
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
      this.status = '准备预览';
      this.mediaRecorder.stop();
      if (this.wasLooping) this.$store.commit('setLoopCinematic', true);
    },
    prepareRecordingPreview() {
      if (!this.chunks.length) {
        this.status = '录制错误';
        this.lastError = 'MediaRecorder 未从选中的魔兽世界窗口返回任何视频数据。';
        this.hint = '未捕获到视频数据。请确保魔兽世界窗口可见且聚焦后重新录制。';
        this.isRecording = false;
        this.setRecordingPowerSave(false);
        this.stopPreview();
        return;
      }

      const blob = new Blob(this.chunks, { type: this.recordingMimeType || 'application/octet-stream' });
      const elapsed = this.recordingStartedAt ? ((Date.now() - this.recordingStartedAt) / 1000).toFixed(2) : 'unknown';
      this.appendFfmpegLog(`Recorded chunks: ${this.chunks.length}\n`);
      this.appendFfmpegLog(`Recorded blob size: ${Math.round(blob.size / 1024 / 1024 * 10) / 10} MB\n`);
      this.appendFfmpegLog(`Recorder elapsed time: ${elapsed}s\n`);
      this.recordedBlob = blob;
      this.recordedUrl = URL.createObjectURL(blob);
      this.status = '预览就绪';
      this.lastError = '';
      this.hint = '检查捕获内容，如需裁剪请选择裁剪区域，然后保存最终 MP4。';
      this.isRecording = false;
      this.setRecordingPowerSave(false);
      this.stopPreview();
      this.$nextTick(this.refreshPreviewState);
    },
    saveRecording() {
      if (!this.recordedBlob) return;
      const profile = EXPORT_PROFILES['mp4-master'];
      const defaultPath = `duskhaven-cinematic-${Date.now()}.${profile.extension}`;
      const outputPath = dialog.showSaveDialogSync({
        title: '保存 Duskhaven 运镜',
        defaultPath,
        filters: profile.filters,
      });
      if (!outputPath) return;

      this.outputPath = outputPath;
      this.status = '转码中';
      this.ffmpegLog = '';
      this.lastError = '';
      this.hint = '正在编码最终 MP4 并应用导出裁剪。';

      const transcode = blobToBuffer(this.recordedBlob).then((buffer) => {
        this.appendFfmpegLog(`Input capture size: ${Math.round(buffer.length / 1024 / 1024 * 10) / 10} MB\n`);
        return this.transcodeRecording(buffer, profile, this.outputPath);
      });

      transcode.then(() => {
        this.status = '已保存';
        this.hint = `已保存到 ${this.outputPath}`;
        this.isRecording = false;
        this.stopPreview();
      }).catch((error) => {
        this.status = '保存错误';
        this.lastError = this.getReadableExportError(error);
        this.hint = 'MP4 保存失败。详细的 FFmpeg 错误信息如下。';
        this.isRecording = false;
        this.stopPreview();
      });
    },
    appendFfmpegLog(text) {
      if (!text) return;
      this.ffmpegLog += text;
      if (this.ffmpegLog.length > 60000) {
        this.ffmpegLog = this.ffmpegLog.slice(this.ffmpegLog.length - 60000);
      }
    },
    clearFfmpegLog() {
      this.ffmpegLog = '';
    },
    copyFfmpegLog() {
      if (this.ffmpegLog) clipboard.writeText(this.ffmpegLog);
    },
    getReadableExportError(error) {
      if (!error) return 'Unknown export error.';
      const message = error.message || String(error);
      const lines = message.split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      const usefulLines = lines.filter(line => {
        const lower = line.toLowerCase();
        return lower.indexOf('error') !== -1
          || lower.indexOf('invalid') !== -1
          || lower.indexOf('failed') !== -1
          || lower.indexOf('unknown') !== -1
          || lower.indexOf('not found') !== -1
          || lower.indexOf('unable') !== -1
          || lower.indexOf('could not') !== -1
          || lower.indexOf('encoder') !== -1
          || lower.indexOf('filter') !== -1;
      });
      const summary = (usefulLines.length ? usefulLines : lines).slice(-8).join('\n');
      return summary || message.slice(0, 1200);
    },
    transcodeRecording(buffer, profile, outputPath) {
      const inputTempPath = path.join(os.tmpdir(), `duskhaven-cinematic-capture-${Date.now()}.capture`);
      const cropFilter = this.getExportCropFilter();
      const videoFilter = profile.videoFilter ? `${cropFilter},${profile.videoFilter}` : cropFilter;
      const fallbackVideoFilter = `${cropFilter},fps=${EXPORT_FRAME_RATE},setpts=N/(${EXPORT_FRAME_RATE}*TB)`;
      const outputTempPath = `${outputPath}.encoding.mp4`;
      fs.writeFileSync(inputTempPath, buffer);
      const logFfmpeg = text => this.appendFfmpegLog(text);
      this.appendFfmpegLog(`Export crop: ${this.getCropSummary()}\n`);
      const inputProbeArgs = ['-hide_banner', '-probesize', '100M', '-analyzeduration', '100M', '-i', inputTempPath];
      const cadenceArgs = inputProbeArgs.concat(['-map', '0:v:0', '-vf', 'vfrdet', '-an', '-f', 'null', '-']);
      const duplicateArgs = inputProbeArgs.concat(['-map', '0:v:0', '-vf', 'mpdecimate', '-an', '-f', 'null', '-']);
      const primaryArgs = ['-y', '-probesize', '100M', '-analyzeduration', '100M', '-i', inputTempPath, '-vf', videoFilter]
        .concat(profile.ffmpegArgs, ['-f', 'mp4', outputTempPath]);
      const fallbackArgs = ['-y', '-probesize', '100M', '-analyzeduration', '100M', '-i', inputTempPath, '-vf', fallbackVideoFilter]
        .concat(['-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv420p', '-fps_mode', 'cfr', '-bf', '0', '-g', String(EXPORT_FRAME_RATE), '-keyint_min', String(EXPORT_FRAME_RATE), '-movflags', '+faststart', '-an', '-f', 'mp4', outputTempPath]);

      const runExport = () => {
        this.appendFfmpegLog('\n分析捕获帧率节奏...\n');
        return runFfmpegOptional(cadenceArgs, logFfmpeg).then((cadenceResult) => {
          this.appendCaptureCadenceSummary(cadenceResult);
          this.appendFfmpegLog('\n检查重复/静止帧...\n');
          return runFfmpegOptional(duplicateArgs, logFfmpeg);
        }).then((duplicateResult) => {
          this.appendDuplicateFrameSummary(duplicateResult);
          this.appendFfmpegLog('\n执行主 MP4 编码...\n');
          return runFfmpeg(primaryArgs, logFfmpeg).catch((primaryError) => {
            if (fs.existsSync(outputTempPath)) {
              try {
                fs.unlinkSync(outputTempPath);
              } catch (cleanupError) {
                // Keep the original ffmpeg error visible to the user.
              }
            }
            this.appendFfmpegLog('\n主编码失败。执行备用 MP4 编码...\n');
            return runFfmpeg(fallbackArgs, logFfmpeg).catch((fallbackError) => {
              fallbackError.message = `${fallbackError.message}\n\nPrimary encode also failed:\n${primaryError.message}`;
              throw fallbackError;
            });
          });
        });
      };

      return runExport().then(() => {
        const stats = fs.existsSync(outputTempPath) ? fs.statSync(outputTempPath) : null;
        if (!stats || stats.size <= 0) {
          throw new Error('MP4 导出完成但没有视频数据。');
        }
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        fs.renameSync(outputTempPath, outputPath);
        this.appendFfmpegLog(`\n已保存 MP4: ${outputPath}\n`);
      }).then(() => {
        if (fs.existsSync(inputTempPath)) fs.unlinkSync(inputTempPath);
      }).catch((error) => {
        if (fs.existsSync(inputTempPath)) {
          try {
            fs.unlinkSync(inputTempPath);
          } catch (cleanupError) {
            // Keep the original ffmpeg error visible to the user.
          }
        }
        if (fs.existsSync(outputTempPath)) {
          try {
            fs.unlinkSync(outputTempPath);
          } catch (cleanupError) {
            // Keep the original ffmpeg error visible to the user.
          }
        }
        throw error;
      });
    },
    appendCaptureCadenceSummary(result) {
      if (!result || !result.output) return;
      const progress = getLastFrameProgress(result.output);
      const vfr = getVfrSummary(result.output);
      if (!progress || !progress.seconds) return;

      const averageFps = progress.frames / progress.seconds;
      this.appendFfmpegLog(`\n捕获摘要: ${progress.frames} 帧，${progress.seconds.toFixed(2)}秒 (平均 ${averageFps.toFixed(1)} fps)。\n`);
      if (vfr) {
        this.appendFfmpegLog(`帧间隔: 平均 ${vfr.avgMs}ms, 最小 ${vfr.minMs}ms, 最大 ${vfr.maxMs}ms。最大间隔越小越流畅；16-17ms 为真正的 60fps 帧率。\n`);
      }
    },
    appendDuplicateFrameSummary(result) {
      if (!result || !result.output) return;
      const progress = getLastFrameProgress(result.output);
      if (!progress || !progress.seconds) return;

      const uniqueFps = progress.frames / progress.seconds;
      this.appendFfmpegLog(`唯一帧检测: ${progress.frames} 帧通过重复检测 (有效运动 ${uniqueFps.toFixed(1)} fps)。\n`);
    },
    onPreviewMetadata() {
      this.refreshPreviewState();
    },
    refreshPreviewState() {
      const preview = this.$refs.preview;
      if (!preview) return;
      this.previewVideoSize = {
        height: preview.videoHeight || 0,
        width: preview.videoWidth || 0,
      };
      this.previewDuration = Number.isFinite(preview.duration) ? preview.duration : 0;
      this.previewCurrentTime = Number.isFinite(preview.currentTime) ? preview.currentTime : 0;
    },
    syncPreviewTime() {
      const preview = this.$refs.preview;
      if (!preview) return;
      this.previewCurrentTime = Number.isFinite(preview.currentTime) ? preview.currentTime : 0;
      this.previewDuration = Number.isFinite(preview.duration) ? preview.duration : this.previewDuration;
    },
    seekPreview(event) {
      const preview = this.$refs.preview;
      if (!preview) return;
      const time = Number(event.target.value);
      if (!Number.isFinite(time)) return;
      preview.currentTime = Math.max(0, Math.min(this.previewDuration || time, time));
      this.previewCurrentTime = preview.currentTime;
    },
    formatPreviewTime(value) {
      const seconds = Number.isFinite(value) ? Math.max(0, value) : 0;
      const minutes = Math.floor(seconds / 60);
      const remainder = Math.floor(seconds % 60);
      return `${minutes}:${String(remainder).padStart(2, '0')}`;
    },
    startCropEditor() {
      if (!this.hasRecording) return;
      this.onPreviewMetadata();
      this.isCropping = true;
      this.hint = '在预览上调整裁剪框，然后确认后再保存。';
    },
    confirmCrop() {
      this.isCropping = false;
      this.hint = `裁剪已确认: ${this.getCropSummary()}。预览满意后保存 MP4。`;
      this.$nextTick(this.onPreviewMetadata);
    },
    togglePreviewPlaybackFromShell(event) {
      if (!this.isCropPreview) return;
      if (event && event.target && event.target.closest && event.target.closest('.preview-controls')) return;
      this.togglePreviewPlayback();
    },
    togglePreviewPlayback() {
      const preview = this.$refs.preview;
      if (!preview) return;
      if (preview.paused || preview.ended) {
        preview.play();
      } else {
        preview.pause();
      }
    },
    togglePreviewFullscreen() {
      const shell = this.$refs.previewShell;
      if (!shell) return;
      if (document.fullscreenElement === shell && document.exitFullscreen) {
        document.exitFullscreen();
        return;
      }
      if (shell.requestFullscreen) shell.requestFullscreen();
    },
    syncPreviewFullscreen() {
      this.previewFullscreen = Boolean(document.fullscreenElement);
    },
    handlePreviewKeydown(event) {
      if (event.key !== 'Escape') return;
      const win = remote.getCurrentWindow();
      if (!document.fullscreenElement && !(win && win.isFullScreen && win.isFullScreen())) return;
      event.preventDefault();
      event.stopPropagation();
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
        return;
      }
      if (win && win.isFullScreen && win.isFullScreen()) {
        win.setFullScreen(false);
      }
    },
    getPreviewMetrics() {
      const preview = this.$refs.preview;
      const shell = this.$refs.previewShell;
      const videoWidth = this.previewVideoSize.width || (preview && preview.videoWidth) || 0;
      const videoHeight = this.previewVideoSize.height || (preview && preview.videoHeight) || 0;
      if (!preview || !shell || !videoWidth || !videoHeight) return null;

      const shellWidth = shell.clientWidth;
      const shellHeight = shell.clientHeight;
      if (!shellWidth || !shellHeight) return null;

      const fitScale = Math.min(shellWidth / videoWidth, shellHeight / videoHeight);
      const displayWidth = videoWidth * fitScale;
      const displayHeight = videoHeight * fitScale;
      const videoLeft = (shellWidth - displayWidth) / 2;
      const videoTop = (shellHeight - displayHeight) / 2;

      return {
        scaleX: displayWidth / videoWidth,
        scaleY: displayHeight / videoHeight,
        videoHeight,
        videoLeft,
        videoTop,
        videoWidth,
      };
    },
    startCropDrag(event, mode) {
      const metrics = this.getPreviewMetrics();
      if (!metrics) return;

      this.cropDrag = {
        crop: Object.assign({}, this.getNormalizedCrop()),
        mode,
        startX: event.clientX,
        startY: event.clientY,
        metrics,
      };
      document.addEventListener('mousemove', this.moveCropDrag);
      document.addEventListener('mouseup', this.stopCropDrag);
    },
    moveCropDrag(event) {
      if (!this.cropDrag) return;
      const drag = this.cropDrag;
      const dx = (event.clientX - drag.startX) / drag.metrics.scaleX;
      const dy = (event.clientY - drag.startY) / drag.metrics.scaleY;
      const crop = Object.assign({}, drag.crop);
      const mode = drag.mode;

      if (mode === 'move') {
        const keepWidth = drag.metrics.videoWidth - crop.left - crop.right;
        const keepHeight = drag.metrics.videoHeight - crop.top - crop.bottom;
        crop.left = Math.max(0, Math.min(drag.metrics.videoWidth - keepWidth, crop.left + dx));
        crop.right = drag.metrics.videoWidth - crop.left - keepWidth;
        crop.top = Math.max(0, Math.min(drag.metrics.videoHeight - keepHeight, crop.top + dy));
        crop.bottom = drag.metrics.videoHeight - crop.top - keepHeight;
      } else {
        if (mode.indexOf('w') !== -1) crop.left += dx;
        if (mode.indexOf('e') !== -1) crop.right -= dx;
        if (mode.indexOf('n') !== -1) crop.top += dy;
        if (mode.indexOf('s') !== -1) crop.bottom -= dy;
      }

      this.crop = this.clampCrop(crop, drag.metrics.videoWidth, drag.metrics.videoHeight);
    },
    stopCropDrag() {
      if (!this.cropDrag) return;
      document.removeEventListener('mousemove', this.moveCropDrag);
      document.removeEventListener('mouseup', this.stopCropDrag);
      this.cropDrag = null;
    },
    clampCrop(crop, videoWidth, videoHeight) {
      const minWidth = Math.min(160, Math.max(24, videoWidth * 0.1));
      const minHeight = Math.min(90, Math.max(24, videoHeight * 0.1));
      const maxLeftRight = Math.max(0, videoWidth - minWidth);
      const maxTopBottom = Math.max(0, videoHeight - minHeight);

      let left = Math.max(0, Math.round(crop.left));
      let right = Math.max(0, Math.round(crop.right));
      let top = Math.max(0, Math.round(crop.top));
      let bottom = Math.max(0, Math.round(crop.bottom));

      if (left + right > maxLeftRight) {
        if (left > this.crop.left) left = Math.max(0, maxLeftRight - right);
        else right = Math.max(0, maxLeftRight - left);
      }
      if (top + bottom > maxTopBottom) {
        if (top > this.crop.top) top = Math.max(0, maxTopBottom - bottom);
        else bottom = Math.max(0, maxTopBottom - top);
      }

      return { bottom, left, right, top };
    },
    getExportCropFilter() {
      const crop = this.getNormalizedCrop();
      return `crop=floor((iw-${crop.left + crop.right})/2)*2:floor((ih-${crop.top + crop.bottom})/2)*2:${crop.left}:${crop.top}`;
    },
    getNormalizedCrop() {
      return {
        bottom: this.normalizeCropValue(this.crop.bottom),
        left: this.normalizeCropValue(this.crop.left),
        right: this.normalizeCropValue(this.crop.right),
        top: this.normalizeCropValue(this.crop.top),
      };
    },
    normalizeCropValue(value) {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
    },
    getCropSummary() {
      const crop = this.getNormalizedCrop();
      return `top ${crop.top}px, right ${crop.right}px, bottom ${crop.bottom}px, left ${crop.left}px`;
    },
    resetCrop() {
      this.crop = {
        bottom: 0,
        left: 0,
        right: 0,
        top: WINDOW_TITLE_CROP_TOP,
      };
      this.isCropping = false;
      this.hint = '裁剪已重置。如需自定义导出画面，请选择裁剪区域。';
    },
    useWindowClientCrop() {
      if (!this.recordingBounds) return;
      const bounds = this.recordingBounds;
      const scale = bounds.scaleFactor || 1;
      const left = Math.max(0, Math.round((bounds.clientOffsetX || 0) * scale));
      const top = Math.max(0, Math.round((bounds.clientOffsetY || WINDOW_TITLE_CROP_TOP) * scale));
      const right = bounds.clientWidth
        ? Math.max(0, Math.round((bounds.width - (bounds.clientOffsetX || 0) - bounds.clientWidth) * scale))
        : 0;
      const bottom = bounds.clientHeight
        ? Math.max(0, Math.round((bounds.height - (bounds.clientOffsetY || 0) - bounds.clientHeight) * scale))
        : 0;

      this.crop = { bottom, left, right, top };
      this.hint = '裁剪已设置为检测到的魔兽世界游戏区域。';
    },
    clearRecording() {
      if (this.recordedUrl) URL.revokeObjectURL(this.recordedUrl);
      this.recordedBlob = null;
      this.recordedUrl = null;
      this.recordingMimeType = '';
      this.outputPath = null;
      this.recordingBounds = null;
      this.recordingCaptureId = null;
      this.recordingStartedAt = null;
      this.previewCurrentTime = 0;
      this.previewDuration = 0;
      this.previewVideoSize = { height: 0, width: 0 };
      this.isCropping = false;
      this.lastError = '';
    },
    clearRecordingTimeout() {
      if (!this.timeout) return;
      clearTimeout(this.timeout);
      this.timeout = null;
    },
    stopPreview() {
      this.setRecordingPowerSave(false);
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      if (this.$refs.preview) this.$refs.preview.srcObject = null;
      this.mediaRecorder = null;
    },
  },
};
</script>

<style scoped>
.cinematic-export {
  box-sizing: border-box;
  max-width: none;
  padding-top: 18px;
  width: 100%;
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
  grid-template-columns: 220px minmax(0, 1fr);
  max-width: 100%;
  width: 100%;
}

.source-panel,
.record-panel {
  background: #10141c;
  border: 1px solid #273249;
  box-sizing: border-box;
  min-width: 0;
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

.source-screen-icon {
  background: #0b1018;
  border: 1px solid #273249;
  display: block;
  height: 36px;
  position: relative;
  width: 64px;
}

.source-screen-icon::after {
  border: 1px solid #40e7f1;
  content: "";
  height: 20px;
  left: 14px;
  position: absolute;
  top: 6px;
  width: 34px;
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

.preview-shell {
  background: #070b11;
  border: 1px solid #273249;
  box-sizing: border-box;
  height: 430px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.preview {
  background: #070b11;
  border: 0;
  height: 100%;
  object-fit: contain;
  width: 100%;
}

.preview.is-crop-preview {
  pointer-events: none;
  transform: none;
}

.preview-controls {
  background: linear-gradient(to top, rgba(3, 7, 12, 0.92), rgba(3, 7, 12, 0.28), transparent);
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  left: 0;
  opacity: 0;
  padding: 58px 16px 14px;
  pointer-events: none;
  position: absolute;
  right: 0;
  transition: opacity 0.16s ease;
  z-index: 3;
}

.preview-shell:hover .preview-controls,
.preview-controls:focus-within {
  opacity: 1;
  pointer-events: auto;
}

.preview-scrub-row,
.preview-button-row {
  align-items: center;
  display: flex;
  gap: 10px;
  width: 100%;
}

.preview-button-row {
  justify-content: flex-end;
}

.preview-time {
  color: #fff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 38px;
  text-align: center;
}

.preview-scrubber {
  accent-color: #40e7f1;
  cursor: pointer;
  flex: 1;
  height: 18px;
  min-width: 0;
}

.preview-control-button {
  background: rgba(7, 13, 22, 0.92);
  border: 1px solid #40e7f1;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  min-height: 34px;
  padding: 7px 13px;
}

.preview-control-button:hover,
.preview-control-button:focus {
  background: #123645;
  box-shadow: 0 0 14px rgba(64, 231, 241, 0.2);
  outline: none;
}

.preview-control-button.icon-button {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  min-width: 38px;
  padding: 7px;
}

.preview-icon {
  display: block;
  height: 16px;
  position: relative;
  width: 16px;
}

.preview-icon-maximize::before,
.preview-icon-maximize::after,
.preview-icon-minimize::before,
.preview-icon-minimize::after {
  border-color: #fff;
  border-style: solid;
  content: '';
  height: 6px;
  position: absolute;
  width: 6px;
}

.preview-icon-maximize::before {
  border-width: 2px 0 0 2px;
  left: 0;
  top: 0;
}

.preview-icon-maximize::after {
  border-width: 0 2px 2px 0;
  bottom: 0;
  right: 0;
}

.preview-icon-minimize::before {
  border-width: 0 2px 2px 0;
  left: 0;
  top: 0;
}

.preview-icon-minimize::after {
  border-width: 2px 0 0 2px;
  bottom: 0;
  right: 0;
}

.crop-editor {
  cursor: crosshair;
  inset: 0;
  position: absolute;
  z-index: 4;
}

.crop-shade {
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.crop-box {
  border: 2px solid #40e7f1;
  background-image:
    linear-gradient(to right, transparent 33.333%, rgba(64, 231, 241, 0.45) 33.333%, rgba(64, 231, 241, 0.45) calc(33.333% + 1px), transparent calc(33.333% + 1px), transparent 66.666%, rgba(64, 231, 241, 0.45) 66.666%, rgba(64, 231, 241, 0.45) calc(66.666% + 1px), transparent calc(66.666% + 1px)),
    linear-gradient(to bottom, transparent 33.333%, rgba(64, 231, 241, 0.45) 33.333%, rgba(64, 231, 241, 0.45) calc(33.333% + 1px), transparent calc(33.333% + 1px), transparent 66.666%, rgba(64, 231, 241, 0.45) 66.666%, rgba(64, 231, 241, 0.45) calc(66.666% + 1px), transparent calc(66.666% + 1px));
  box-shadow: 0 0 0 9999px rgba(3, 7, 12, 0.62), 0 0 18px rgba(64, 231, 241, 0.35);
  cursor: move;
  position: absolute;
}

.crop-label {
  background: #071219;
  border: 1px solid #40e7f1;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  left: 10px;
  padding: 4px 8px;
  position: absolute;
  top: 10px;
}

.crop-handle {
  background: #071219;
  border: 2px solid #40e7f1;
  height: 12px;
  position: absolute;
  width: 12px;
  z-index: 3;
}

.crop-handle-nw {
  cursor: nwse-resize;
  left: -7px;
  top: -7px;
}

.crop-handle-n {
  cursor: ns-resize;
  left: 50%;
  margin-left: -6px;
  top: -7px;
}

.crop-handle-ne {
  cursor: nesw-resize;
  right: -7px;
  top: -7px;
}

.crop-handle-e {
  cursor: ew-resize;
  margin-top: -6px;
  right: -7px;
  top: 50%;
}

.crop-handle-se {
  bottom: -7px;
  cursor: nwse-resize;
  right: -7px;
}

.crop-handle-s {
  bottom: -7px;
  cursor: ns-resize;
  left: 50%;
  margin-left: -6px;
}

.crop-handle-sw {
  bottom: -7px;
  cursor: nesw-resize;
  left: -7px;
}

.crop-handle-w {
  cursor: ew-resize;
  left: -7px;
  margin-top: -6px;
  top: 50%;
}

.recording-slate {
  align-items: center;
  background: #070b11;
  border: 1px solid #273249;
  color: #fff;
  display: flex;
  gap: 14px;
  height: 430px;
  justify-content: center;
}

.recording-slate strong,
.recording-slate span {
  display: block;
}

.recording-slate span {
  color: #93a2bd;
  font-size: 13px;
  margin-top: 4px;
}

.recording-dot {
  background: #ff2b65;
  border-radius: 999px;
  box-shadow: 0 0 18px rgba(255, 43, 101, 0.45);
  height: 12px;
  width: 12px;
}

.record-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(92px, 1fr) minmax(150px, 1.45fr) minmax(92px, 1fr) minmax(120px, 1fr);
  margin: 14px 0;
  max-width: 100%;
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

.format-description {
  color: #93a2bd;
  font-size: 12px;
  line-height: 1.35;
  margin-top: 7px;
}

.crop-panel {
  border: 1px solid #273249;
  margin-top: 14px;
  padding: 12px;
}

.crop-hint {
  color: #93a2bd;
  font-size: 13px;
  line-height: 1.35;
  margin: 0 0 10px;
}

.crop-actions {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
}

.crop-confirm-button {
  border-color: #40e7f1;
  color: #40e7f1;
}

.actions {
  display: flex;
  gap: 10px;
}

.button,
.action-button {
  transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.refresh-button {
  background: #10141c;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  min-width: 132px;
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
  background: #10141c;
  border-color: #273249;
  box-shadow: none;
  color: #93a2bd;
  cursor: not-allowed;
  opacity: 0.55;
}

.button[disabled]:hover,
.button[disabled]:active,
.button[disabled]:focus,
.action-button[disabled]:hover,
.action-button[disabled]:active,
.action-button[disabled]:focus {
  background: #10141c;
  border-color: #273249;
  box-shadow: none;
  color: #93a2bd;
  outline: none;
}

.hint {
  color: #93a2bd;
  font-size: 13px;
  margin-top: 12px;
}

.ffmpeg-log-panel {
  background: #070b11 !important;
  border: 1px solid #273249;
  margin-top: 12px;
}

.ffmpeg-log-header {
  align-items: center;
  border-bottom: 1px solid #273249;
  color: #40e7f1;
  display: flex;
  font-size: 12px;
  font-weight: 600;
  justify-content: space-between;
  letter-spacing: 0;
  padding: 8px 10px;
  text-transform: uppercase;
}

.log-button {
  background: #10141c;
  border: 1px solid #273249;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
}

.log-button:hover {
  border-color: #40e7f1;
}

.ffmpeg-log-panel .ffmpeg-log {
  background: #070b11 !important;
  border: 0;
  color: #c6d0e2 !important;
  font-family: Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  line-height: 1.35;
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 10px;
  white-space: pre-wrap;
}

.error-details {
  background: #070b11 !important;
  border: 1px solid #4d2434;
  color: #ff9bb8 !important;
  font-family: Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
  margin-top: 10px;
  max-height: 150px;
  overflow: auto;
  padding: 10px;
  white-space: pre-wrap;
}
</style>
