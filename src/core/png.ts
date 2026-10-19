import { Zlib } from "fflate";
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function join(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
function chunk(name: string, data: Uint8Array) {
  const out = new Uint8Array(data.length + 12),
    view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(name), 4);
  out.set(data, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < data.length + 8; i++)
    crc = table[(crc ^ out[i]) & 255] ^ (crc >>> 8);
  view.setUint32(data.length + 8, (crc ^ 0xffffffff) >>> 0);
  return out;
}
export function encodePNG(
  width: number,
  height: number,
  data: Uint8Array | Uint16Array,
  bits: 8 | 16,
  type: 4 | 6,
  ppi: number,
): Uint8Array {
  const channels = type === 6 ? 4 : 2;
  if (data.length !== width * height * channels)
    throw new Error("PNG pixel count mismatch.");
  const ihdr = new Uint8Array(13),
    iv = new DataView(ihdr.buffer);
  iv.setUint32(0, width);
  iv.setUint32(4, height);
  ihdr[8] = bits;
  ihdr[9] = type;
  const phys = new Uint8Array(9),
    pv = new DataView(phys.buffer);
  pv.setUint32(0, Math.round(ppi / 0.0254));
  pv.setUint32(4, Math.round(ppi / 0.0254));
  phys[8] = 1;
  const compressed: Uint8Array[] = [];
  const stream = new Zlib({ level: 6 }, (part) =>
    compressed.push(chunk("IDAT", part)),
  );
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(1 + width * channels * (bits / 8));
    for (let i = 0; i < width * channels; i++) {
      const value = data[y * width * channels + i];
      if (bits === 16) {
        row[1 + i * 2] = value >>> 8;
        row[2 + i * 2] = value & 255;
      } else
        row[1 + i] =
          data instanceof Uint16Array ? Math.round(value / 257) : value;
    }
    stream.push(row, y === height - 1);
  }
  return join([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("pHYs", phys),
    ...compressed,
    chunk("IEND", new Uint8Array()),
  ]);
}
