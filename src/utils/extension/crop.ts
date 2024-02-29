export function crop(
  image: string,
  area: { x: number; y: number; w: number; h: number },
  dpr: number,
) {
  return new Promise<Blob | null>((resolve, reject) => {
    const top = area.y * dpr;
    const left = area.x * dpr;
    const width = area.w * dpr;
    const height = area.h * dpr;

    let canvas: HTMLCanvasElement | null = null;
    let template: HTMLTemplateElement | null = null;
    if (!canvas) {
      template = document.createElement("template");
      canvas = document.createElement("canvas");
      document.body.appendChild(template);
      template.appendChild(canvas);
    }
    canvas.width = width;
    canvas.height = height;

    const img = new Image();
    img.onload = () => {
      const context = canvas?.getContext("2d");
      context?.drawImage(img, left, top, width, height, 0, 0, width, height);
      // const cropped = canvas?.toDataURL(`image/jpeg`);
      // resolve(cropped ?? null);
      canvas?.toBlob(
        (cropped) => {
          if (!cropped) reject(null);
          resolve(cropped);
        },
        `image/jpeg`,
        100,
      );
    };
    img.src = image;
  });
}
