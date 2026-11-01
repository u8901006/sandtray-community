// Tunnel v1 (2026-10-30, Claude Opus 5.5, user decision 2026-10-30 07:43「隧道可以放，做成沙具」): four tunnels to set on the sand
// and heap sand over with the existing mound / bury tools (the sand is a heightmap, so it cannot hold a hollow itself).
// - arch_short 短拱隧道: stone portal with arch stones and keystone at both ends, short stone barrel.
// - tunnel_long 長隧道: concrete culvert barrel with a headwall at each end.
// (tunnel_curve 彎道隧道 was removed 2026-10-30 by user decision: its two openings are 90° apart, so it cannot face both trays.)
// - play_tunnel 布製遊戲隧道: children's fabric crawl tunnel, coloured panels between spring-wire rings, open at both ends.
// Every tunnel is open at both ends and has no floor (it stands on the sand). Openings are taller than a standing figure at the
// catalogue's default size (1.6), so a figure fits through at scale 1 once displaySize is applied (see tunnel-v1.json).
// Deterministic: no random numbers; fixed segment counts.
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const mats = new Map();
function mat(name, color, o = {}) {
  if (mats.has(name)) return mats.get(name);
  const m = new THREE.MeshStandardMaterial({name: 'TUN_' + name, color, roughness: o.r ?? 0.9, metalness: 0});
  if (o.side) m.side = o.side;
  mats.set(name, m);
  return m;
}
export function resetMaterials() { mats.clear(); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// Arch outline (s, y): straight sides from y=0 up to the springline h, then a half circle of radius r centred on (0, h).
function archPoints(r, h, n, from = 'right') {
  const pts = [];
  for (let k = 0; k <= n; k++) { const a = Math.PI * k / n; pts.push([r * Math.cos(a), h + r * Math.sin(a)]); }
  return from === 'right' ? pts : pts.reverse();
}
// Barrel cross-section as smooth runs (each run gets its own vertices, so corners stay sharp and arcs stay smooth).
// Order matters: with L = up x T, walking these runs gives outward-facing triangles (see sweep).
function barrelRuns(ro, ri, h, n) {
  const outer = archPoints(ro, h, n, 'right'), inner = archPoints(ri, h, n, 'left');
  return [
    [[ro, 0], [ro, h]], outer, [[-ro, h], [-ro, 0]], [[-ro, 0], [-ri, 0]],
    [[-ri, 0], [-ri, h]], inner, [[ri, h], [ri, 0]], [[ri, 0], [ro, 0]],
  ];
}
function barrelOutline(ro, ri, h, n) {
  return [[ro, 0], ...archPoints(ro, h, n, 'right'), [-ro, 0], [-ri, 0], ...archPoints(ri, h, n, 'left'), [ri, 0]];
}
// path: [{p: Vector3, t: unit tangent}], profile point (s, y) -> p + s*L + y*up, L = up x t.
function frame(f) { return {p: f.p, t: f.t, l: new THREE.Vector3().crossVectors(UP, f.t).normalize()}; }
function sweepRun(run, path, radiusAt = () => 1) {
  const pos = [], idx = [], cols = run.length;
  path.forEach((raw, j) => {
    const f = frame(raw), k = radiusAt(j);
    for (const [s, y] of run) pos.push(...f.p.clone().addScaledVector(f.l, s * k).addScaledVector(UP, y).toArray());
  });
  for (let j = 0; j < path.length - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function shapeOf(points) {
  const s = new THREE.Shape(); s.moveTo(...points[0]); for (const p of points.slice(1)) s.lineTo(...p); s.closePath(); return s;
}
// Place a local (x = L, y = up, z = T) piece at a path frame.
function placeAt(geo, f) {
  const {p, t, l} = frame(f);
  return geo.applyMatrix4(new THREE.Matrix4().makeBasis(l, UP, t).setPosition(p));
}
// Flat slab of the given outline, depth d centred on the frame (z from -d/2 to d/2).
function slab(points, d, f) {
  const g = new THREE.ExtrudeGeometry(shapeOf(points), {depth: d, bevelEnabled: false, curveSegments: 1});
  g.translate(0, 0, -d / 2);
  return placeAt(g, f);
}
// Portal wall: a w x hh rectangle with the barrel's inner arch cut out of its bottom edge.
function portalOutline(w, hh, ri, h, n) {
  return [[-w / 2, 0], [-ri, 0], ...archPoints(ri, h, n, 'left'), [ri, 0], [w / 2, 0], [w / 2, hh], [-w / 2, hh]];
}
function straightPath(len, steps) {
  return Array.from({length: steps + 1}, (_, j) => ({p: V(0, 0, -len / 2 + len * j / steps), t: V(0, 0, 1)}));
}
function mesh(group, geo, m) { group.add(new THREE.Mesh(geo, m)); }
function barrel(group, path, ro, ri, h, m, n = 20) {
  for (const run of barrelRuns(ro, ri, h, n)) mesh(group, sweepRun(run, path), m);
}

function archShort() {
  const g = new THREE.Group(), stone = mat('stone_grey', 0x8f8a80), arch = mat('arch_stone', 0xb3a58c), key = mat('keystone', 0xc8b896);
  const ri = 0.62, h = 0.62, len = 1.3, wall = 0.18, n = 22;
  const path = straightPath(len, 1);
  // review 2026-10-30 (own thumbnail): a thin barrel between two walls read as two separate walls, so the body is one solid
  // block with the arch cut through it; the walls stand proud of it. No two faces share a plane (the first build z-fought where
  // the arch stones met the barrel): wall openings are a little wider than the block's, arch stones a little narrower.
  mesh(g, slab(portalOutline(2.3, 1.85, ri, h, n), len, {p: V(0, 0, 0), t: V(0, 0, 1)}), stone);
  for (const end of [path[0], path[path.length - 1]]) {
    const z = end.p.z, f = {p: V(0, 0, z), t: V(0, 0, 1)};
    mesh(g, slab(portalOutline(2.5, 1.95, ri + 0.015, h, n), wall, f), stone);
    // arch stones: a band around the opening, standing proud of the wall on both faces
    const band = [...archPoints(ri + 0.2, h, n, 'right'), ...archPoints(ri - 0.03, h, n, 'left')];
    mesh(g, slab(band, wall + 0.06, f), arch);
    for (const s of [-1, 1]) mesh(g, slab([[s * (ri - 0.03), 0], [s * (ri + 0.2), 0], [s * (ri + 0.2), h], [s * (ri - 0.03), h]], wall + 0.06, f), arch);
    mesh(g, slab([[-0.13, h + ri + 0.22], [0.13, h + ri + 0.22], [0.09, h + ri - 0.02], [-0.09, h + ri - 0.02]], wall + 0.1, f), key);
    // coping along the top of the wall
    mesh(g, slab([[-1.32, 1.95], [1.32, 1.95], [1.32, 2.07], [-1.32, 2.07]], wall + 0.08, f), arch);
  }
  return g;
}

function culvert(path, endFrames) {
  const g = new THREE.Group(), concrete = mat('concrete', 0xa8a69f), head = mat('headwall', 0x938f86), cap = mat('coping', 0xc2bfb6);
  const ri = 0.66, h = 0.6, ro = 0.84, n = 22;
  barrel(g, path, ro, ri, h, concrete, n);
  for (const f of endFrames) {
    mesh(g, slab(portalOutline(2.3, 1.75, ri + 0.015, h, n), 0.2, f), head); // a little wider than the barrel: no shared plane
    mesh(g, slab([[-1.22, 1.75], [1.22, 1.75], [1.22, 1.86], [-1.22, 1.86]], 0.28, f), cap);
  }
  return g;
}
function tunnelLong() {
  const path = straightPath(3.2, 1);
  return culvert(path, [path[0], path[path.length - 1]]);
}

// Fabric crawl tunnel: a full round tube lying on the sand, panels sag slightly between the spring-wire rings.
function playTunnel() {
  const g = new THREE.Group(), r = 0.78, len = 3.6, rings = 9, perPanel = 6, n = 36;
  const colours = [['fabric_red', 0xd0473f], ['fabric_yellow', 0xe8b63a], ['fabric_blue', 0x3d78c4], ['fabric_green', 0x4f9e5a]];
  const wire = mat('ring_wire', 0xf2efe6, {r: 0.6}), rim = mat('rim_band', 0x2f3a4a);
  const circle = Array.from({length: n + 1}, (_, k) => { const a = -Math.PI / 2 + 2 * Math.PI * k / n; return [r * Math.cos(a), r + r * Math.sin(a)]; });
  const panels = rings - 1;
  for (let p = 0; p < panels; p++) {
    const z0 = -len / 2 + len * p / panels, z1 = -len / 2 + len * (p + 1) / panels;
    const path = Array.from({length: perPanel + 1}, (_, j) => ({p: V(0, 0, z0 + (z1 - z0) * j / perPanel), t: V(0, 0, 1)}));
    // sag toward the centre line; the bottom stays on the ground (scale about the tube axis would lift it), so sag acts on s and on y about r
    const sag = j => 1 - 0.05 * Math.sin(Math.PI * j / perPanel) ** 2;
    const run = circle;
    const pos = [], idx = [], cols = run.length;
    path.forEach((raw, j) => {
      const f = frame(raw), k = sag(j);
      for (const [s, y] of run) pos.push(...f.p.clone().addScaledVector(f.l, s * k).addScaledVector(UP, r + (y - r) * k - (1 - k) * r).toArray());
    });
    for (let j = 0; j < path.length - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, c, b, d, c); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const [name, colour] = colours[p % colours.length];
    mesh(g, geo, mat(name, colour, {r: 0.95, side: THREE.DoubleSide}));
  }
  for (let k = 0; k < rings; k++) {
    const z = -len / 2 + len * k / panels, end = k === 0 || k === rings - 1;
    const torus = new THREE.TorusGeometry(r, end ? 0.045 : 0.022, 8, n);
    torus.translate(0, r, z);
    mesh(g, torus, end ? rim : wire);
  }
  return g;
}

export const BUILDERS = {arch_short: archShort, tunnel_long: tunnelLong, play_tunnel: playTunnel};

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
  const out = new THREE.Group(); out.name = 'TUN_' + slug;
  const merged = [...byMat].sort((a, b) => a[0].name.localeCompare(b[0].name)).map(([m, geos]) => {
    const geo = mergeVertices(mergeGeometries(geos, false), 1e-5);
    const mesh = new THREE.Mesh(geo, m); mesh.name = m.name; return mesh;
  });
  const bounds = new THREE.Box3(); merged.forEach(m => bounds.expandByObject(m));
  const c = bounds.getCenter(new THREE.Vector3());
  for (const m of merged) { m.geometry.translate(-c.x, -bounds.min.y, -c.z); m.geometry.computeBoundingBox(); out.add(m); }
  return out;
}
