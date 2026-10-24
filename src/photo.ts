export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPG, PNG, or WebP photo. If your phone uses HEIC, export it as JPG first.",
    );
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    throw new Error("Could not read this photo. Try another image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
