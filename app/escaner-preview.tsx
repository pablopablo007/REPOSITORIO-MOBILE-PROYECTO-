import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Line } from 'react-native-svg';

import { detectarMargenes, MargenesDetectados } from '../utils/detectarMargenes';

type CropCorners = {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  bl: { x: number; y: number };
  br: { x: number; y: number };
};

type Size = { width: number; height: number };
type CropPoint = CropCorners['tl'];
type MargenesConEsquinas = MargenesDetectados & { corners?: CropCorners };

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const cloneCorners = (corners: CropCorners): CropCorners => ({
  tl: { ...corners.tl },
  tr: { ...corners.tr },
  bl: { ...corners.bl },
  br: { ...corners.br },
});

const cornersFromMargins = (margenesDetectados: MargenesDetectados): CropCorners => ({
  tl: { x: clamp01(margenesDetectados.left), y: clamp01(margenesDetectados.top) },
  tr: { x: clamp01(margenesDetectados.right), y: clamp01(margenesDetectados.top) },
  bl: { x: clamp01(margenesDetectados.left), y: clamp01(margenesDetectados.bottom) },
  br: { x: clamp01(margenesDetectados.right), y: clamp01(margenesDetectados.bottom) },
});

const sanitizeCorners = (corners: CropCorners): CropCorners => ({
  tl: { x: clamp01(corners.tl.x), y: clamp01(corners.tl.y) },
  tr: { x: clamp01(corners.tr.x), y: clamp01(corners.tr.y) },
  bl: { x: clamp01(corners.bl.x), y: clamp01(corners.bl.y) },
  br: { x: clamp01(corners.br.x), y: clamp01(corners.br.y) },
});

const expandCorners = (corners: CropCorners, amount: number): CropCorners => {
  const center = {
    x: (corners.tl.x + corners.tr.x + corners.bl.x + corners.br.x) / 4,
    y: (corners.tl.y + corners.tr.y + corners.bl.y + corners.br.y) / 4,
  };
  const expandPoint = (point: CropPoint) => ({
    x: center.x + (point.x - center.x) * (1 + amount),
    y: center.y + (point.y - center.y) * (1 + amount),
  });

  return sanitizeCorners({
    tl: expandPoint(corners.tl),
    tr: expandPoint(corners.tr),
    bl: expandPoint(corners.bl),
    br: expandPoint(corners.br),
  });
};

const constrainCorner = (
  corner: keyof CropCorners,
  point: CropPoint,
  corners: CropCorners,
): CropPoint => {
  const gap = 0.025;
  const maxLeftX = Math.min(corners.tr.x, corners.br.x) - gap;
  const minRightX = Math.max(corners.tl.x, corners.bl.x) + gap;
  const maxTopY = Math.min(corners.bl.y, corners.br.y) - gap;
  const minBottomY = Math.max(corners.tl.y, corners.tr.y) + gap;

  switch (corner) {
    case 'tl':
      return { x: clamp01(Math.min(point.x, maxLeftX)), y: clamp01(Math.min(point.y, maxTopY)) };
    case 'tr':
      return { x: clamp01(Math.max(point.x, minRightX)), y: clamp01(Math.min(point.y, maxTopY)) };
    case 'bl':
      return { x: clamp01(Math.min(point.x, maxLeftX)), y: clamp01(Math.max(point.y, minBottomY)) };
    case 'br':
      return { x: clamp01(Math.max(point.x, minRightX)), y: clamp01(Math.max(point.y, minBottomY)) };
  }
};

const cornersFromDetection = (resultado: MargenesConEsquinas): CropCorners => {
  if (resultado.corners) {
    return expandCorners(sanitizeCorners(resultado.corners), 0.018);
  }

  return cornersFromMargins(resultado);
};

const getContainLayout = (box: Size, image: Size) => {
  if (box.width <= 0 || box.height <= 0 || image.width <= 0 || image.height <= 0) {
    return { displayW: 0, displayH: 0, offsetX: 0, offsetY: 0 };
  }

  const imgAR = image.width / image.height;
  const boxAR = box.width / box.height;

  if (imgAR > boxAR) {
    const displayW = box.width;
    const displayH = box.width / imgAR;
    return { displayW, displayH, offsetX: 0, offsetY: (box.height - displayH) / 2 };
  }

  const displayH = box.height;
  const displayW = box.height * imgAR;
  return { displayW, displayH, offsetX: (box.width - displayW) / 2, offsetY: 0 };
};

const cropPointToBoxPoint = (point: CropPoint, box: Size, image: Size) => {
  const layout = getContainLayout(box, image);
  return {
    x: layout.offsetX + point.x * layout.displayW,
    y: layout.offsetY + point.y * layout.displayH,
  };
};

const getImageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });

const htmlRecorte = (base64Img: string, corners: CropCorners, targetW: number, targetH: number) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: black; }
    canvas { display: none; }
  </style>
</head>
<body>
<canvas id="source"></canvas>
<canvas id="output"></canvas>
<script>
const finish = (result) => {
  window.ReactNativeWebView.postMessage(JSON.stringify(result));
};

