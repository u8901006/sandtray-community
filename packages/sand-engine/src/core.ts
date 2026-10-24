   
                                                                  
  
                                                                        
                            
                                                       
                                                      
                                             
                                            
                                         
  
                                                                  
                                                       
  
                                                                       
  
               
                                                           
                                                         
                                                                          
                                                                       
                                                    
   

                                      
export const CELLS_PER_CM = 2;
                                
export const MIN_CELLS = 60;
export const MAX_CELLS = 240;
                                                 
export const DEFAULT_RADIUS_CM = 6.5;
   
                                                                 
                                                       
                                               
   
export const DEFAULT_STRENGTH_Q8 = 896;
                                           
export const SMOOTH_STRENGTH_Q8 = 256;
                                                                         
const K_OCTAGON_Q10 = 1448;

export type TrayShape = 'rect' | 'square' | 'circle' | 'octagon';
export type BrushTool = 'dig' | 'mound' | 'smooth';

export interface TraySizeCm {
                                                          
  w: number;
  h: number;
                  
  depth: number;
}

export interface Heightmap {
  shape: TrayShape;
                                     
  w: number;
  h: number;
                                              
  sizeCm: TraySizeCm;
  depthCm: number;
                                       
  data: Uint8Array;
                                                    
  mask: Uint8Array;
}

export interface BrushOp {
  tool: BrushTool;
                       
  cx: number;
  cz: number;
  radiusCm: number;
     
                                               
                                                                            
     
  strength: number;
}

                                                   
export interface Patch {
  x0: number;
  y0: number;
  w: number;
  h: number;
  patch: Uint8Array;
}

   
                                                                        
                                                     
                                                                      
   
const G_LUT = new Uint16Array([
  256,252,247,243,239,234,230,226,222,219,215,211,207,204,200,197,
  193,190,187,183,180,177,174,171,168,165,162,159,156,154,151,148,
  146,143,141,138,136,134,131,129,127,125,122,120,118,116,114,112,
  110,108,106,104,103,101,99,97,96,94,92,91,89,88,86,85,
  83,82,80,79,77,76,75,73,72,71,70,68,67,66,65,64,
  63,62,61,60,58,57,56,55,55,54,53,52,51,50,49,48,
  47,47,46,45,44,43,43,42,41,40,40,39,38,38,37,36,
  36,35,35,34,33,33,32,32,31,31,30,29,29,28,28,27,
  27,27,26,26,25,25,24,24,23,23,23,22,22,21,21,21,
  20,20,20,19,19,19,18,18,18,17,17,17,16,16,16,16,
  15,15,15,15,14,14,14,14,13,13,13,13,12,12,12,12,
  12,11,11,11,11,11,10,10,10,10,10,10,9,9,9,9,
  9,9,8,8,8,8,8,8,8,7,7,7,7,7,7,7,
  7,6,6,6,6,6,6,6,6,6,6,5,5,5,5,5,
  5,5,5,5,5,5,4,4,4,4,4,4,4,4,4,4,
  4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,
  3,
]);

function clampCells(cm: number): number {
  return Math.min(MAX_CELLS, Math.max(MIN_CELLS, Math.round(cm * CELLS_PER_CM)));
}

                                                         
export function surfaceU8(depthCm: number): number {
  return Math.round((depthCm / (depthCm + 3)) * 255);
}

                                       
export function u8ToCm(v: number, depthCm: number): number {
  return (v / 255) * (depthCm + 3);
}

function computeMask(shape: TrayShape, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  if (shape === 'rect' || shape === 'square') {
    mask.fill(1);
    return mask;
  }
  const cx = w / 2;
  const cz = h / 2;
  if (shape === 'circle') {
    const r2 = (w / 2) * (h / 2);
    for (let j = 0; j < h; j++) {
      const dz = j + 0.5 - cz;
      for (let i = 0; i < w; i++) {
        const dx = i + 0.5 - cx;
        mask[j * w + i] = dx * dx + dz * dz <= r2 ? 1 : 0;
      }
    }
    return mask;
  }
                                                                        
  const half = Math.floor(Math.min(w, h) / 2);
  const t = (half * K_OCTAGON_Q10) >> 10;
  for (let j = 0; j < h; j++) {
    const dz = Math.abs(j + 0.5 - cz);
    for (let i = 0; i < w; i++) {
      const dx = Math.abs(i + 0.5 - cx);
      mask[j * w + i] = dx <= half && dz <= half && dx + dz <= t ? 1 : 0;
    }
  }
  return mask;
}

   
                                                            
                                                              
   
