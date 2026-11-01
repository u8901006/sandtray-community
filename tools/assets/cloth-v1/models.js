// Cloth v1 (2026-10-30, Claude Opus 5.5, user decisions 07:43「方布加長布」「布底下的東西，治療師看不到」): two opaque covering
// cloths to lay over a group of objects. Uniform scale only (the protocol has one scale number), so there is one square and one
// long cloth instead of separate width / length handles.
// Shape: a flat top, a rounded shoulder, and a skirt that hangs to the sand with soft folds at the hem; double-sided so the
// inside never shows through. Colours avoid white and black (shroud / mourning readings); a muted blue-grey and a brick red.
// Deterministic: no random numbers; fixed segment counts.
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const mats = new Map();
function mat(name, color) {
  if (mats.has(name)) return mats.get(name);
  const m = new THREE.MeshStandardMaterial({name: 'CLT_' + name, color, roughness: 0.95, metalness: 0, side: THREE.DoubleSide});
  mats.set(name, m);
  return m;
}
export function resetMaterials() { mats.clear(); }

// Shared proportions (also read by apps/web/src/cloth.ts through the catalogue displaySize; tests check the exported bounds).
export const SHOULDER = 0.14, FLARE = 0.06, HEIGHT = 1.3, CORNER = 0.22;

// Rounded rectangle perimeter (half extents a, b, corner radius c), counter-clockwise from +x, as points with outward normals.
function perimeter(a, b, c, perCorner, perUnit) {
  const pts = [];
  const corners = [[a - c, b - c, 0], [-(a - c), b - c, Math.PI / 2], [-(a - c), -(b - c), Math.PI], [a - c, -(b - c), 1.5 * Math.PI]];
  const straight = (x0, z0, x1, z1, nx, nz) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) * perUnit));
    for (let i = 0; i < n; i++) pts.push({x: x0 + (x1 - x0) * i / n, z: z0 + (z1 - z0) * i / n, nx, nz});
  };
  // edges between corners; corner k sweeps from angle a0 to a0 + 90°
  for (let k = 0; k < 4; k++) {
    const [cx, cz, a0] = corners[k];
    for (let i = 0; i < perCorner; i++) { const t = a0 + (Math.PI / 2) * i / perCorner; pts.push({x: cx + c * Math.cos(t), z: cz + c * Math.sin(t), nx: Math.cos(t), nz: Math.sin(t)}); }
    const [nx0, nz0] = [Math.cos(a0 + Math.PI / 2), Math.sin(a0 + Math.PI / 2)];
    const next = corners[(k + 1) % 4];
    straight(cx + c * nx0, cz + c * nz0, next[0] + c * nx0, next[1] + c * nz0, nx0, nz0);
  }
  return pts;
}
// One cloth: flat top at HEIGHT over the rounded rectangle (half extents a, b); shoulder and skirt swept around its edge.
function cloth(a, b, colour, name) {
  const g = new THREE.Group(), m = mat(name, colour);
  const ring = perimeter(a, b, CORNER, 8, 10), cols = ring.length;
  // profile (s outward from the top edge, y): quarter-circle shoulder, then the skirt down to the sand with a little flare
  const profile = [];
  for (let i = 0; i <= 6; i++) { const t = (Math.PI / 2) * i / 6; profile.push([SHOULDER * Math.sin(t), HEIGHT - SHOULDER + SHOULDER * Math.cos(t), 0]); }
  for (let i = 1; i <= 10; i++) { const t = i / 10; profile.push([SHOULDER + FLARE * t * t, (HEIGHT - SHOULDER) * (1 - t), t]); }
  const pos = [], idx = [], perimeterLength = ring.length;
  // soft folds: the hem moves in and out around the edge; nothing at the shoulder, full at the hem
  const folds = Math.max(8, Math.round(perimeterLength / 5));
  for (const [s, y, hang] of profile) for (let i = 0; i < cols; i++) {
    const p = ring[i], fold = 0.045 * hang * hang * Math.sin(2 * Math.PI * folds * i / cols);
    pos.push(p.x + p.nx * (s + fold), y, p.z + p.nz * (s + fold));
  }
  for (let r = 0; r < profile.length - 1; r++) for (let i = 0; i < cols; i++) {
    const j = (i + 1) % cols, a0 = r * cols + i, b0 = r * cols + j, c0 = (r + 1) * cols + i, d0 = (r + 1) * cols + j;
    idx.push(a0, c0, b0, b0, c0, d0);
  }
  const side = new THREE.BufferGeometry();
  side.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); side.setIndex(idx); side.computeVertexNormals();
  g.add(new THREE.Mesh(side, m));
  // top: the rounded rectangle itself, facing up
  const shape = new THREE.Shape(); shape.moveTo(ring[0].x, -ring[0].z); for (const p of ring.slice(1)) shape.lineTo(p.x, -p.z); shape.closePath();
  const top = new THREE.ShapeGeometry(shape, 1); top.rotateX(-Math.PI / 2); top.translate(0, HEIGHT, 0);
  g.add(new THREE.Mesh(top, m));
  return g;
}

export const BUILDERS = {
  square_cloth: () => cloth(1, 1, 0x5f7287, 'square_bluegrey'),
  long_cloth: () => cloth(2, 1, 0x8a5a4f, 'long_brick'),
};

// Flatten to one mesh per material (bakes transforms; keeps position/normal/uv), origin at bottom centre.
export function finalize(group, slug) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.applyMatrix4(o.matrixWorld);
    if (o.matrixWorld.determinant() < 0) throw new Error(slug + ': mirrored mesh');
    geo.clearGroups();
    const list = byMat.get(o.material) ?? []; list.push(geo); byMat.set(o.material, list);
  });
  const out = new THREE.Group(); out.name = 'CLT_' + slug;
  const merged = [...byMat].sort((a, b) => a[0].name.localeCompare(b[0].name)).map(([m, geos]) => {
    const geo = mergeVertices(mergeGeometries(geos, false), 1e-5);
    const mesh = new THREE.Mesh(geo, m); mesh.name = m.name; return mesh;
  });
  const bounds = new THREE.Box3(); merged.forEach(m => bounds.expandByObject(m));
  const c = bounds.getCenter(new THREE.Vector3());
  for (const m of merged) { m.geometry.translate(-c.x, -bounds.min.y, -c.z); m.geometry.computeBoundingBox(); out.add(m); }
  return out;
}
