// Replace promise and Object.assign
var Promise = require('es6-promise');
var assign = require('lodash.assign');

// Lazy load node modules
var fs;
var mime;
var imageSize;
var gzipSize;
var moment;

var KIBIBYTE_BASE = 1024;

var SI_BASE = 1000;

var FORMAT_24_HOUR = 'HH:mm:ss';

var FORMAT_12_HOUR = 'h:mm:ss a';

var KIBIBYTE_REPRESENTATION = [
  'bytes',
  'KiB',
  'MiB',
  'GiB',
  'TiB',
  'PiB',
  'EiB',
  'ZiB',
  'YiB'
];

var SI_REPRESENTATION = [
  'bytes',
  'kB',
  'MB',
  'GB',
  'TB',
  'PB',
  'EB',
  'ZB',
  'YB'
];

var IMAGE_FORMATS = [
  'image/bmp',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/x-tiff',
  'image/webp',
  'image/vnd.adobe.photoshop'
];

function loadFileInfoAsync(filepath) {
  fs = fs || require('fs');
  return new Promise(function getFileAsync(resolve, reject) {
    if (filepath) {
      fs.stat(filepath, function getFileStatsAsync(err, stats) {
        var info;
        if (!err) {
          info = {
            absolutePath: filepath,
            size: stats.size,
            dateCreated: stats.birthtime.toISOString(),
            dateChanged: stats.mtime.toISOString()
          };
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

function getPrettySize(size, base, suffixes) {
  var scale = Math.floor(Math.log(size) / Math.log(base));
  var activeSuffix = suffixes[scale];
  var scaledSize = size / Math.pow(base, scale);
  // Round size with a decimal precision of 2
  var fixedScale = Math.round(scaledSize + 'e+2');
  var roundedSize = Number(fixedScale + 'e-2');
  return roundedSize + ' ' + activeSuffix;
}

function addPrettySize(info, options) {
  var base;
  var suffixes;
  var useKibibyteRepresentation = options.useKibibyteRepresentation;
  var size = info.size;
  if (size === 0) return assign(info, { prettySize: '0 bytes' });
  if (size === 1) return assign(info, { prettySize: '1 byte' });
  base = (useKibibyteRepresentation) ? KIBIBYTE_BASE : SI_BASE;
  suffixes = (useKibibyteRepresentation) ? KIBIBYTE_REPRESENTATION : SI_REPRESENTATION;
  return assign(info, { prettySize: getPrettySize(size, base, suffixes) });
}

function addMimeTypeInfo(info) {
  mime = mime || require('mime');
  return assign(info, { mimeType: mime.lookup(info.absolutePath) });
}

function addImageInfo(info) {
  if (!info.mimeType || !IMAGE_FORMATS.includes(info.mimeType)) return info;
  imageSize = imageSize || require('image-size');
  return assign(info, { dimmensions: imageSize(info.absolutePath) });
}

function addPrettyDateInfo(info, options) {
  var use24HourFormat = options.use24HourFormat;
  var hourFormat = (use24HourFormat) ? FORMAT_24_HOUR : FORMAT_12_HOUR;
  moment = moment || require('moment');
  return assign(info, {
    prettyDateCreated: moment(info.dateCreated).format('MMMM Do YYYY, ' + hourFormat),
    prettyDateChanged: moment(info.dateChanged).format('MMMM Do YYYY, ' + hourFormat)
  });
}

function addGzipSize(info, options) {
  var size;
  var useKibibyteRepresentation = options.useKibibyteRepresentation;
  var base = (useKibibyteRepresentation) ? KIBIBYTE_BASE : SI_BASE;
  var suffixes = (useKibibyteRepresentation) ? KIBIBYTE_REPRESENTATION : SI_REPRESENTATION;
  gzipSize = gzipSize || require('gzip-size');
  size = gzipSize.sync(fs.readFileSync(info.absolutePath));
  return assign(info, { gzipSize: getPrettySize(size, base, suffixes) });
}

module.exports = {
  loadFileInfoAsync: loadFileInfoAsync,
  addPrettySize: addPrettySize,
  addMimeTypeInfo: addMimeTypeInfo,
  addImageInfo: addImageInfo,
  addPrettyDateInfo: addPrettyDateInfo,
  addGzipSize: addGzipSize
};
