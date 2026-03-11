/**
 * Custom decode worker that avoids static WASM codec imports.
 *
 * The library's original worker eagerly imports WASM-based codecs
 * (openjpeg, openjph, charls, libjpeg-turbo) whose JS loaders use
 * CommonJS `module.exports` — incompatible with Worker ES modules.
 *
 * This file imports only pure-JS decoders statically and lazy-loads
 * WASM codecs on demand via dynamic import().
 */

// @ts-nocheck — internal library paths without type declarations
import { expose } from 'comlink';

// Pure-JS decoders (no WASM dependencies)
import decodeLittleEndian from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeLittleEndian.js';
import decodeBigEndian from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeBigEndian.js';
import decodeRLE from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeRLE.js';
import decodeJPEGBaseline12Bit from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeJPEGBaseline12Bit-js.js';
import decodeJPEGLossless from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeJPEGLossless.js';

// Pure-JS utilities
import bilinear from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/scaling/bilinear.js';
import replicate from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/scaling/replicate.js';
import applyModalityLUT from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/scaling/scaleArray.js';
import getMinMax from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/getMinMax.js';
import getPixelDataTypeFromMinMax, {
  validatePixelDataType,
} from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/getPixelDataTypeFromMinMax.js';
import isColorImage from '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/isColorImage.js';

/* ------------------------------------------------------------------ */
/*  Lazy loaders for WASM-dependent codecs                            */
/* ------------------------------------------------------------------ */

let _decodeJPEGBaseline8Bit: any;
let _decodeJPEGLS: any;
let _decodeJPEG2000: any;
let _decodeHTJ2K: any;

async function lazyJPEG8() {
  if (!_decodeJPEGBaseline8Bit) {
    const mod = await import(
      '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeJPEGBaseline8Bit.js'
    );
    _decodeJPEGBaseline8Bit = mod.default;
  }
  return _decodeJPEGBaseline8Bit;
}

async function lazyJPEGLS() {
  if (!_decodeJPEGLS) {
    const mod = await import(
      '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeJPEGLS.js'
    );
    _decodeJPEGLS = mod.default;
  }
  return _decodeJPEGLS;
}

async function lazyJPEG2000() {
  if (!_decodeJPEG2000) {
    const mod = await import(
      '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeJPEG2000.js'
    );
    _decodeJPEG2000 = mod.default;
  }
  return _decodeJPEG2000;
}

async function lazyHTJ2K() {
  if (!_decodeHTJ2K) {
    const mod = await import(
      '../../node_modules/@cornerstonejs/dicom-image-loader/dist/esm/shared/decoders/decodeHTJ2K.js'
    );
    _decodeHTJ2K = mod.default;
  }
  return _decodeHTJ2K;
}

/* ------------------------------------------------------------------ */
/*  Post-processing (copied from the library's worker — pure logic)   */
/* ------------------------------------------------------------------ */

const imageUtils = { bilinear, replicate };
const typedArrayConstructors: Record<string, any> = {
  Uint8Array,
  Uint16Array,
  Int16Array,
  Float32Array,
};

