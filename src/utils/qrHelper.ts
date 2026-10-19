import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

/**
 * Real ISO/IEC 18004 Standard QR Code & Code-128 Barcode Generator
 * Scannable by any mobile phone (iOS Camera, Android Google Lens, Barcode Scanner Apps)
 */

// Generate ISO-compliant QR Code as SVG string
export async function generateQrSvgAsync(text: string, sizePx: number = 200): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      width: sizePx,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1E293B',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR SVG:', err);
    return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}"><text x="10" y="20" fill="red">QR Error</text></svg>`;
  }
}

// Generate ISO-compliant QR Code as Data URI (PNG image)
export async function getQrPngDataUri(text: string, sizePx: number = 240): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: sizePx,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1E293B',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR PNG Data URI:', err);
    return '';
  }
}

// Synchronous SVG fallback generator for fast initial renders
export function getQrSvgDataUri(text: string, sizePx: number = 160): string {
  // Simple synchronous generation using canvas or safe SVG
  try {
    // If in browser environment with canvas support
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, text, {
        width: sizePx,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#1E293B',
          light: '#FFFFFF',
        },
      });
      return canvas.toDataURL('image/png');
    }
  } catch (e) {
    console.warn('Canvas QR generation failed, generating fallback:', e);
  }

  // Fallback data URI
  return '';
}

// Generate Code-128 1D Barcode as SVG string
export function generateBarcode1DSvg(value: string, width: number = 2, height: number = 50): string {
  if (typeof document === 'undefined') return '';
  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, value, {
      format: 'CODE128',
      width,
      height,
      displayValue: true,
      fontSize: 12,
      font: 'monospace',
      lineColor: '#1E293B',
      background: '#FFFFFF',
      margin: 5,
    });
    return svgNode.outerHTML;
  } catch (e) {
    console.error('Failed to generate 1D Barcode:', e);
    return '';
  }
}
