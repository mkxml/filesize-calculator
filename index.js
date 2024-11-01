const dayjs = require('dayjs');

// Lazy load node modules
let fs;
let mime;
let imageSize;
let gzipSize;
let brotliSize;

const DECIMAL_BASE = 1000;

const IEC_BASE = 1024;

const FORMAT_24_HOUR = 'HH:mm:ss';

const FORMAT_12_HOUR = 'h:mm:ss a';

const IEC_SUFIXES = [
  'bytes',
  'KiB',
  'MiB',
  'GiB',
  'TiB',
  'PiB',
  'EiB',
  'ZiB',
  'YiB',
];

const DECIMAL_SUFIXES = [
  'bytes',
  'kB',
  'MB',
  'GB',
  'TB',
  'PB',
  'EB',
  'ZB',
  'YB',
];

const IMAGE_FORMATS = [
  'image/bmp',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/x-tiff',
  'image/webp',
  'image/vnd.adobe.photoshop',
];

dayjs.extend(require('dayjs/plugin/advancedFormat'));

// Support cancelable info requests
// Promise.config({ cancellation: true });

function extractInfo(filepath, stats) {
  return {
    absolutePath: filepath,
    size: stats.size,
    dateCreated: stats.birthtime.toISOString(),
    dateChanged: stats.mtime.toISOString(),
  };
}

function loadFileInfoAsync(filepath) {
  fs = fs || require('fs');
  return new Promise((resolve, reject) => {
    if (filepath) {
      fs.stat(filepath, (err, stats) => {
        let info;
        if (!err) {
          info = extractInfo(filepath, stats);
          resolve(info);
        } else {
          reject(err);
        }
      });
    } else {
      reject(new Error('Please provide a valid filepath'));
    }
  });
}

function loadFileInfoSync(filepath) {
  let stats;
  fs = fs || require('fs');
  try {
    stats = fs.statSync(filepath);
  } catch (e) {
    throw Error('Please provide a valid filepath');
  }
  return extractInfo(filepath, stats);
}

function getPrettySize(size, base, suffixes) {
  const scale = Math.floor(Math.log(size) / Math.log(base));
  const activeSuffix = suffixes[scale];
  // eslint-disable-next-line no-restricted-properties
  const scaledSize = size / Math.pow(base, scale);
  // Round size with a decimal precision of 2
  const fixedScale = Math.round(`${scaledSize}e+2`);
  const roundedSize = Number(`${fixedScale}e-2`);
  return `${roundedSize} ${activeSuffix}`;
}

function addPrettySize(info, options) {
  const { useDecimal } = options;
  const { size } = info;
  if (size === 0) return Object.assign(info, { prettySize: '0 bytes' });
  if (size === 1) return Object.assign(info, { prettySize: '1 byte' });
  const base = (useDecimal) ? DECIMAL_BASE : IEC_BASE;
  const suffixes = (useDecimal) ? DECIMAL_SUFIXES : IEC_SUFIXES;
  return Object.assign(info, { prettySize: getPrettySize(size, base, suffixes) });
}

function addMimeTypeInfo(info) {
  const ext = info.absolutePath.split('.').pop();
  if (ext === 'ts' || ext === 'tsx') return Object.assign(info, { mimeType: 'application/typescript' });
  return Object.assign(info, { mimeType: mime.getType(info.absolutePath) });
}

function addImageInfo(info) {
  if (!info.mimeType || !IMAGE_FORMATS.includes(info.mimeType)) return info;
  imageSize = imageSize || require('image-size');
  return Object.assign(info, { dimmensions: imageSize(info.absolutePath) });
}

function addPrettyDateInfo(info, options) {
  const { use24HourFormat } = options;
  const hourFormat = (use24HourFormat) ? FORMAT_24_HOUR : FORMAT_12_HOUR;
  return Object.assign(info, {
    prettyDateCreated: dayjs(info.dateCreated).format(`MMMM Do YYYY, ${hourFormat}`),
    prettyDateChanged: dayjs(info.dateChanged).format(`MMMM Do YYYY, ${hourFormat}`),
  });
}

function addGzipSize(info, options) {
  const { useDecimal } = options;
  const base = (useDecimal) ? DECIMAL_BASE : IEC_BASE;
  const suffixes = (useDecimal) ? DECIMAL_SUFIXES : IEC_SUFIXES;
  gzipSize = gzipSize || require('gzip-size');
  const size = gzipSize.sync(fs.readFileSync(info.absolutePath));
  return Object.assign(info, { gzipSize: getPrettySize(size, base, suffixes) });
}

function addBrotliSize(info, options) {
  const { useDecimal } = options;
  const base = (useDecimal) ? DECIMAL_BASE : IEC_BASE;
  const suffixes = (useDecimal) ? DECIMAL_SUFIXES : IEC_SUFIXES;
  brotliSize = brotliSize || require('brotli-size');
  const size = brotliSize.sync(fs.readFileSync(info.absolutePath));
  return Object.assign(info, { brotliSize: getPrettySize(size, base, suffixes) });
}

module.exports = {
  loadFileInfoSync,
  loadFileInfoAsync,
  addPrettySize,
  addMimeTypeInfo,
  addImageInfo,
  addPrettyDateInfo,
  addGzipSize,
  addBrotliSize,
};
