// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/support/png.js — a minimal PNG reader for the golden-snapshot tests (non-interlaced, 8-bit grey, grey+alpha,
// RGB or RGBA; the snapshot pictures in docs/original-snapshots are 8-bit RGB). Node only (zlib).
import fs from 'node:fs';
import zlib from 'node:zlib';

/** Decode a PNG file: { width, height, channels, pixel(x, y) -> [r, g, b] } (alpha ignored). */
export function readPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: not a PNG`);
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (bitDepth !== 8 || !channels || interlace) throw new Error(`${file}: unsupported PNG (bit depth ${bitDepth}, colour type ${colorType}, interlace ${interlace})`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[dst + x - channels] : 0;
      const b = y > 0 ? out[dst - stride + x] : 0;
      const c = x >= channels && y > 0 ? out[dst - stride + x - channels] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  const pixel = (x, y) => {
    const o = y * stride + x * channels;
    return channels >= 3 ? [out[o], out[o + 1], out[o + 2]] : [out[o], out[o], out[o]];
  };
  return { width, height, channels, data: out, pixel };
}