function postProcessDecodedPixels(imageFrame: any, options: any, start: number, decodeConfig: any) {
  const shouldShift =
    imageFrame.pixelRepresentation !== undefined && imageFrame.pixelRepresentation === 1;
  const shift =
    shouldShift && imageFrame.bitsStored !== undefined ? 32 - imageFrame.bitsStored : undefined;

  if (shouldShift && shift !== undefined) {
    for (let i = 0; i < imageFrame.pixelData.length; i++) {
      imageFrame.pixelData[i] = (imageFrame.pixelData[i] << shift) >> shift;
    }
  }

  let pixelDataArray = imageFrame.pixelData;
  imageFrame.pixelDataLength = imageFrame.pixelData.length;

  const { min: minBeforeScale, max: maxBeforeScale } = getMinMax(imageFrame.pixelData);

  const canRenderFloat =
    typeof options.allowFloatRendering !== 'undefined' ? options.allowFloatRendering : true;

  let invalidType =
    isColorImage(imageFrame.photometricInterpretation) &&
    options.targetBuffer?.offset === undefined;

  const willScale = options.preScale?.enabled;
  const hasFloatRescale =
    willScale &&
    Object.values(options.preScale.scalingParameters || {}).some(
      (v: any) => typeof v === 'number' && !Number.isInteger(v),
    );
  const disableScale = !options.preScale?.enabled || (!canRenderFloat && hasFloatRescale);

  const type = options.targetBuffer?.type;
  if (type && options.preScale?.enabled && !disableScale) {
    const { rescaleSlope, rescaleIntercept } = options.preScale.scalingParameters;
    const minAfterScale = rescaleSlope * minBeforeScale + rescaleIntercept;
    const maxAfterScale = rescaleSlope * maxBeforeScale + rescaleIntercept;
    invalidType = !validatePixelDataType(minAfterScale, maxAfterScale, typedArrayConstructors[type]);
  }

  if (type && !invalidType) {
    pixelDataArray = handleTargetBuffer(options, imageFrame, pixelDataArray);
  } else if (options.preScale?.enabled && !disableScale) {
    pixelDataArray = handlePreScaleSetup(options, minBeforeScale, maxBeforeScale, imageFrame);
  } else {
    pixelDataArray = getDefaultPixelDataArray(minBeforeScale, maxBeforeScale, imageFrame);
  }

  let minAfterScale = minBeforeScale;
  let maxAfterScale = maxBeforeScale;

  if (options.preScale?.enabled && !disableScale) {
    const scalingParameters = options.preScale.scalingParameters;
    if (!scalingParameters) {
      throw new Error('scalingParameters must be defined if preScale.enabled is true');
    }
    const { rescaleSlope, rescaleIntercept, suvbw } = scalingParameters;
    if (typeof rescaleSlope === 'number' && typeof rescaleIntercept === 'number') {
      applyModalityLUT(pixelDataArray, scalingParameters);
      imageFrame.preScale = { ...options.preScale, scaled: true };
      minAfterScale = rescaleSlope * minBeforeScale + rescaleIntercept;
      maxAfterScale = rescaleSlope * maxBeforeScale + rescaleIntercept;
      if (suvbw) {
        minAfterScale *= suvbw;
        maxAfterScale *= suvbw;
      }
    }
  } else if (disableScale) {
    imageFrame.preScale = { enabled: true, scaled: false };
  }

  imageFrame.pixelData = pixelDataArray;
  imageFrame.smallestPixelValue = minAfterScale;
  imageFrame.largestPixelValue = maxAfterScale;
  imageFrame.decodeTimeInMS = new Date().getTime() - start;
  return imageFrame;
}

function handleTargetBuffer(options: any, imageFrame: any, pixelDataArray: any) {
  const { arrayBuffer, type, offset: rawOffset = 0, length: rawLength, rows } = options.targetBuffer;
  const TC = typedArrayConstructors[type];
  if (!TC) throw new Error(`target array ${type} is not supported`);

  if (rows && rows !== imageFrame.rows) {
    scaleImageFrame(imageFrame, options.targetBuffer, TC);
  }
  const length = rawLength ?? imageFrame.pixelDataLength - rawOffset;
  if (length !== imageFrame.pixelData.length) {
    throw new Error('target array length mismatch');
  }
  const arr = arrayBuffer ? new TC(arrayBuffer, rawOffset, length) : new TC(length);
  arr.set(imageFrame.pixelData, 0);
  return arr;
}

function handlePreScaleSetup(options: any, min: number, max: number, imageFrame: any) {
  const sp = options.preScale.scalingParameters;
  if (!sp) throw new Error('scalingParameters required');
  const { rescaleSlope, rescaleIntercept } = sp;
  let sMin = min, sMax = max;
  if (typeof rescaleSlope === 'number' && typeof rescaleIntercept === 'number') {
    sMin = rescaleSlope * min + rescaleIntercept;
    sMax = rescaleSlope * max + rescaleIntercept;
  }
  return getDefaultPixelDataArray(sMin, sMax, imageFrame);
}

function getDefaultPixelDataArray(min: number, max: number, imageFrame: any) {
  const TC = getPixelDataTypeFromMinMax(min, max);
  const arr = new TC(imageFrame.pixelData.length);
  arr.set(imageFrame.pixelData, 0);
  return arr;
}

