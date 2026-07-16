const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const EXPORT_PADDING = 48;
const PNG_SCALE = 3;
const MAX_PNG_DIMENSION = 8192;
const CANVAS_BACKGROUND = '#f9fbfc';

export type CircuitImageFormat = 'png' | 'svg';

type Bounds = { x: number; y: number; width: number; height: number };

export async function renderCircuitImage(
  svg: SVGSVGElement,
  format: CircuitImageFormat,
): Promise<Blob> {
  const bounds = contentBounds(svg);
  if (!bounds) throw new Error('Circuito vazio');

  const clone = prepareExportSvg(svg, bounds);
  await inlineImageAssets(clone);
  const markup = new XMLSerializer().serializeToString(clone);

  if (format === 'svg') {
    return new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  }
  return rasterizeSvgMarkup(markup, bounds);
}

export async function exportCircuitImage(
  svg: SVGSVGElement,
  baseName: string,
  format: CircuitImageFormat,
): Promise<string> {
  const blob = await renderCircuitImage(svg, format);
  const filename = `${baseName}.${format}`;
  downloadBlob(filename, blob);
  return filename;
}

function contentBounds(svg: SVGSVGElement): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const group of svg.querySelectorAll<SVGGElement>('g.wires, g.components')) {
    if (group.childElementCount === 0) continue;
    const box = group.getBBox();
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  if (!Number.isFinite(minX)) return null;
  return {
    x: minX - EXPORT_PADDING,
    y: minY - EXPORT_PADDING,
    width: maxX - minX + EXPORT_PADDING * 2,
    height: maxY - minY + EXPORT_PADDING * 2,
  };
}

function prepareExportSvg(svg: SVGSVGElement, bounds: Bounds): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute('class');
  clone.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  clone.setAttribute('width', String(bounds.width));
  clone.setAttribute('height', String(bounds.height));

  const editorOnlySelectors = [
    '.remove-component',
    '.marquee-selection',
    '.pending-wire-preview',
    '.label-editor-object',
    '.text-resize-handle',
  ];
  for (const selector of editorOnlySelectors) {
    clone.querySelectorAll(selector).forEach((element) => element.remove());
  }
  clone.querySelectorAll('.selected').forEach((element) => element.classList.remove('selected'));

  const grid = clone.querySelector<SVGRectElement>('.canvas-bg');
  if (grid) {
    grid.setAttribute('x', String(bounds.x));
    grid.setAttribute('y', String(bounds.y));
    grid.setAttribute('width', String(bounds.width));
    grid.setAttribute('height', String(bounds.height));

    const backdrop = document.createElementNS(SVG_NS, 'rect');
    backdrop.setAttribute('x', String(bounds.x));
    backdrop.setAttribute('y', String(bounds.y));
    backdrop.setAttribute('width', String(bounds.width));
    backdrop.setAttribute('height', String(bounds.height));
    backdrop.setAttribute('fill', CANVAS_BACKGROUND);
    grid.parentNode?.insertBefore(backdrop, grid);
  }

  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = collectDocumentCss();
  clone.insertBefore(style, clone.firstChild);

  return clone;
}

function collectDocumentCss(): string {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join('\n');
}

async function inlineImageAssets(clone: SVGSVGElement): Promise<void> {
  const dataUrlByHref = new Map<string, Promise<string>>();

  await Promise.all(
    Array.from(clone.querySelectorAll('image')).map(async (image) => {
      const href = image.getAttribute('href') ?? image.getAttributeNS(XLINK_NS, 'href');
      if (!href || href.startsWith('data:')) return;
      if (!dataUrlByHref.has(href)) dataUrlByHref.set(href, fetchAsDataUrl(href));
      image.setAttribute('href', await dataUrlByHref.get(href)!);
      image.removeAttributeNS(XLINK_NS, 'href');
    }),
  );
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao carregar imagem: ${url}`);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function rasterizeSvgMarkup(markup: string, bounds: Bounds): Promise<Blob> {
  const scale = Math.min(
    PNG_SCALE,
    MAX_PNG_DIMENSION / bounds.width,
    MAX_PNG_DIMENSION / bounds.height,
  );
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D indisponível');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar PNG'))),
        'image/png',
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
