// Turns an SVG path into grid cells, so shapes (like the GitHub mark) are drawn in whole dots,
// as crisp as the dot font. Supports the commands Octicons use: M L H V C S Q A Z, absolute
// and relative. Filled with the nonzero rule, SVG's default.

import type { Cell } from './dmd.ts';

type Point = [number, number];

function tokens(d: string): (string | number)[] {
  return (d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []).map((t) => (/[a-zA-Z]/.test(t) ? t : Number(t)));
}

/** Points along an elliptical arc, following the SVG spec's endpoint-to-centre conversion. */
function arc(from: Point, rx: number, ry: number, angle: number, large: number, sweep: number, to: Point): Point[] {
  if (!rx || !ry) return [to];
  const phi = (angle * Math.PI) / 180;
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = Math.cos(phi) * dx + Math.sin(phi) * dy;
  const y1p = -Math.sin(phi) * dx + Math.cos(phi) * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const scale = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (scale > 1) (rx *= Math.sqrt(scale)), (ry *= Math.sqrt(scale));
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, num / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = Math.cos(phi) * cxp - Math.sin(phi) * cyp + (x1 + x2) / 2;
  const cy = Math.sin(phi) * cxp + Math.cos(phi) * cyp + (y1 + y2) / 2;
  const angleOf = (ux: number, uy: number) => Math.atan2(uy, ux);
  const start = angleOf((x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = angleOf((-x1p - cxp) / rx, (-y1p - cyp) / ry) - start;
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const steps = Math.max(4, Math.ceil(Math.abs(delta) / (Math.PI / 32)));
  const out: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = start + (delta * i) / steps;
    out.push([
      cx + rx * Math.cos(t) * Math.cos(phi) - ry * Math.sin(t) * Math.sin(phi),
      cy + rx * Math.cos(t) * Math.sin(phi) + ry * Math.sin(t) * Math.cos(phi),
    ]);
  }
  return out;
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point): Point[] {
  const out: Point[] = [];
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

/** The path's outlines as closed polygons. */
export function polygons(d: string): Point[][] {
  const tk = tokens(d);
  const shapes: Point[][] = [];
  let shape: Point[] = [];
  let cur: Point = [0, 0];
  let start: Point = [0, 0];
  let lastControl: Point | null = null;
  let cmd = '';
  let i = 0;
  const num = () => tk[i++] as number;
  while (i < tk.length) {
    if (typeof tk[i] === 'string') cmd = tk[i++] as string;
    const rel = cmd === cmd.toLowerCase();
    const at = (x: number, y: number): Point => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    let control: Point | null = null;
    switch (cmd.toUpperCase()) {
      case 'M': {
        if (shape.length) shapes.push(shape);
        cur = at(num(), num());
        start = cur;
        shape = [cur];
        cmd = rel ? 'l' : 'L'; // further pairs are lines
        break;
      }
      case 'L': cur = at(num(), num()); shape.push(cur); break;
      case 'H': cur = [rel ? cur[0] + num() : num(), cur[1]]; shape.push(cur); break;
      case 'V': cur = [cur[0], rel ? cur[1] + num() : num()]; shape.push(cur); break;
      case 'C': {
        const c1 = at(num(), num());
        const c2 = at(num(), num());
        const end = at(num(), num());
        shape.push(...cubic(cur, c1, c2, end));
        control = c2;
        cur = end;
        break;
      }
      case 'S': {
        const c1: Point = lastControl ? [2 * cur[0] - lastControl[0], 2 * cur[1] - lastControl[1]] : cur;
        const c2 = at(num(), num());
        const end = at(num(), num());
        shape.push(...cubic(cur, c1, c2, end));
        control = c2;
        cur = end;
        break;
      }
      case 'Q': {
        const q = at(num(), num());
        const end = at(num(), num());
        const c1: Point = [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])];
        const c2: Point = [end[0] + (2 / 3) * (q[0] - end[0]), end[1] + (2 / 3) * (q[1] - end[1])];
        shape.push(...cubic(cur, c1, c2, end));
        cur = end;
        break;
      }
      case 'A': {
        const rx = num(), ry = num(), angle = num(), large = num(), sweep = num();
        const end = at(num(), num());
        shape.push(...arc(cur, rx, ry, angle, large, sweep, end));
        cur = end;
        break;
      }
      case 'Z':
        cur = start;
        if (shape.length) shapes.push(shape);
        shape = [];
        break;
      default:
        throw new Error(`unsupported path command ${cmd}`);
    }
    lastControl = control;
  }
  if (shape.length) shapes.push(shape);
  return shapes;
}

/** Nonzero winding number of a point over all polygons. */
function inside(x: number, y: number, shapes: Point[][]): boolean {
  let winding = 0;
  for (const poly of shapes) {
    for (let k = 0; k < poly.length; k++) {
      const [ax, ay] = poly[k];
      const [bx, by] = poly[(k + 1) % poly.length];
      if (ay <= y) {
        if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) winding++;
      } else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) winding--;
    }
  }
  return winding !== 0;
}

/**
 * Cells covered by a path drawn in a `units` x `units` box, scaled to `cells` x `cells` and
 * placed at (col, row). A cell lights when at least half of it is inside the shape.
 */
export function rasterize(d: string, units: number, cells: number, col: number, row: number): Cell[] {
  const shapes = polygons(d);
  const out: Cell[] = [];
  const size = units / cells;
  const samples = [0.25, 0.75];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      let hits = 0;
      for (const sy of samples) for (const sx of samples) if (inside((c + sx) * size, (r + sy) * size, shapes)) hits++;
      if (hits >= 2) out.push([col + c, row + r]);
    }
  }
  return out;
}
