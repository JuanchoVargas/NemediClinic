// Imagen PNG de muestra generada en memoria (degradado), para los pasos del recorrido que
// suben fotos. Sin archivos binarios en el repo ni fotos de personas reales.
import zlib from "node:zlib";

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    let c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** PNG cuadrado con un degradado entre dos colores RGB. `grain` añade textura (0 = liso). */
export function samplePng(from: [number, number, number], to: [number, number, number], grain = 0, size = 480): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  const rows: Buffer[] = [];
  let seed = 7;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const noise = grain ? ((seed % 100) / 100 - 0.5) * grain : 0;
      for (let c = 0; c < 3; c++) {
        row[1 + x * 3 + c] = Math.max(0, Math.min(255, Math.round(from[c] + (to[c] - from[c]) * t + noise)));
      }
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