try {
  const corners = ${JSON.stringify(corners)};
  const targetWidth = ${targetW};
  const targetHeight = ${targetH};
  const base64Img = "${base64Img.replace(/[\r\n]/g, '')}";

  const img = new Image();
  img.onload = () => {
    try {
      const x0 = corners.tl.x, y0 = corners.tl.y;
      const x1 = corners.tr.x, y1 = corners.tr.y;
      const x2 = corners.bl.x, y2 = corners.bl.y;
      const x3 = corners.br.x, y3 = corners.br.y;

      const dx1 = x1 - x3;
      const dx2 = x2 - x3;
      const dy1 = y1 - y3;
      const dy2 = y2 - y3;
      const sx = x0 - x1 + x3 - x2;
      const sy = y0 - y1 + y3 - y2;

      let a_val, b_val, c_val, d_val, e_val, f_val, g_val, h_val;
      const det = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(det) < 0.0001) {
        a_val = x1 - x0; b_val = x2 - x0; c_val = x0;
        d_val = y1 - y0; e_val = y2 - y0; f_val = y0;
        g_val = 0; h_val = 0;
      } else {
        g_val = (sx * dy2 - sy * dx2) / det;
        h_val = (sy * dx1 - sx * dy1) / det;
        a_val = x1 - x0 + g_val * x1;
        b_val = x2 - x0 + h_val * x2;
        c_val = x0;
        d_val = y1 - y0 + g_val * y1;
        e_val = y2 - y0 + h_val * y2;
        f_val = y0;
      }

      const sourceCanvas = document.getElementById('source');
      const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      sourceCanvas.width = img.naturalWidth || img.width;
      sourceCanvas.height = img.naturalHeight || img.height;
      sourceCtx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);

      const source = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const sourceData = source.data;
      const sourceW = sourceCanvas.width;
      const sourceH = sourceCanvas.height;

      const outputCanvas = document.getElementById('output');
      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;
      const outputCtx = outputCanvas.getContext('2d');
      const output = outputCtx.createImageData(targetWidth, targetHeight);
      const outputData = output.data;

      const sample = (x, y, channel) => {
        x = Math.max(0, Math.min(sourceW - 1, x));
        y = Math.max(0, Math.min(sourceH - 1, y));
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(sourceW - 1, x0 + 1);
        const y1 = Math.min(sourceH - 1, y0 + 1);
        const wx = x - x0;
        const wy = y - y0;
        const i00 = (y0 * sourceW + x0) * 4 + channel;
        const i10 = (y0 * sourceW + x1) * 4 + channel;
        const i01 = (y1 * sourceW + x0) * 4 + channel;
        const i11 = (y1 * sourceW + x1) * 4 + channel;
        return (
          sourceData[i00] * (1 - wx) * (1 - wy) +
          sourceData[i10] * wx * (1 - wy) +
          sourceData[i01] * (1 - wx) * wy +
          sourceData[i11] * wx * wy
        );
      };

      for (let y = 0; y < targetHeight; y++) {
        const v = targetHeight <= 1 ? 0 : y / (targetHeight - 1);
        for (let x = 0; x < targetWidth; x++) {
          const u = targetWidth <= 1 ? 0 : x / (targetWidth - 1);
          const denom = g_val * u + h_val * v + 1;
          const srcXNorm = (a_val * u + b_val * v + c_val) / denom;
          const srcYNorm = (d_val * u + e_val * v + f_val) / denom;
          const srcX = srcXNorm * (sourceW - 1);
          const srcY = srcYNorm * (sourceH - 1);
          const out = (y * targetWidth + x) * 4;

          if (srcXNorm >= 0 && srcXNorm <= 1 && srcYNorm >= 0 && srcYNorm <= 1) {
            outputData[out] = sample(srcX, srcY, 0);
            outputData[out + 1] = sample(srcX, srcY, 1);
            outputData[out + 2] = sample(srcX, srcY, 2);
            outputData[out + 3] = 255;
          } else {
            outputData[out] = 255;
            outputData[out + 1] = 255;
            outputData[out + 2] = 255;
            outputData[out + 3] = 255;
          }
        }
      }

      outputCtx.putImageData(output, 0, 0);
      const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.94);
      finish({ status: 'success', data: dataUrl });
    } catch(err) {
      finish({ status: 'error', error: err.message });
    }
  };
  img.onerror = () => {
    finish({ status: 'error', error: 'No se pudo cargar la imagen para recortar.' });
  };
  img.src = 'data:image/jpeg;base64,' + base64Img;
} catch(err) {
  finish({ status: 'error', error: err.message });
}
</script>
</body>
</html>
`;

const htmlDeteccion = (base64Img: string) => `
<!DOCTYPE html>
<html>
<body>
<canvas id="c" style="display:none"></canvas>
<script>
const finish = (resultado) => {
  window.ReactNativeWebView.postMessage(JSON.stringify(resultado));
};

const img = new Image();
img.onerror = function() {
  finish({ left: 0, top: 0, right: 1, bottom: 1, confianza: 'baja' });
};