export function createHeightmap(shape: TrayShape, sizeCm: TraySizeCm): Heightmap {
  const square = shape === 'square' || shape === 'circle' || shape === 'octagon';
  const size: TraySizeCm = square ? { w: sizeCm.w, h: sizeCm.w, depth: sizeCm.depth } : { ...sizeCm };
  const w = clampCells(size.w);
  const h = clampCells(size.h);
  const hm: Heightmap = {
    shape,
    w,
    h,
    sizeCm: size,
    depthCm: size.depth,
    data: new Uint8Array(w * h),
    mask: computeMask(shape, w, h),
  };
  hm.data.fill(surfaceU8(size.depth));
  return hm;
}

                                                    
export function applyBrush(hm: Heightmap, op: BrushOp): Patch {
  const { w, h, data, mask } = hm;
  const rc = Math.max(1, Math.round(op.radiusCm * CELLS_PER_CM));
  const cx = Math.round(op.cx * CELLS_PER_CM);
  const cz = Math.round(op.cz * CELLS_PER_CM);
  const rc2 = rc * rc;
  let x0 = Math.max(0, cx - rc);
  let x1 = Math.min(w - 1, cx + rc);
  let y0 = Math.max(0, cz - rc);
  let y1 = Math.min(h - 1, cz + rc);
  if (x1 < x0 || y1 < y0) {
    return { x0: 0, y0: 0, w: 0, h: 0, patch: new Uint8Array(0) };
  }
                                                
  const px0 = x0;
  const py0 = y0;
  const pw = x1 - x0 + 1;
  const ph = y1 - y0 + 1;

  if (op.tool === 'smooth') {
    x0 = Math.max(0, x0 - 1);
    y0 = Math.max(0, y0 - 1);
    x1 = Math.min(w - 1, x1 + 1);
    y1 = Math.min(h - 1, y1 + 1);
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
                           
    const snap = new Uint8Array(bw * bh);
    for (let j = 0; j < bh; j++) {
      snap.set(data.subarray((y0 + j) * w + x0, (y0 + j) * w + x0 + bw), j * bw);
    }
    const blend = Math.min(op.strength, 256);
    for (let j = py0; j <= y1 && j < py0 + ph; j++) {
      for (let i = px0; i <= x1 && i < px0 + pw; i++) {
        const idx = j * w + i;
        if (mask[idx] === 0) continue;
        const dx = i - cx;
        const dz = j - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > rc2) continue;
        const u = (d2 * 256 / rc2) | 0;
        const wgt = (G_LUT[u] * (256 - u)) >> 8;                
                                   
        let sum = 0;
        for (let nj = Math.max(y0, j - 1); nj <= Math.min(y1, j + 1); nj++) {
          for (let ni = Math.max(x0, i - 1); ni <= Math.min(x1, i + 1); ni++) {
            sum += snap[(nj - y0) * bw + (ni - x0)];
          }
        }
        const avg = (sum + 4) / 9 | 0;
        const old = data[idx];
        const wb = (wgt * blend) >> 8;                 
                                                                       
        data[idx] = old + (((avg - old) * wb + 128) >> 8);
      }
    }
  } else {
    for (let j = py0; j < py0 + ph; j++) {
      for (let i = px0; i < px0 + pw; i++) {
        const idx = j * w + i;
        if (mask[idx] === 0) continue;
        const dx = i - cx;
        const dz = j - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > rc2) continue;
        const u = (d2 * 256 / rc2) | 0;
        const wgt = (G_LUT[u] * (256 - u)) >> 8;
        const delta = (wgt * op.strength) >> 16;
        if (op.tool === 'dig') {
          const v = data[idx] - delta;
          data[idx] = v < 0 ? 0 : v;
        } else {
          const v = data[idx] + delta;
          data[idx] = v > 255 ? 255 : v;
        }
      }
    }
  }

  const patch = new Uint8Array(pw * ph);
  for (let j = 0; j < ph; j++) {
    patch.set(data.subarray((py0 + j) * w + px0, (py0 + j) * w + px0 + pw), j * pw);
  }
  return { x0: px0, y0: py0, w: pw, h: ph, patch };
}

   
                                                              
                        
   