function createDestinationImage(imageFrame: any, targetBuffer: any, TC: any) {
  const len = targetBuffer.rows * targetBuffer.columns * imageFrame.samplesPerPixel;
  const pixelData = new TC(len);
  return {
    pixelData,
    rows: targetBuffer.rows,
    columns: targetBuffer.columns,
    frameInfo: { ...imageFrame.frameInfo, rows: targetBuffer.rows, columns: targetBuffer.columns },
    imageInfo: {
      ...imageFrame.imageInfo,
      rows: targetBuffer.rows,
      columns: targetBuffer.columns,
      bytesPerPixel: pixelData.byteLength / len,
    },
  };
}

function scaleImageFrame(imageFrame: any, targetBuffer: any, TC: any) {
  const dest = createDestinationImage(imageFrame, targetBuffer, TC);
  const scalingType = targetBuffer.scalingType || 'replicate';
  (imageUtils as any)[scalingType](imageFrame, dest);
  Object.assign(imageFrame, dest);
  imageFrame.pixelDataLength = imageFrame.pixelData.length;
  return imageFrame;
}

/* ------------------------------------------------------------------ */
/*  Main decode entry point                                           */
/* ------------------------------------------------------------------ */

async function decodeImageFrame(
  imageFrame: any,
  transferSyntax: string,
  pixelData: any,
  decodeConfig: any,
  options: any,
  callbackFn?: (f: any) => void,
) {
  const start = new Date().getTime();
  let decodePromise: Promise<any> | null = null;

  switch (transferSyntax) {
    case '1.2.840.10008.1.2':
    case '1.2.840.10008.1.2.1':
    case '1.2.840.10008.1.2.1.99':
      decodePromise = decodeLittleEndian(imageFrame, pixelData);
      break;
    case '1.2.840.10008.1.2.2':
      decodePromise = decodeBigEndian(imageFrame, pixelData);
      break;
    case '1.2.840.10008.1.2.5':
      decodePromise = decodeRLE(imageFrame, pixelData);
      break;
    case '1.2.840.10008.1.2.4.50': {
      const fn = await lazyJPEG8();
      decodePromise = fn(pixelData, { ...imageFrame });
      break;
    }
    case '1.2.840.10008.1.2.4.51':
      decodePromise = decodeJPEGBaseline12Bit(imageFrame, pixelData);
      break;
    case '1.2.840.10008.1.2.4.57':
    case '1.2.840.10008.1.2.4.70':
      decodePromise = decodeJPEGLossless(imageFrame, pixelData);
      break;
    case '1.2.840.10008.1.2.4.80':
    case '1.2.840.10008.1.2.4.81': {
      const fn = await lazyJPEGLS();
      decodePromise = fn(pixelData, {
        signed: imageFrame.pixelRepresentation === 1,
        bytesPerPixel: imageFrame.bitsAllocated <= 8 ? 1 : 2,
        ...imageFrame,
      });
      break;
    }
    case '1.2.840.10008.1.2.4.90':
    case '1.2.840.10008.1.2.4.91': {
      const fn = await lazyJPEG2000();
      decodePromise = fn(pixelData, { ...imageFrame });
      break;
    }
    case '3.2.840.10008.1.2.4.96':
    case '1.2.840.10008.1.2.4.201':
    case '1.2.840.10008.1.2.4.202':
    case '1.2.840.10008.1.2.4.203': {
      const fn = await lazyHTJ2K();
      decodePromise = fn(pixelData, { ...imageFrame });
      break;
    }
    default:
      throw new Error(`no decoder for transfer syntax ${transferSyntax}`);
  }

  if (!decodePromise) throw new Error('decodePromise not defined');

  const decodedFrame = await decodePromise;
  const result = postProcessDecodedPixels(decodedFrame, options, start, decodeConfig);
  callbackFn?.(result);
  return result;
}

/* ------------------------------------------------------------------ */
/*  Expose via Comlink                                                */
/* ------------------------------------------------------------------ */

const obj = {
  decodeTask({
    imageFrame,
    transferSyntax,
    decodeConfig,
    options,
    pixelData,
    callbackFn,
  }: any) {
    return decodeImageFrame(imageFrame, transferSyntax, pixelData, decodeConfig, options, callbackFn);
  },
};

expose(obj);
