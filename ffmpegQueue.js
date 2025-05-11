// ffmpegQueue.js
const Bree = require('bree');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

// Set ffmpeg/ffprobe paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const bree = new Bree({
  root: path.join(__dirname),
  jobs: [] // Jobs will be added dynamically
});

// Helper: sanitize FFmpeg options (basic example)
function sanitizeFfmpegOptions(options) {
  // Only allow whitelisted options
  const allowed = ['-q:a', '-map', '-threads', '-bufsize', '-maxrate'];
  return (options || []).filter(opt => allowed.includes(opt.split(' ')[0]));
}

function addFfmpegJob(inputPath, outputPath, ffmpegOptions) {
  return new Promise((resolve, reject) => {
    const jobName = `ffmpeg-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    bree.add({
      name: jobName,
      path: path.join(__dirname, 'ffmpegWorker.js'),
      worker: {
        workerData: { inputPath, outputPath, ffmpegOptions }
      }
    });
    bree.run(jobName);
    bree.on('worker message', (name, message) => {
      if (name === jobName) {
        if (message.success) resolve({ outputPath });
        else reject(new Error(message.error));
        bree.remove(jobName);
      }
    });
    bree.on('worker error', (name, err) => {
      if (name === jobName) {
        reject(err);
        bree.remove(jobName);
      }
    });
  });
}

module.exports = { addFfmpegJob };