export function heightAtCm(hm: Heightmap, xCm: number, zCm: number): number {
  const gx = xCm * CELLS_PER_CM - 0.5;
  const gz = zCm * CELLS_PER_CM - 0.5;
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gz);
  if (i0 < 0 || j0 < 0 || i0 + 1 >= hm.w || j0 + 1 >= hm.h) return NaN;
  const idx00 = j0 * hm.w + i0;
  const idx10 = idx00 + 1;
  const idx01 = idx00 + hm.w;
  const idx11 = idx01 + 1;
  if (!hm.mask[idx00] || !hm.mask[idx10] || !hm.mask[idx01] || !hm.mask[idx11]) return NaN;
  const t = gx - i0;
  const s = gz - j0;
  const d = hm.data;
  const v =
    d[idx00] * (1 - t) * (1 - s) +
    d[idx10] * t * (1 - s) +
    d[idx01] * (1 - t) * s +
    d[idx11] * t * s;
  return (v / 255) * (hm.depthCm + 3);
}

                                                                               

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_REV = (() => {
  const rev = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64_ALPHABET.length; i++) rev[B64_ALPHABET.charCodeAt(i)] = i;
  return rev;
})();

                                                       
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += B64_ALPHABET[(n >> 18) & 63];
    out += B64_ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64_ALPHABET[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[n & 63] : '=';
  }
  return out;
}

export function base64ToBytes(s: string): Uint8Array {
  if (s.length % 4 !== 0) throw new Error('base64 length must be multiple of 4');
  let pad = 0;
  if (s.endsWith('==')) pad = 2;
  else if (s.endsWith('=')) pad = 1;
  const outLen = (s.length / 4) * 3 - pad;
  const out = new Uint8Array(outLen);
                                                    
  const val = (k: number): number => {
    const c = s.charCodeAt(k);
    return c === 0x3d ? 0 : B64_REV[c];
  };
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const c0 = val(i);
    const c1 = val(i + 1);
    const c2 = val(i + 2);
    const c3 = val(i + 3);
    if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) throw new Error('invalid base64');
    const n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (o < outLen) out[o++] = (n >> 16) & 0xff;
    if (o < outLen) out[o++] = (n >> 8) & 0xff;
    if (o < outLen) out[o++] = n & 0xff;
  }
  return out;
}

                                                                                 
export function encodeHeightmap(hm: Heightmap): string {
  const shapeCode = ['rect', 'square', 'circle', 'octagon'].indexOf(hm.shape);
  if (shapeCode < 0) throw new Error(`unknown shape: ${hm.shape}`);
  const depthMm = Math.round(hm.depthCm * 10);
  const head = new Uint8Array(11);
  head.set([0x53, 0x4e, 0x44, 0x31, shapeCode], 0);
  head[5] = hm.w & 0xff;
  head[6] = (hm.w >> 8) & 0xff;
  head[7] = hm.h & 0xff;
  head[8] = (hm.h >> 8) & 0xff;
  head[9] = depthMm & 0xff;
  head[10] = (depthMm >> 8) & 0xff;
  const all = new Uint8Array(11 + hm.data.length);
  all.set(head, 0);
  all.set(hm.data, 11);
  return bytesToBase64(all);
}

export function decodeHeightmap(s: string): Heightmap {
  const bytes = base64ToBytes(s);
  if (bytes.length < 11 || bytes[0] !== 0x53 || bytes[1] !== 0x4e || bytes[2] !== 0x44 || bytes[3] !== 0x31) {
    throw new Error('bad magic (expected SND1)');
  }
  const shapes: TrayShape[] = ['rect', 'square', 'circle', 'octagon'];
  const shape = shapes[bytes[4]];
  if (!shape) throw new Error('bad shape code');
  const w = bytes[5] | (bytes[6] << 8);
  const h = bytes[7] | (bytes[8] << 8);
  const depthMm = bytes[9] | (bytes[10] << 8);
  if (w < 1 || h < 1) throw new Error('bad dimensions');
  if (bytes.length !== 11 + w * h) throw new Error('bad payload length');
  const data = new Uint8Array(w * h);
  data.set(bytes.subarray(11));
  const depth = depthMm / 10;
  const sizeCm: TraySizeCm = { w: w / CELLS_PER_CM, h: h / CELLS_PER_CM, depth };
  return { shape, w, h, sizeCm, depthCm: depth, data, mask: computeMask(shape, w, h) };
}
