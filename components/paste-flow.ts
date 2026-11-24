const width = 160;
const height = 250;

// Coordinates use a fixed drawing space so the same stream fits the stage on phones.
export function paintPaste(
  context: CanvasRenderingContext2D,
  front: number,
  tail: number,
  time: number,
) {
  context.clearRect(0, 0, width, height);
  if (front <= tail) return;

  const arrival = 236;
  const start = tail * arrival;
  const end = front * arrival;
  const center = (y: number) =>
    80 + Math.sin(y * 0.031 - time * 8) * Math.sin(Math.PI * y / arrival) * 4.5
      + 6 * Math.sin(Math.PI * y / arrival);
  const radius = (y: number) =>
    10 - y * 0.016 + 1.6 * Math.sin(y * 0.076 - time * 11)
      + 4.5 * Math.pow(y / arrival, 9);

  const paste = context.createLinearGradient(64, 0, 100, 0);
  paste.addColorStop(0, "#5f0904");
  paste.addColorStop(0.18, "#9f1708");
  paste.addColorStop(0.35, "#f64f22");
  paste.addColorStop(0.46, "#c22a0c");
  paste.addColorStop(0.65, "#961206");
  paste.addColorStop(0.84, "#d23913");
  paste.addColorStop(1, "#650804");

  context.beginPath();
  context.moveTo(center(start) - radius(start), start);
  for (let y = start + 2; y < end; y += 2) {
    context.lineTo(center(y) - radius(y), y);
  }
  context.quadraticCurveTo(center(end), end + 8, center(end) + radius(end), end);
  for (let y = end - 2; y > start; y -= 2) {
    context.lineTo(center(y) + radius(y), y);
  }
  context.quadraticCurveTo(center(start), start - 4, center(start) - radius(start), start);
  context.fillStyle = paste;
  context.fill();

  context.save();
  context.clip();
  context.beginPath();
  for (let y = start; y <= end; y += 2) {
    context.lineTo(center(y) - radius(y) * 0.36, y);
  }
  context.strokeStyle = "rgba(255, 160, 98, 0.47)";
  context.lineWidth = 2.3;
  context.stroke();
  context.restore();

  if (front < 0.99) return;

  // Droplets arc out from the opening and fall back into it.
  for (let index = 0; index < 8; index += 1) {
    const phase = (time * (1.7 + index * 0.17) + index * 0.183) % 1;
    const direction = index % 2 ? -1 : 1;
    const x = 80 + direction * phase * (16 + index * 4);
    const y = arrival - Math.sin(phase * Math.PI) * (18 + index * 4.5);
    context.globalAlpha = Math.sin(phase * Math.PI) * (1 - tail);
    context.fillStyle = index % 3 === 0 ? "#ee5827" : "#ab200a";
    context.beginPath();
    context.ellipse(x, y, 2.6 - phase, 4.6 - phase * 2, direction * 0.45, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}