img.onload = function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = 240;
  const H = Math.max(1, Math.round(img.height * W / img.width));
  canvas.width = W;
  canvas.height = H;
  ctx.drawImage(img, 0, 0, W, H);

  const data = ctx.getImageData(0, 0, W, H).data;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const idx = (x, y) => y * W + x;
  const lum = new Float32Array(W * H);
  const sat = new Float32Array(W * H);
  const allLum = [];
  const edgeLum = [];
  const edge = Math.max(4, Math.round(Math.min(W, H) * 0.04));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = idx(x, y);
      const i = p * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const value = (0.299 * r) + (0.587 * g) + (0.114 * b);
      lum[p] = value;
      sat[p] = max - min;
      allLum.push(value);

      if (x < edge || x >= W - edge || y < edge || y >= H - edge) {
        edgeLum.push(value);
      }
    }
  }

  const percentile = (values, q) => {
    if (!values.length) return 0;
    values.sort((a, b) => a - b);
    return values[Math.min(values.length - 1, Math.max(0, Math.floor(values.length * q)))];
  };

  const fondoLum = percentile(edgeLum, 0.5);
  const q45 = percentile(allLum, 0.45);
  const q58 = percentile(allLum, 0.58);
  const q72 = percentile(allLum, 0.72);
  const q88 = percentile(allLum, 0.88);
  const threshold = clamp(Math.min(q72, Math.max(110, q58 - 10, q45 + 8, Math.min(fondoLum + 24, 168))), 100, 212);
  const relaxedThreshold = clamp(threshold - 20, 88, 190);
  const mask = new Uint8Array(W * H);
  const rowHits = new Array(H).fill(0);
  const colHits = new Array(W).fill(0);
  const rowTexture = new Array(H).fill(0);
  const colTexture = new Array(W).fill(0);

  const textureAt = (x, y) => {
    if (x <= 0 || x >= W - 1 || y <= 0 || y >= H - 1) return 0;
    const p = idx(x, y);
    const gx = Math.abs(lum[idx(x + 1, y)] - lum[idx(x - 1, y)]);
    const gy = Math.abs(lum[idx(x, y + 1)] - lum[idx(x, y - 1)]);
    return Math.min(50, gx + gy + Math.abs(lum[p] - fondoLum) * 0.04);
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = idx(x, y);
      const isBrightPaper = lum[p] >= threshold && sat[p] < 115;
      const isSoftPaper = lum[p] >= relaxedThreshold && lum[p] - fondoLum > 16 && sat[p] < 90;
      const isVeryBright = lum[p] >= q88 && sat[p] < 140;

      if (isBrightPaper || isSoftPaper || isVeryBright) {
        mask[p] = 1;
        rowHits[y]++;
        colHits[x]++;
        const texture = textureAt(x, y);
        rowTexture[y] += texture;
        colTexture[x] += texture;
      }
    }
  }

  const visited = new Uint8Array(W * H);
  let bestComponent = null;
  let bestScore = -Infinity;

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;

    const stack = [start];
    const pixels = [];
    visited[start] = 1;

    let count = 0;
    let textureSum = 0;
    let minCompX = W;
    let maxCompX = 0;
    let minCompY = H;
    let maxCompY = 0;
    let sumX = 0;
    let sumY = 0;

    while (stack.length) {
      const p = stack.pop();
      const x = p % W;
      const y = Math.floor(p / W);
      pixels.push(p);
      count++;
      sumX += x;
      sumY += y;
      minCompX = Math.min(minCompX, x);
      maxCompX = Math.max(maxCompX, x);
      minCompY = Math.min(minCompY, y);
      maxCompY = Math.max(maxCompY, y);
      textureSum += textureAt(x, y);

      const neighbors = [p - 1, p + 1, p - W, p + W];
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        if (n < 0 || n >= mask.length || visited[n] || !mask[n]) continue;
        const nx = n % W;
        const ny = Math.floor(n / W);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        visited[n] = 1;
        stack.push(n);
      }
    }

    if (count < W * H * 0.012) continue;

    const compW = maxCompX - minCompX + 1;
    const compH = maxCompY - minCompY + 1;
    const boxArea = compW * compH;
    const fillRatio = count / Math.max(1, boxArea);
    const centerX = sumX / count / W;
    const centerY = sumY / count / H;
    const centerPenalty = Math.abs(centerX - 0.5) + Math.abs(centerY - 0.5);
    const touchesBorder = minCompX <= 1 || minCompY <= 1 || maxCompX >= W - 2 || maxCompY >= H - 2;
    const textureAvg = textureSum / Math.max(1, count);
    const shapeBonus = compW > W * 0.28 && compH > H * 0.28 ? W * H * 0.08 : 0;
    const borderPenalty = touchesBorder && textureAvg < 4 ? count * 0.35 : 0;
    const score = count + textureSum * 0.25 + boxArea * 0.05 + shapeBonus - centerPenalty * W * H * 0.05 - borderPenalty - Math.abs(fillRatio - 0.65) * count * 0.08;

    if (score > bestScore) {
      bestScore = score;
      bestComponent = { pixels, count };
    }
  }

  if (bestComponent && bestComponent.count > W * H * 0.018) {
    mask.fill(0);
    rowHits.fill(0);
    colHits.fill(0);
    rowTexture.fill(0);
    colTexture.fill(0);

    bestComponent.pixels.forEach((p) => {
      const x = p % W;
      const y = Math.floor(p / W);
      const texture = textureAt(x, y);
      mask[p] = 1;
      rowHits[y]++;
      colHits[x]++;
      rowTexture[y] += texture;
      colTexture[x] += texture;
    });
  }

  const rowIsDoc = (y) => {
    const prev = rowHits[Math.max(0, y - 1)];
    const next = rowHits[Math.min(H - 1, y + 1)];
    const textureAvg = rowTexture[y] / Math.max(1, rowHits[y]);
    const neighborTexture = (
      rowTexture[Math.max(0, y - 1)] +
      rowTexture[y] +
      rowTexture[Math.min(H - 1, y + 1)]
    ) / 3;
    return rowHits[y] > W * 0.20 && (prev + rowHits[y] + next) / 3 > W * 0.16 && (textureAvg > 2.1 || neighborTexture > W * 0.8);
  };
  const colIsDoc = (x) => {
    const prev = colHits[Math.max(0, x - 1)];
    const next = colHits[Math.min(W - 1, x + 1)];
    const textureAvg = colTexture[x] / Math.max(1, colHits[x]);
    const neighborTexture = (
      colTexture[Math.max(0, x - 1)] +
      colTexture[x] +
      colTexture[Math.min(W - 1, x + 1)]
    ) / 3;
    return colHits[x] > H * 0.18 && (prev + colHits[x] + next) / 3 > H * 0.14 && (textureAvg > 2.1 || neighborTexture > H * 0.8);
  };
  const firstRow = rowHits.findIndex((_, y) => rowIsDoc(y));
  const lastRowReverse = rowHits.slice().reverse().findIndex((_, reverseY) => rowIsDoc(H - 1 - reverseY));
  const firstCol = colHits.findIndex((_, x) => colIsDoc(x));
  const lastColReverse = colHits.slice().reverse().findIndex((_, reverseX) => colIsDoc(W - 1 - reverseX));

  if (firstRow < 0 || lastRowReverse < 0 || firstCol < 0 || lastColReverse < 0) {
    finish({ left: 0, top: 0, right: 1, bottom: 1, confianza: 'baja' });
    return;
  }

  let minY = firstRow;
  let maxY = H - 1 - lastRowReverse;
  let minX = firstCol;
  let maxX = W - 1 - lastColReverse;

  const localRunLeft = (y) => {
    const rowLimit = Math.max(3, Math.round(W * 0.018));
    let run = 0;
    for (let x = minX; x <= maxX; x++) {
      run = mask[idx(x, y)] ? run + 1 : 0;
      if (run >= rowLimit) return x - run + 1;
    }
    return null;
  };
  const localRunRight = (y) => {
    const rowLimit = Math.max(3, Math.round(W * 0.018));
    let run = 0;
    for (let x = maxX; x >= minX; x--) {
      run = mask[idx(x, y)] ? run + 1 : 0;
      if (run >= rowLimit) return x + run - 1;
    }
    return null;
  };
  const localRunTop = (x) => {
    const colLimit = Math.max(3, Math.round(H * 0.014));
    let run = 0;
    for (let y = minY; y <= maxY; y++) {
      run = mask[idx(x, y)] ? run + 1 : 0;
      if (run >= colLimit) return y - run + 1;
    }
    return null;
  };
  const localRunBottom = (x) => {
    const colLimit = Math.max(3, Math.round(H * 0.014));
    let run = 0;
    for (let y = maxY; y >= minY; y--) {
      run = mask[idx(x, y)] ? run + 1 : 0;
      if (run >= colLimit) return y + run - 1;
    }
    return null;
  };

  const leftPoints = [];
  const rightPoints = [];
  for (let y = minY; y <= maxY; y++) {
    if (rowHits[y] < W * 0.18) continue;
    const left = localRunLeft(y);
    const right = localRunRight(y);
    if (left !== null && right !== null && right - left > W * 0.22) {
      leftPoints.push({ x: left, y });
      rightPoints.push({ x: right, y });
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
    }
  }

  const topPoints = [];
  const bottomPoints = [];
  for (let x = minX; x <= maxX; x++) {
    if (colHits[x] < H * 0.16) continue;
    const top = localRunTop(x);
    const bottom = localRunBottom(x);
    if (top !== null && bottom !== null && bottom - top > H * 0.22) {
      topPoints.push({ x, y: top });
      bottomPoints.push({ x, y: bottom });
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    }
  }

  const fitXForY = (points) => {
    if (points.length < 2) return null;
    let sx = 0, sy = 0, syy = 0, sxy = 0;
    points.forEach((point) => {
      sx += point.x;
      sy += point.y;
      syy += point.y * point.y;
      sxy += point.x * point.y;
    });
    const n = points.length;
    const den = n * syy - sy * sy;
    if (Math.abs(den) < 0.0001) return null;
    const a = (n * sxy - sy * sx) / den;
    const b = (sx - a * sy) / n;
    return { a, b };
  };

  const fitYForX = (points) => {
    if (points.length < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    points.forEach((point) => {
      sx += point.x;
      sy += point.y;
      sxx += point.x * point.x;
      sxy += point.x * point.y;
    });
    const n = points.length;
    const den = n * sxx - sx * sx;
    if (Math.abs(den) < 0.0001) return null;
    const a = (n * sxy - sx * sy) / den;
    const b = (sy - a * sx) / n;
    return { a, b };
  };

  const intersect = (side, edge) => {
    if (!side || !edge) return null;
    const den = 1 - edge.a * side.a;
    if (Math.abs(den) < 0.0001) return null;
    const y = (edge.a * side.b + edge.b) / den;
    const x = side.a * y + side.b;
    return { x: clamp(x, 0, W - 1), y: clamp(y, 0, H - 1) };
  };

  const leftLine = fitXForY(leftPoints);
  const rightLine = fitXForY(rightPoints);
  const topLine = fitYForX(topPoints);
  const bottomLine = fitYForX(bottomPoints);

  const tl = intersect(leftLine, topLine) || { x: minX, y: minY };
  const tr = intersect(rightLine, topLine) || { x: maxX, y: minY };
  const bl = intersect(leftLine, bottomLine) || { x: minX, y: maxY };
  const br = intersect(rightLine, bottomLine) || { x: maxX, y: maxY };

  if (minX >= maxX || minY >= maxY || rightPoints.length < 5 || leftPoints.length < 5) {
    finish({ left: 0, top: 0, right: 1, bottom: 1, confianza: 'baja' });
    return;
  }

  const margin = 0.018;
  const detectedWidth = maxX - minX;
  const detectedHeight = maxY - minY;
  const area = (detectedWidth * detectedHeight) / (W * H);
  const normalizePoint = (point) => ({
    x: clamp(point.x / W, 0, 1),
    y: clamp(point.y / H, 0, 1)
  });
  const resultado = {
    left: Math.max(0, (minX / W) - margin),
    top: Math.max(0, (minY / H) - margin),
    right: Math.min(1, (maxX / W) + margin),
    bottom: Math.min(1, (maxY / H) + margin),
    corners: {
      tl: normalizePoint(tl),
      tr: normalizePoint(tr),
      bl: normalizePoint(bl),
      br: normalizePoint(br)
    },
    confianza: detectedWidth > W * 0.38 && detectedHeight > H * 0.38 && area > 0.20 && topPoints.length > 5 && bottomPoints.length > 5 ? 'alta' : 'media'
  };

  finish(resultado);
};

