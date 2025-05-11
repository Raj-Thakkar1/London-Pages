// ffmpegWorker.js
const { parentPort, workerData } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

function sanitizeFfmpegOptions(options) {
  const allowed = ['-q:a', '-map', '-threads', '-bufsize', '-maxrate'];
  return (options || []).filter(opt => allowed.includes(opt.split(' ')[0]));
}

const { inputPath, outputPath, ffmpegOptions } = workerData;

ffmpeg(inputPath)
  .noVideo()
  .audioCodec('libmp3lame')
  .format('mp3')
  .outputOptions(sanitizeFfmpegOptions(ffmpegOptions))
  .on('end', () => {
    parentPort.postMessage({ success: true, outputPath });
  })
  .on('error', (err) => {
    parentPort.postMessage({ success: false, error: err.message });
  })
  .save(outputPath);
