/**
 * Canvas Mock Utilities
 *
 * Centralized mocks for HTMLCanvasElement and 2D/WebGL contexts.
 * Import this file in tests that use canvas elements (floor plans, charts, etc.)
 *
 * Usage:
 * ```typescript
 * import { setupCanvasMock, mockContext2D } from '@/test/mocks/canvas';
 *
 * beforeEach(() => {
 *   setupCanvasMock();
 * });
 *
 * // Assert drawing calls
 * expect(mockContext2D.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
 * ```
 */

import { vi } from 'vitest';

// Mock 2D context methods
export const mockContext2D = {
  // State
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),

  // Drawing rectangles
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),

  // Drawing paths
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn(),

  // Path operations
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),

  // Text
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 })),

  // Drawing images
  drawImage: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: vi.fn(),

  // Gradients and patterns
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createPattern: vi.fn(() => null),

  // Shadows
  shadowBlur: 0,
  shadowColor: 'transparent',
  shadowOffsetX: 0,
  shadowOffsetY: 0,

  // Line styles
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  miterLimit: 10,
  lineDashOffset: 0,
  setLineDash: vi.fn(),
  getLineDash: vi.fn(() => []),

  // Fill and stroke styles
  fillStyle: '#000000',
  strokeStyle: '#000000',

  // Text styles
  font: '10px sans-serif',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  direction: 'ltr' as CanvasDirection,

  // Compositing
  globalAlpha: 1,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,

  // Image smoothing
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low' as ImageSmoothingQuality,

  // Canvas element reference
  canvas: null as HTMLCanvasElement | null,
};

// Mock WebGL context (minimal)
export const mockContextWebGL = {
  getParameter: vi.fn(() => null),
  getExtension: vi.fn(() => null),
  createShader: vi.fn(() => ({})),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  createProgram: vi.fn(() => ({})),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  viewport: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(() => ({})),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  getShaderParameter: vi.fn(() => true),
  getProgramParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  getProgramInfoLog: vi.fn(() => ''),
  getAttribLocation: vi.fn(() => 0),
  getUniformLocation: vi.fn(() => ({})),
  vertexAttribPointer: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
};

/**
 * Setup canvas mock on HTMLCanvasElement prototype
 */
export function setupCanvasMock() {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = vi.fn(function (
    this: HTMLCanvasElement,
    contextType: string
  ) {
    if (contextType === '2d') {
      return { ...mockContext2D, canvas: this } as unknown as CanvasRenderingContext2D;
    }
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return mockContextWebGL as unknown as WebGLRenderingContext;
    }
    return originalGetContext.call(this, contextType);
  }) as typeof HTMLCanvasElement.prototype.getContext;

  // Also mock toDataURL and toBlob
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    callback(new Blob(['mock'], { type: 'image/png' }));
  });

  return {
    context2D: mockContext2D,
    contextWebGL: mockContextWebGL,
  };
}

/**
 * Reset all canvas mocks
 */
export function resetCanvasMocks() {
  Object.values(mockContext2D).forEach((value) => {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as ReturnType<typeof vi.fn>).mockReset();
    }
  });

  Object.values(mockContextWebGL).forEach((value) => {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as ReturnType<typeof vi.fn>).mockReset();
    }
  });
}