img.src = 'data:image/jpeg;base64,${base64Img.replace(/[\r\n]/g, '')}';
</script>
</body>
</html>
`;

export default function EscanerPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri: string;
    existingPages?: string;
    fromIndicator?: string;
    indicatorName?: string;
    criterio?: string;
    year?: string;
    breadcrumb?: string;
  }>();

  const originalUri = params.imageUri || '';
  const existingPages: string[] = params.existingPages ? JSON.parse(params.existingPages) : [];

  const [currentUri, setCurrentUri] = useState(originalUri);
  const [bnActive, setBnActive] = useState(false);
  const [brightnessUp, setBrightnessUp] = useState(false);
  const [contrastUp, setContrastUp] = useState(false);
  const [rotationCount, setRotationCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Procesando...');
  const [detectando, setDetectando] = useState(false);
  const [base64ParaDeteccion, setBase64ParaDeteccion] = useState('');
  const [, setMargenes] = useState<MargenesDetectados | null>(null);
  const [mostrarConfirmacionRecorte, setMostrarConfirmacionRecorte] = useState(false);
  const [cropCorners, setCropCorners] = useState<CropCorners | null>(null);
  const cropBoxSizeRef = useRef({ width: 0, height: 0 });
  const cropImageSizeRef = useRef({ width: 0, height: 0 });
  const [cropBoxSize, setCropBoxSize] = useState<Size>({ width: 0, height: 0 });
  const [cropImageSize, setCropImageSize] = useState<Size>({ width: 0, height: 0 });
  const [webViewRecorteConfig, setWebViewRecorteConfig] = useState<{
    html: string;
    onMessage: (event: any) => void;
  } | null>(null);

  const cornersRef = useRef<CropCorners | null>(null);
  React.useEffect(() => {
    cornersRef.current = cropCorners;
  }, [cropCorners]);

  React.useEffect(() => {
    let active = true;

    if (!currentUri) {
      cropImageSizeRef.current = { width: 0, height: 0 };
      setCropImageSize({ width: 0, height: 0 });
      return () => {
        active = false;
      };
    }

    getImageSize(currentUri)
      .then(size => {
        if (!active) return;
        cropImageSizeRef.current = size;
        setCropImageSize(size);
      })
      .catch(() => {
        if (!active) return;
        cropImageSizeRef.current = { width: 0, height: 0 };
        setCropImageSize({ width: 0, height: 0 });
      });

    return () => {
      active = false;
    };
  }, [currentUri]);

  const initialCorners = useRef<CropCorners | null>(null);

  const createCornerResponder = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        initialCorners.current = cornersRef.current ? cloneCorners(cornersRef.current) : null;
      },
      onPanResponderMove: (_, gestureState) => {
        const box = cropBoxSizeRef.current;
        const image = cropImageSizeRef.current;
        const layout = getContainLayout(box, image);
        if (!initialCorners.current || layout.displayW === 0 || layout.displayH === 0) return;

        const dx = gestureState.dx / layout.displayW;
        const dy = gestureState.dy / layout.displayH;

        const orig = initialCorners.current[corner];
        const newX = clamp01(orig.x + dx);
        const newY = clamp01(orig.y + dy);
        const nextPoint = constrainCorner(corner, { x: newX, y: newY }, initialCorners.current);

        setCropCorners(prev => prev ? { ...prev, [corner]: nextPoint } : prev);
      },
    });
  };

  const panResponderTL = useRef(createCornerResponder('tl')).current;
  const panResponderTR = useRef(createCornerResponder('tr')).current;
  const panResponderBL = useRef(createCornerResponder('bl')).current;
  const panResponderBR = useRef(createCornerResponder('br')).current;

  const totalPages = existingPages.length + 1;
  const busy = isProcessing || detectando;

  const forwardParams = () => ({
    fromIndicator: params.fromIndicator || '',
    indicatorName: params.indicatorName || '',
    criterio: params.criterio || '',
    year: params.year || '',
    breadcrumb: params.breadcrumb || '',
  });

  const aplicarRecorte = useCallback(async (corners: CropCorners, mostrarToast = true) => {
    setIsProcessing(true);
    setProcessingLabel('Recortando imagen...');
    try {
      const { width: imgW, height: imgH } = await getImageSize(currentUri);
      const imgCorners = sanitizeCorners(corners);

      const dxTop = (imgCorners.tr.x - imgCorners.tl.x) * imgW;
      const dyTop = (imgCorners.tr.y - imgCorners.tl.y) * imgH;
      const wTop = Math.sqrt(dxTop * dxTop + dyTop * dyTop);

      const dxBottom = (imgCorners.br.x - imgCorners.bl.x) * imgW;
      const dyBottom = (imgCorners.br.y - imgCorners.bl.y) * imgH;
      const wBottom = Math.sqrt(dxBottom * dxBottom + dyBottom * dyBottom);

      const dyLeft = (imgCorners.bl.y - imgCorners.tl.y) * imgH;
      const dxLeft = (imgCorners.bl.x - imgCorners.tl.x) * imgW;
      const hLeft = Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft);

      const dyRight = (imgCorners.br.y - imgCorners.tr.y) * imgH;
      const dxRight = (imgCorners.br.x - imgCorners.tr.x) * imgW;
      const hRight = Math.sqrt(dxRight * dxRight + dyRight * dyRight);

      const rawTargetW = Math.max(100, Math.round(Math.max(wTop, wBottom)));
      const rawTargetH = Math.max(100, Math.round(Math.max(hLeft, hRight)));
      const maxOutputSide = 2200;
      const outputScale = Math.min(1, maxOutputSide / Math.max(rawTargetW, rawTargetH));
      const targetW = Math.max(100, Math.round(rawTargetW * outputScale));
      const targetH = Math.max(100, Math.round(rawTargetH * outputScale));

      const base64 = await FileSystem.readAsStringAsync(currentUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const onMessage = async (event: any) => {
        try {
          const res = JSON.parse(event.nativeEvent.data);
          if (res.status === 'success') {
            const tempUri = FileSystem.cacheDirectory + 'recortada_' + Date.now() + '.jpg';
            const rawBase64 = res.data.split(',')[1];
            await FileSystem.writeAsStringAsync(tempUri, rawBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            setCurrentUri(tempUri);
            setCropCorners(null);
            setMargenes(null);
            setMostrarConfirmacionRecorte(false);
            if (mostrarToast) {
              Toast.show({ type: 'success', text1: 'Recorte aplicado ✓' });
            }
          } else {
            console.error('Warp error inside WebView:', res.error);
            Toast.show({ type: 'error', text1: 'Recorte', text2: 'Error: ' + res.error });
          }
        } catch (e: any) {
          console.error('onMessage parse error:', e);
          Toast.show({ type: 'error', text1: 'Recorte', text2: 'No se pudo procesar la respuesta.' });
        } finally {
          setIsProcessing(false);
          setProcessingLabel('Procesando...');
          setWebViewRecorteConfig(null);
        }
      };

      setWebViewRecorteConfig({
        html: htmlRecorte(base64, imgCorners, targetW, targetH),
        onMessage,
      });

    } catch (error) {
      console.error('Crop error:', error);
      Toast.show({ type: 'error', text1: 'Recorte', text2: 'No se pudo aplicar el recorte.' });
      setIsProcessing(false);
      setProcessingLabel('Procesando...');
    }
  }, [currentUri]);

  const handleRotate = useCallback(async () => {
    if (!manipulateAsync || !SaveFormat) {
      Toast.show({ type: 'info', text1: 'Rotación', text2: 'expo-image-manipulator no disponible.' });
      return;
    }

    setIsProcessing(true);
    setProcessingLabel('Rotando imagen...');
    try {
      const result = await manipulateAsync(
        currentUri,
        [{ rotate: -90 }],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
      setRotationCount(current => current + 1);
    } catch (error) {
      console.error('Rotation error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo rotar la imagen.' });
    } finally {
      setIsProcessing(false);
      setProcessingLabel('Procesando...');
    }
  }, [currentUri]);

  const procesarMargenes = useCallback(async () => {
    if (busy) return;

    setDetectando(true);
    setProcessingLabel('Detectando bordes...');
    try {
      const base64 = await FileSystem.readAsStringAsync(currentUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setBase64ParaDeteccion(base64);
    } catch (error) {
      console.error('Detection read error:', error);
      setDetectando(false);
      setProcessingLabel('Procesando...');
      Toast.show({ type: 'error', text1: 'Auto-recorte', text2: 'No se pudo leer la imagen.' });
    }
  }, [busy, currentUri]);

  const handleResultadoDeteccion = useCallback(async (event: any) => {
    setBase64ParaDeteccion('');

    try {
      const resultado = JSON.parse(event.nativeEvent.data) as MargenesConEsquinas;
      setMargenes(resultado);

      if (resultado.confianza === 'baja') {
        setDetectando(false);
        setProcessingLabel('Procesando...');
        Toast.show({
          type: 'info',
          text1: 'Auto-recorte',
          text2: 'No se detectaron márgenes claros, ajusta la iluminación.',
        });
        return;
      }

      setDetectando(false);
      setProcessingLabel('Procesando...');
      setCropCorners(cornersFromDetection(resultado));
      setMostrarConfirmacionRecorte(true);
      Toast.show({ type: 'success', text1: 'Bordes detectados', text2: 'Revisa y presiona Aplicar.' });
    } catch (error) {
      console.error('Detection parse error:', error);
      setDetectando(false);
      setProcessingLabel('Procesando...');
      Toast.show({ type: 'error', text1: 'Auto-recorte', text2: 'No se pudo procesar la detección.' });
    }
  }, []);

  const handleDetectionWebViewError = useCallback(async () => {
    setBase64ParaDeteccion('');
    setDetectando(false);
    setProcessingLabel('Procesando...');

    const fallback = await detectarMargenes(currentUri);
    if (fallback.confianza === 'baja') {
      Toast.show({
        type: 'info',
        text1: 'Auto-recorte',
        text2: 'No se detectaron márgenes claros, ajusta la iluminación.',
      });
      return;
    }

    setMargenes(fallback);
    setCropCorners(cornersFromDetection(fallback));
    setMostrarConfirmacionRecorte(true);
  }, [currentUri]);

  const toggleBN = () => setBnActive(!bnActive);
  const toggleBrightness = () => setBrightnessUp(!brightnessUp);

  const handleRevertir = () => {
    setCurrentUri(originalUri);
    setBnActive(false);
    setBrightnessUp(false);
    setContrastUp(false);
    setRotationCount(0);
    setMargenes(null);
    setCropCorners(null);
    Toast.show({ type: 'success', text1: 'Imagen restaurada', text2: 'Se revirtieron todos los cambios.' });
  };

  const hasChanges = currentUri !== originalUri || bnActive || brightnessUp || contrastUp || rotationCount > 0;

  const handleRetake = () => {
    router.back();
  };

  const handleAddPage = async () => {
    const updatedPages = [...existingPages, currentUri];

    if (Platform.OS === 'ios') {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a la cámara para escanear documentos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir configuración', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
        exif: false,
      });

      if (!resultado.canceled && resultado.assets[0]) {
        router.push({
          pathname: '/escaner-preview',
          params: {
            imageUri: resultado.assets[0].uri,
            existingPages: JSON.stringify(updatedPages),
            ...forwardParams(),
          },
        });
      }
    } else {
      router.push({
        pathname: '/escaner',
        params: {
          existingPages: JSON.stringify(updatedPages),
          ...forwardParams(),
        },
      });
    }
  };

  const handleContinue = () => {
    const allPages = [...existingPages, currentUri];

    if (allPages.length > 1) {
      router.push({
        pathname: '/escaner-paginas',
        params: {
          pages: JSON.stringify(allPages),
          ...forwardParams(),
        },
      });
    } else {
      router.push({
        pathname: '/escaner-guardar',
        params: {
          pages: JSON.stringify(allPages),
          ...forwardParams(),
        },
      });
    }
  };

  const handleManualCrop = () => {
    setCropCorners({
      tl: { x: 0.08, y: 0.08 },
      tr: { x: 0.92, y: 0.08 },
      bl: { x: 0.08, y: 0.92 },
      br: { x: 0.92, y: 0.92 },
    });
    setMostrarConfirmacionRecorte(true);
  };

  const enhancementButtons = [
    { key: 'bn', icon: 'moon-outline' as const, label: 'B/N', active: bnActive, onPress: toggleBN },
    { key: 'brillo', icon: 'sunny-outline' as const, label: 'Brillo+', active: brightnessUp, onPress: toggleBrightness },
    { key: 'rotar', icon: 'refresh-outline' as const, label: 'Rotar', active: false, onPress: handleRotate },
    { key: 'manual', icon: 'crop-outline' as const, label: 'Recortar', active: false, onPress: handleManualCrop },
    { key: 'auto', icon: 'scan-outline' as const, label: 'Auto IA', active: detectando, onPress: procesarMargenes },
    ...(hasChanges ? [{ key: 'revertir', icon: 'arrow-undo-outline' as const, label: 'Revertir', active: false, onPress: handleRevertir }] : []),
  ];
  const cropOverlayPoints = cropCorners && cropBoxSize.width > 0 && cropImageSize.width > 0
    ? {
      tl: cropPointToBoxPoint(cropCorners.tl, cropBoxSize, cropImageSize),
      tr: cropPointToBoxPoint(cropCorners.tr, cropBoxSize, cropImageSize),
      bl: cropPointToBoxPoint(cropCorners.bl, cropBoxSize, cropImageSize),
      br: cropPointToBoxPoint(cropCorners.br, cropBoxSize, cropImageSize),
    }
    : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pageCounterRow}>
          <Ionicons name="document-text" size={18} color="#2563eb" />
          <Text style={styles.pageCounterText}>Página {totalPages} de {totalPages}</Text>
        </View>

        <View style={styles.imageContainer}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: currentUri }} style={styles.image} resizeMode="contain" />
            {bnActive && <View style={styles.bnOverlay} />}
            {brightnessUp && <View style={styles.brightnessOverlay} />}
            {contrastUp && <View style={styles.contrastOverlay} />}
          </View>

          {busy && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.processingText}>{processingLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.enhancementsRow}>
          {enhancementButtons.map(btn => (
            <TouchableOpacity
              key={btn.key}
              style={[styles.enhBtn, btn.active && styles.enhBtnActive]}
              onPress={btn.onPress}
              disabled={busy}
            >
              <Ionicons name={btn.icon} size={20} color={btn.active ? '#fff' : '#4b5563'} />
              <Text style={[styles.enhBtnText, btn.active && { color: '#fff' }]} numberOfLines={2}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(bnActive || brightnessUp || contrastUp || rotationCount > 0) && (
          <View style={styles.activeEffects}>
            {bnActive && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>B/N activo</Text>
              </View>
            )}
            {brightnessUp && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>Brillo+</Text>
              </View>
            )}
            {contrastUp && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>Contraste+</Text>
              </View>
            )}
            {rotationCount > 0 && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>Rotado {(rotationCount * 90) % 360}°</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {base64ParaDeteccion ? (
        <WebView
          style={styles.hiddenWebView}
          source={{ html: htmlDeteccion(base64ParaDeteccion) }}
          onMessage={handleResultadoDeteccion}
          onError={handleDetectionWebViewError}
        />
      ) : null}

      {webViewRecorteConfig ? (
        <WebView
          style={styles.hiddenWebView}
          source={{ html: webViewRecorteConfig.html }}
          onMessage={webViewRecorteConfig.onMessage}
          onError={() => {
            setIsProcessing(false);
            setProcessingLabel('Procesando...');
            setWebViewRecorteConfig(null);
            Toast.show({ type: 'error', text1: 'Recorte', text2: 'Error al iniciar WebView de recorte.' });
          }}
        />
      ) : null}

      <Modal visible={mostrarConfirmacionRecorte} transparent animationType="fade">
        <View style={styles.cropModalOverlay}>
          <View style={styles.cropModal}>
            <Text style={styles.cropModalTitle}>Ajustar Recorte</Text>
            <Text style={styles.cropModalText}>Arrastra cada esquina libremente para alinear con el documento.</Text>
            <View
              style={styles.cropPreviewBox}
              onLayout={(e) => {
                const nextSize = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
                cropBoxSizeRef.current = nextSize;
                setCropBoxSize(current =>
                  current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
                );
              }}
            >
              <Image source={{ uri: currentUri }} style={styles.cropPreviewImage} resizeMode="contain" />
              {cropOverlayPoints && (
                <>
                  <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    <Line
                      x1={cropOverlayPoints.tl.x} y1={cropOverlayPoints.tl.y}
                      x2={cropOverlayPoints.tr.x} y2={cropOverlayPoints.tr.y}
                      stroke="#22c55e" strokeWidth="2.5"
                    />
                    <Line
                      x1={cropOverlayPoints.tr.x} y1={cropOverlayPoints.tr.y}
                      x2={cropOverlayPoints.br.x} y2={cropOverlayPoints.br.y}
                      stroke="#22c55e" strokeWidth="2.5"
                    />
                    <Line
                      x1={cropOverlayPoints.br.x} y1={cropOverlayPoints.br.y}
                      x2={cropOverlayPoints.bl.x} y2={cropOverlayPoints.bl.y}
                      stroke="#22c55e" strokeWidth="2.5"
                    />
                    <Line
                      x1={cropOverlayPoints.bl.x} y1={cropOverlayPoints.bl.y}
                      x2={cropOverlayPoints.tl.x} y2={cropOverlayPoints.tl.y}
                      stroke="#22c55e" strokeWidth="2.5"
                    />
                  </Svg>
                  <View style={[styles.cropCorner, { left: cropOverlayPoints.tl.x, top: cropOverlayPoints.tl.y }]} {...panResponderTL.panHandlers}>
                    <View style={styles.cropCornerInner} />
                  </View>
                  <View style={[styles.cropCorner, { left: cropOverlayPoints.tr.x, top: cropOverlayPoints.tr.y }]} {...panResponderTR.panHandlers}>
                    <View style={styles.cropCornerInner} />
                  </View>
                  <View style={[styles.cropCorner, { left: cropOverlayPoints.bl.x, top: cropOverlayPoints.bl.y }]} {...panResponderBL.panHandlers}>
                    <View style={styles.cropCornerInner} />
                  </View>
                  <View style={[styles.cropCorner, { left: cropOverlayPoints.br.x, top: cropOverlayPoints.br.y }]} {...panResponderBR.panHandlers}>
                    <View style={styles.cropCornerInner} />
                  </View>
                </>
              )}
            </View>
            <View style={styles.cropModalActions}>
              <TouchableOpacity
                style={styles.cropCancelBtn}
                onPress={() => {
                  setMostrarConfirmacionRecorte(false);
                  setCropCorners(null);
                  setMargenes(null);
                }}
              >
                <Text style={styles.cropCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cropApplyBtn}
                onPress={() => cropCorners && aplicarRecorte(cropCorners)}
              >
                <Text style={styles.cropApplyText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} disabled={busy}>
          <Ionicons name="refresh" size={18} color="#6b7280" />
          <Text style={styles.retakeBtnText}>Repetir foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addPageBtn} onPress={handleAddPage} disabled={busy}>
          <Ionicons name="add-circle" size={18} color="#2563eb" />
          <Text style={styles.addPageBtnText}>Agregar página</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} disabled={busy}>
          <Text style={styles.continueBtnText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { padding: 16, paddingBottom: 110 },
  pageCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  pageCounterText: { fontSize: 14, color: '#1e40af', fontWeight: '600' },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 0.65,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  bnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  brightnessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  contrastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  processingText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  enhancementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  enhBtn: {
    flexBasis: '18%',
    flexGrow: 1,
    maxWidth: '22%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 3,
    backgroundColor: '#fff',
    borderRadius: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  enhBtnActive: { backgroundColor: '#2563eb' },
  enhBtnText: { fontSize: 10, color: '#4b5563', fontWeight: '600', textAlign: 'center' },
  activeEffects: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  effectTag: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  effectTagText: { fontSize: 11, color: '#1e40af', fontWeight: '600' },
  hiddenWebView: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  cropModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  cropModal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  cropModalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  cropModalText: { color: '#64748b', fontSize: 13, marginTop: 6, marginBottom: 12 },
  cropPreviewBox: {
    width: '100%',
    aspectRatio: 0.65,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    position: 'relative',
    overflow: 'visible',
  },
  cropPreviewImage: { width: '100%', height: '100%', borderRadius: 12 },
  cropCorner: {
    position: 'absolute',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  cropCornerInner: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  cropModalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cropCancelBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cropCancelText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  cropApplyBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  cropApplyText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 32,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  retakeBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  addPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  addPageBtnText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  continueBtnText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
});
