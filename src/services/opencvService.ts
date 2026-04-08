export type CvRect = { x: number; y: number; width: number; height: number };
export type CvMat = {
  rows: number;
  cols: number;
  data32S: Int32Array;
  copyTo: (dst: CvMat) => void;
  roi: (rect: CvRect) => CvMat;
  delete: () => void;
};
export type CvMatVector = {
  size: () => number;
  get: (i: number) => unknown;
  delete: () => void;
};
export type OpenCV = {
  Mat: new (...args: unknown[]) => CvMat;
  MatVector: new (...args: unknown[]) => CvMatVector;
  Scalar: new (...args: number[]) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  Rect: new (x: number, y: number, width: number, height: number) => CvRect;
  CV_32FC2: number;
  CV_8U: number;
  COLOR_RGBA2GRAY: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  ADAPTIVE_THRESH_MEAN_C: number;
  THRESH_BINARY: number;
  THRESH_BINARY_INV: number;
  THRESH_OTSU: number;
  RETR_LIST: number;
  RETR_EXTERNAL: number;
  RETR_TREE: number;
  CHAIN_APPROX_SIMPLE: number;
  MORPH_RECT: number;
  MORPH_CLOSE: number;
  MORPH_OPEN: number;
  BORDER_DEFAULT: number;
  NORM_MINMAX: number;
  cvtColor: (...args: unknown[]) => void;
  GaussianBlur: (...args: unknown[]) => void;
  normalize: (...args: unknown[]) => void;
  equalizeHist: (...args: unknown[]) => void;
  adaptiveThreshold: (...args: unknown[]) => void;
  Canny: (...args: unknown[]) => void;
  findContours: (...args: unknown[]) => void;
  contourArea: (cnt: unknown) => number;
  arcLength: (cnt: unknown, closed: boolean) => number;
  approxPolyDP: (...args: unknown[]) => void;
  isContourConvex: (cnt: unknown) => boolean;
  line: (...args: unknown[]) => void;
  getPerspectiveTransform: (...args: unknown[]) => CvMat;
  warpPerspective: (...args: unknown[]) => void;
  threshold: (...args: unknown[]) => void;
  morphologyEx: (...args: unknown[]) => void;
  getStructuringElement: (...args: unknown[]) => CvMat;
  erode: (...args: unknown[]) => void;
  matFromArray: (...args: unknown[]) => CvMat;
  imread: (canvas: HTMLCanvasElement) => CvMat;
  imshow: (canvas: HTMLCanvasElement, mat: CvMat) => void;
  boundingRect: (cnt: unknown) => CvRect;
  rectangle: (...args: unknown[]) => void;
  countNonZero: (src: CvMat) => number;
};

declare global {
  interface Window {
    cv?: OpenCV;
  }
}

export const loadOpenCv = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) {
      resolve();
      return;
    }
    
    // Check if script already exists
    if (document.querySelector('script[src*="opencv.js"]')) {
      // Already loading?
      const checkCv = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkCv);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = '/opencv.js';
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      const checkCv = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkCv);
          resolve();
        }
      }, 100);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load OpenCV.js'));
    };
    
    document.body.appendChild(script);
  });
};
