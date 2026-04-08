import type { CvMat, OpenCV } from './opencvService';

type Point = { x: number; y: number };
type GridFrameResult = { points: Point[]; variant: 'legacy' | 'gapped' };

export const processOMR = (src: CvMat, canvas: HTMLCanvasElement, questionCount: number, correctAnswers: string[]): { success: boolean, answers?: string[], layoutVariant?: 'legacy' | 'gapped' } => {
  const cv = window.cv as OpenCV | undefined;
  if (!cv) {
    return { success: false };
  }
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const dst = new cv.Mat();
  
  // Clone src for visualization
  src.copyTo(dst);
  
  // 1. Preprocessing
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
  
  // Use adaptive thresholding instead of Canny for better document detection
  cv.adaptiveThreshold(blurred, edges, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
  
  // 2. Find Contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  // Use CHAIN_APPROX_SIMPLE to save memory
  cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
  
  const width = 800;
  const height = 1131;
  const gridFrame = detectGridFrame(src);
  const gridMarkerCenters = detectMarkerCentersNearGrid(src, gridFrame?.points ?? null);
  const freeMarkers = gridMarkerCenters ? null : detectMarkerCentersAnywhere(src);
  const markerCenters = gridMarkerCenters || freeMarkers ? null : detectMarkerCenters(src);
  
  let maxArea = 0;
  let docContour: CvMat | null = null;
  const minArea = (src.rows * src.cols) * 0.05; 
  
  for (let i = 0; i < contours.size(); ++i) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    
    if (area > minArea) { 
       const peri = cv.arcLength(cnt, true);
       const approx = new cv.Mat();
       cv.approxPolyDP(cnt, approx, 0.05 * peri, true);
       
       if (approx.rows === 4 && area > maxArea) {
         if (cv.isContourConvex(approx)) {
             maxArea = area;
             if (docContour) docContour.delete();
             docContour = approx;
         } else {
             approx.delete();
         }
       } else {
         approx.delete();
       }
    }
  }
  
  let warped: CvMat | null = null;

  if (gridMarkerCenters) {
      const markerDest = getGridMarkerDestPoints(width, height, gridFrame?.variant ?? 'gapped');
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          gridMarkerCenters[0].x, gridMarkerCenters[0].y,
          gridMarkerCenters[1].x, gridMarkerCenters[1].y,
          gridMarkerCenters[2].x, gridMarkerCenters[2].y,
          gridMarkerCenters[3].x, gridMarkerCenters[3].y
      ]);
      
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          markerDest[0].x, markerDest[0].y,
          markerDest[1].x, markerDest[1].y,
          markerDest[2].x, markerDest[2].y,
          markerDest[3].x, markerDest[3].y
      ]);
      
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(width, height));
      
      srcTri.delete();
      dstTri.delete();
      M.delete();
  } else if (freeMarkers) {
      const markerDest = getGridMarkerDestPoints(width, height, 'gapped');
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          freeMarkers[0].x, freeMarkers[0].y,
          freeMarkers[1].x, freeMarkers[1].y,
          freeMarkers[2].x, freeMarkers[2].y,
          freeMarkers[3].x, freeMarkers[3].y
      ]);
      
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          markerDest[0].x, markerDest[0].y,
          markerDest[1].x, markerDest[1].y,
          markerDest[2].x, markerDest[2].y,
          markerDest[3].x, markerDest[3].y
      ]);
      
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(width, height));
      
      srcTri.delete();
      dstTri.delete();
      M.delete();
  } else if (markerCenters) {
      const markerDest = getMarkerDestPoints(width, height);
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          markerCenters[0].x, markerCenters[0].y,
          markerCenters[1].x, markerCenters[1].y,
          markerCenters[2].x, markerCenters[2].y,
          markerCenters[3].x, markerCenters[3].y
      ]);
      
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          markerDest[0].x, markerDest[0].y,
          markerDest[1].x, markerDest[1].y,
          markerDest[2].x, markerDest[2].y,
          markerDest[3].x, markerDest[3].y
      ]);
      
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(width, height));
      
      srcTri.delete();
      dstTri.delete();
      M.delete();
  } else if (gridFrame) {
      const frameDest = getGridFrameDestPoints(width, height, gridFrame.variant);
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          gridFrame.points[0].x, gridFrame.points[0].y,
          gridFrame.points[1].x, gridFrame.points[1].y,
          gridFrame.points[2].x, gridFrame.points[2].y,
          gridFrame.points[3].x, gridFrame.points[3].y
      ]);
      
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          frameDest[0].x, frameDest[0].y,
          frameDest[1].x, frameDest[1].y,
          frameDest[2].x, frameDest[2].y,
          frameDest[3].x, frameDest[3].y
      ]);
      
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(width, height));
      
      srcTri.delete();
      dstTri.delete();
      M.delete();
  } else if (docContour) {
      const points: Point[] = [];
      for (let i = 0; i < 4; i++) {
          points.push({
              x: docContour.data32S[i * 2],
              y: docContour.data32S[i * 2 + 1]
          });
      }
      
      const color = new cv.Scalar(0, 255, 255, 255);
      const thickness = 4;
      
      cv.line(dst, new cv.Point(points[0].x, points[0].y), new cv.Point(points[1].x, points[1].y), color, thickness);
      cv.line(dst, new cv.Point(points[1].x, points[1].y), new cv.Point(points[2].x, points[2].y), color, thickness);
      cv.line(dst, new cv.Point(points[2].x, points[2].y), new cv.Point(points[3].x, points[3].y), color, thickness);
      cv.line(dst, new cv.Point(points[3].x, points[3].y), new cv.Point(points[0].x, points[0].y), color, thickness);
      
      const sortedPoints = sortPoints(points);
      
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          sortedPoints[0].x, sortedPoints[0].y,
          sortedPoints[1].x, sortedPoints[1].y,
          sortedPoints[2].x, sortedPoints[2].y,
          sortedPoints[3].x, sortedPoints[3].y
      ]);
      
      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          width, 0,
          width, height,
          0, height
      ]);
      
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(width, height));
      
      srcTri.delete();
      dstTri.delete();
      M.delete();
  }

  if (warped) {
      let working = warped;
      if (!gridFrame && !gridMarkerCenters) {
          const refined = refineWarpUsingMarkers(working, width, height);
          if (refined) {
              working.delete();
              working = refined;
          }
      }
      const warpedGray = new cv.Mat();
      const normalized = new cv.Mat();
      const equalized = new cv.Mat();
      let warpedThresh = new cv.Mat();
      const warpedEdges = new cv.Mat();
      cv.cvtColor(working, warpedGray, cv.COLOR_RGBA2GRAY, 0);
      const lightMask = new cv.Mat();
      cv.threshold(warpedGray, lightMask, 70, 255, cv.THRESH_BINARY);
      const totalPixels = Math.max(1, warpedGray.rows * warpedGray.cols);
      const lightRatio = cv.countNonZero(lightMask) / totalPixels;
      const lowLight = lightRatio < 0.45;
      lightMask.delete();
      cv.normalize(warpedGray, normalized, 0, 255, cv.NORM_MINMAX, cv.CV_8U);
      cv.equalizeHist(normalized, equalized);
      
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.morphologyEx(equalized, equalized, cv.MORPH_CLOSE, kernel);
      kernel.delete();

      cv.threshold(equalized, warpedThresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      if (lowLight) {
          const warpedThreshAlt1 = new cv.Mat();
          const warpedThreshAlt2 = new cv.Mat();
          cv.adaptiveThreshold(equalized, warpedThreshAlt1, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7);
          cv.adaptiveThreshold(equalized, warpedThreshAlt2, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 41, 10);
          const candidates = [warpedThresh, warpedThreshAlt1, warpedThreshAlt2];
          let bestIndex = 0;
          let bestScore = -Infinity;
          for (let i = 0; i < candidates.length; i++) {
              const ratio = cv.countNonZero(candidates[i]) / totalPixels;
              const inRange = ratio > 0.03 && ratio < 0.28;
              const score = (inRange ? 1 : 0) - Math.abs(ratio - 0.12);
              if (score > bestScore) {
                  bestScore = score;
                  bestIndex = i;
              }
          }
          const selected = candidates[bestIndex];
          for (let i = 0; i < candidates.length; i++) {
              if (i !== bestIndex) {
                  candidates[i].delete();
              }
          }
          warpedThresh = selected;
      }
      const openKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
      cv.morphologyEx(warpedThresh, warpedThresh, cv.MORPH_OPEN, openKernel);
      openKernel.delete();
      cv.Canny(equalized, warpedEdges, lowLight ? 40 : 50, lowLight ? 120 : 150);
      
      const layout = getGridLayout(width, height);
      const useGappedLayout = !!gridMarkerCenters || !!freeMarkers || gridFrame?.variant === 'gapped';
      const useLocalOffsets = !gridFrame;
      const columnOffsets = useLocalOffsets ? computeColumnOffsets(warpedEdges, layout, width, height, useGappedLayout) : [0, 0, 0, 0];
      const rowOffset = useLocalOffsets ? computeRowOffset(warpedEdges, layout, width, height, useGappedLayout) : 0;
      const detectedAnswers: string[] = [];
      const limitedQuestions = Math.max(1, Math.min(100, Math.floor(questionCount)));
      
      for (let q = 0; q < 100; q++) {
          if (q >= limitedQuestions) {
              detectedAnswers.push("");
              continue;
          }
          const colIdx = Math.floor(q / 25);
          const rowIdx = q % 25;
          
          const baseX = layout.gridLeft + (colIdx * layout.colWidth) + columnOffsets[colIdx];
          const gapOffset = useGappedLayout ? Math.floor(rowIdx / layout.gapEvery) * layout.gapHeight : 0;
          const baseY = layout.startY + (rowIdx * layout.rowHeight) + gapOffset + rowOffset;
          const searchRange = gridFrame || gridMarkerCenters ? 2 : 4;
          const expectedAnswer = correctAnswers[q];
          const questionResult = evaluateQuestion(
              cv,
              warpedThresh,
              warpedEdges,
              working,
              layout,
              baseX,
              baseY,
              width,
              height,
              searchRange,
              lowLight,
              expectedAnswer
          );
          detectedAnswers.push(questionResult.answer);
      }
      
      cv.imshow(canvas, working);
      
      working.delete();
      warpedGray.delete();
      normalized.delete();
      equalized.delete();
      warpedThresh.delete();
      warpedEdges.delete();
      
      console.log("Detected Answers:", detectedAnswers);
      
      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      dst.delete();
      if (docContour) docContour.delete();
      
      return { success: true, answers: detectedAnswers, layoutVariant: useGappedLayout ? 'gapped' : 'legacy' };
  } else {
      cv.imshow(canvas, dst);
  }
  
  // Cleanup
  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  dst.delete();
  if (docContour) docContour.delete();

  return { success: false };
};

const evaluateQuestion = (
    cv: OpenCV,
    warpedThresh: CvMat,
    warpedEdges: CvMat,
    working: CvMat,
    layout: ReturnType<typeof getGridLayout>,
    baseX: number,
    baseY: number,
    width: number,
    height: number,
    searchRange: number,
    lowLight: boolean,
    expectedAnswer?: string
): { answer: string; confidence: number } => {
    const coreW = Math.max(1, Math.round(layout.bubbleW * 0.6));
    const coreH = Math.max(1, Math.round(layout.bubbleH * 0.6));
    const coreArea = Math.max(1, coreW * coreH);
    let bestDx = 0;
    let bestDy = 0;
    let bestScore = -1;
    for (let dx = -searchRange; dx <= searchRange; dx++) {
        for (let dy = -searchRange; dy <= searchRange; dy++) {
            const x = Math.round(baseX + layout.optionOffset - 2 + dx);
            const y = Math.round(baseY - 1 + dy);
            const w = Math.round(layout.gapX * 3 + layout.bubbleW + 4);
            const h = Math.round(layout.bubbleH + 2);
            if (x < 0 || y < 0 || x + w > width || y + h > height) {
                continue;
            }
            const rect = new cv.Rect(x, y, w, h);
            const roi = warpedEdges.roi(rect);
            const score = cv.countNonZero(roi);
            roi.delete();
            if (score > bestScore) {
                bestScore = score;
                bestDx = dx;
                bestDy = dy;
            }
        }
    }
    const alignedX = baseX + bestDx;
    const alignedY = baseY + bestDy;

    let maxPixels = 0;
    let secondMax = 0;
    let detectedOption = -1;
    let maxWhiteRatio = 0;
    const optionWhites: number[] = [];
    const optionAreas: number[] = [];
    const optionEdges: number[] = [];
    

    for (let opt = 0; opt < 4; opt++) {
        const bx = alignedX + layout.optionOffset + (opt * layout.gapX);
        const by = alignedY;
        const rect = new cv.Rect(bx, by, layout.bubbleW, layout.bubbleH);
        if (bx + layout.bubbleW < width && by + layout.bubbleH < height) {
            const roi = warpedThresh.roi(rect);
            const roiCore = roi.roi({
                x: Math.round(layout.bubbleW * 0.25),
                y: Math.round(layout.bubbleH * 0.25),
                width: coreW,
                height: coreH
            });
            const erodeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 1));
            cv.erode(roiCore, roiCore, erodeKernel);
            erodeKernel.delete();
            const roiContours = new cv.MatVector();
            const roiHierarchy = new cv.Mat();
            cv.findContours(roiCore, roiContours, roiHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            let roiMaxArea = 0;
            for (let k = 0; k < roiContours.size(); ++k) {
                const c = roiContours.get(k);
                const area = cv.contourArea(c);
                if (area > roiMaxArea) {
                    roiMaxArea = area;
                }
            }
            
            const colorRoi = new cv.Scalar(255, 0, 0, 255);
            const pt1 = new cv.Point(bx, by);
            const pt2 = new cv.Point(bx + layout.bubbleW, by + layout.bubbleH);
            cv.rectangle(working, pt1, pt2, colorRoi, 1);
            
            const whitePixels = cv.countNonZero(roiCore);
            const edgeOuter = warpedEdges.roi(rect);
            const edgeRoi = edgeOuter.roi({
                x: Math.round(layout.bubbleW * 0.25),
                y: Math.round(layout.bubbleH * 0.25),
                width: coreW,
                height: coreH
            });
            const edgePixels = cv.countNonZero(edgeRoi);
            edgeOuter.delete();
            edgeRoi.delete();
            const whiteRatio = whitePixels / coreArea;
            const edgeRatio = edgePixels / coreArea;
            optionWhites.push(whiteRatio);
            optionAreas.push(roiMaxArea);
            optionEdges.push(edgeRatio);
            if (roiMaxArea > maxPixels) {
                secondMax = maxPixels;
                maxPixels = roiMaxArea;
                detectedOption = opt;
                maxWhiteRatio = whiteRatio;
            } else if (roiMaxArea > secondMax) {
                secondMax = roiMaxArea;
            }
            
            roiCore.delete();
            roi.delete();
            roiContours.delete();
            roiHierarchy.delete();
        }
    }

    const sortedAreas = [...optionAreas].sort((a, b) => a - b);
    const sortedWhites = [...optionWhites].sort((a, b) => a - b);
    const sortedEdges = [...optionEdges].sort((a, b) => a - b);
    const medianArea = sortedAreas[1] ?? 0;
    const medianWhite = sortedWhites[1] ?? 0;
    const medianEdge = sortedEdges[1] ?? 0;
    const adaptiveWhiteThreshold = Math.max(0.16, Math.min(0.38, medianWhite + 0.08));
    const adaptiveAreaThreshold = Math.max(coreArea * 0.1, Math.min(coreArea * 0.35, Math.max(medianArea * 1.8, coreArea * 0.12)));
    const adaptiveEdgeThreshold = Math.max(0.01, Math.min(0.12, medianEdge + 0.02));
    const tunedWhiteThreshold = adaptiveWhiteThreshold * (lowLight ? 0.7 : 1);
    const tunedAreaThreshold = adaptiveAreaThreshold * (lowLight ? 0.8 : 1);
    const tunedEdgeThreshold = adaptiveEdgeThreshold * (lowLight ? 0.65 : 1);
    const sortedAreasDesc = [...optionAreas].sort((a, b) => b - a);
    const sortedWhitesDesc = [...optionWhites].sort((a, b) => b - a);
    const sortedEdgesDesc = [...optionEdges].sort((a, b) => b - a);
    const topArea = sortedAreasDesc[0] ?? 0;
    const secondArea = sortedAreasDesc[1] ?? 0;
    const thirdArea = sortedAreasDesc[2] ?? 0;
    const topWhite = sortedWhitesDesc[0] ?? 0;
    const secondWhite = sortedWhitesDesc[1] ?? 0;
    const thirdWhite = sortedWhitesDesc[2] ?? 0;
    const topEdge = sortedEdgesDesc[0] ?? 0;
    const secondEdge = sortedEdgesDesc[1] ?? 0;
    const thirdEdge = sortedEdgesDesc[2] ?? 0;
    const strongArea = tunedAreaThreshold * 1.35;
    const strongWhite = tunedWhiteThreshold * 1.2;
    const strongEdge = tunedEdgeThreshold * 1.05;
    const similarArea = Math.abs(topArea - secondArea) / Math.max(1, topArea) < 0.25;
    const similarWhite = Math.abs(topWhite - secondWhite) / Math.max(0.01, topWhite) < 0.25;
    const similarEdge = Math.abs(topEdge - secondEdge) / Math.max(0.01, topEdge) < 0.3;
    const fillCandidates = optionWhites.filter((white, idx) => {
        const edgeRatio = optionEdges[idx] || 0;
        const area = optionAreas[idx] || 0;
        return white > strongWhite && edgeRatio > strongEdge && area > strongArea;
    }).length;
    const isMulti =
        fillCandidates >= 2 &&
        topArea > strongArea &&
        secondArea > strongArea &&
        topWhite > strongWhite &&
        secondWhite > strongWhite &&
        topEdge > strongEdge &&
        secondEdge > strongEdge &&
        secondArea > thirdArea * 2 &&
        secondWhite > thirdWhite * 1.6 &&
        secondEdge > thirdEdge * 1.6 &&
        similarArea &&
        similarWhite &&
        similarEdge;
    const isBlank =
        topArea < tunedAreaThreshold * 0.75 &&
        topWhite < tunedWhiteThreshold * 0.7 &&
        topEdge < tunedEdgeThreshold * 0.7;

    const passesArea = maxPixels > tunedAreaThreshold;
    const passesRatio = maxPixels > secondMax * (lowLight ? 1.1 : 1.2);
    const passesWhite = maxWhiteRatio > tunedWhiteThreshold;
    const passesEdge = topEdge > tunedEdgeThreshold * 0.8;
    const relaxedWhiteThreshold = Math.max(0.12, tunedWhiteThreshold * 0.75);
    const relaxedAreaThreshold = Math.max(coreArea * 0.07, tunedAreaThreshold * 0.7);
    const relaxedEdgeThreshold = Math.max(0.006, tunedEdgeThreshold * 0.7);
    const dominanceArea = topArea > secondArea * 1.15;
    const dominanceWhite = topWhite > secondWhite * 1.08;
    const dominanceEdge = topEdge > secondEdge * 1.05;
    const relaxedPassesArea = maxPixels > relaxedAreaThreshold;
    const relaxedPassesRatio = maxPixels > secondMax * (lowLight ? 1.02 : 1.05);
    const relaxedPassesWhite = maxWhiteRatio > relaxedWhiteThreshold;
    const relaxedPassesEdge = topEdge > relaxedEdgeThreshold;
    const relaxedPassesEdgeOrCenter = relaxedPassesEdge || maxWhiteRatio > relaxedWhiteThreshold * 1.15;
    const relaxedPasses = relaxedPassesArea && relaxedPassesRatio && relaxedPassesWhite && relaxedPassesEdgeOrCenter && detectedOption !== -1 && (dominanceArea || dominanceWhite || dominanceEdge);
    const confidence = Math.max(maxWhiteRatio / Math.max(0.01, adaptiveWhiteThreshold), maxPixels / Math.max(1, adaptiveAreaThreshold));
    const options = ['A', 'B', 'C', 'D'];

    if (isMulti) {
        const outX = alignedX + layout.optionOffset - layout.gapX * 0.4;
        const outY = alignedY - layout.rowHeight * 0.2;
        const outW = layout.gapX * 3 + layout.bubbleW + layout.gapX * 0.8;
        const outH = layout.bubbleH + layout.rowHeight * 0.4;
        const colorInvalid = new cv.Scalar(255, 165, 0, 255);
        cv.rectangle(working, new cv.Point(outX, outY), new cv.Point(outX + outW, outY + outH), colorInvalid, 2);
        return { answer: "MULTI", confidence };
    }
    if (passesArea && passesRatio && passesWhite && passesEdge && detectedOption !== -1) {
        const answer = options[detectedOption];
        const bx = alignedX + layout.optionOffset + (detectedOption * layout.gapX);
        const by = alignedY;
        const isCorrect = expectedAnswer ? expectedAnswer === answer : false;
        const colorMarked = isCorrect ? new cv.Scalar(0, 255, 0, 255) : new cv.Scalar(255, 0, 0, 255);
        cv.rectangle(working, new cv.Point(bx, by), new cv.Point(bx+layout.bubbleW, by+layout.bubbleH), colorMarked, 2);
        return { answer, confidence };
    }
    if (isBlank || !(passesArea && passesRatio && passesWhite && passesEdge)) {
        if (relaxedPasses) {
            const answer = options[detectedOption];
            const bx = alignedX + layout.optionOffset + (detectedOption * layout.gapX);
            const by = alignedY;
            const isCorrect = expectedAnswer ? expectedAnswer === answer : false;
            const colorMarked = isCorrect ? new cv.Scalar(0, 255, 0, 255) : new cv.Scalar(255, 0, 0, 255);
            cv.rectangle(working, new cv.Point(bx, by), new cv.Point(bx+layout.bubbleW, by+layout.bubbleH), colorMarked, 2);
            return { answer, confidence };
        }
        if (expectedAnswer) {
            const outX = alignedX + layout.optionOffset - layout.gapX * 0.4;
            const outY = alignedY - layout.rowHeight * 0.2;
            const outW = layout.gapX * 3 + layout.bubbleW + layout.gapX * 0.8;
            const outH = layout.bubbleH + layout.rowHeight * 0.4;
            const colorMissing = new cv.Scalar(255, 215, 0, 255);
            cv.rectangle(working, new cv.Point(outX, outY), new cv.Point(outX + outW, outY + outH), colorMissing, 2);
        }
        return { answer: "", confidence };
    }
    if (expectedAnswer) {
        const outX = alignedX + layout.optionOffset - layout.gapX * 0.4;
        const outY = alignedY - layout.rowHeight * 0.2;
        const outW = layout.gapX * 3 + layout.bubbleW + layout.gapX * 0.8;
        const outH = layout.bubbleH + layout.rowHeight * 0.4;
        const colorMissing = new cv.Scalar(255, 215, 0, 255);
        cv.rectangle(working, new cv.Point(outX, outY), new cv.Point(outX + outW, outY + outH), colorMissing, 2);
    }
    return { answer: "", confidence };
};

// Helper: Sort points [TL, TR, BR, BL]
const sortPoints = (points: Point[]) => {
    // Sort by Y first
    points.sort((a, b) => a.y - b.y);
    
    // Top two points
    const top = points.slice(0, 2);
    // Bottom two points
    const bottom = points.slice(2, 4);
    
    // Sort top by X -> TL, TR
    top.sort((a, b) => a.x - b.x);
    
    // Sort bottom by X -> BL, BR
    bottom.sort((a, b) => a.x - b.x);
    
    // Return TL, TR, BR, BL
    return [top[0], top[1], bottom[1], bottom[0]];
};

const getGridLayout = (width: number, height: number) => {
    const mmToPxX = width / 210;
    const mmToPxY = height / 297;
    const gridLeftMargin = 15;
    const startY = 100;
    const colWidth = 45;
    const rowHeight = 6.5;
    const gapEvery = 5;
    const gapHeight = 2;
    const bubbleW = 4.5;
    const bubbleH = 3;
    const gapX = 7;
    const optionOffset = 10;

    return {
        gridLeft: gridLeftMargin * mmToPxX,
        startY: startY * mmToPxY,
        colWidth: colWidth * mmToPxX,
        rowHeight: rowHeight * mmToPxY,
        gapEvery,
        gapHeight: gapHeight * mmToPxY,
        bubbleW: bubbleW * mmToPxX,
        bubbleH: bubbleH * mmToPxY,
        gapX: gapX * mmToPxX,
        optionOffset: optionOffset * mmToPxX
    };
};

const getGridFrameDestPoints = (width: number, height: number, variant: 'legacy' | 'gapped'): Point[] => {
    const mmToPxX = width / 210;
    const mmToPxY = height / 297;
    const frameLeft = 13;
    const frameTop = 96;
    const frameWidth = 184;
    const frameHeight = variant === 'gapped' ? 176.5 : 168.5;
    const left = frameLeft * mmToPxX;
    const right = (frameLeft + frameWidth) * mmToPxX;
    const top = frameTop * mmToPxY;
    const bottom = (frameTop + frameHeight) * mmToPxY;
    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom }
    ];
};

const getGridMarkerDestPoints = (width: number, height: number, variant: 'legacy' | 'gapped'): Point[] => {
    const mmToPxX = width / 210;
    const mmToPxY = height / 297;
    const frameLeft = 13;
    const frameTop = 96;
    const frameWidth = 184;
    const frameHeight = variant === 'gapped' ? 176.5 : 168.5;
    const markerOffset = 6;
    const left = (frameLeft - markerOffset) * mmToPxX;
    const right = (frameLeft + frameWidth + markerOffset) * mmToPxX;
    const top = (frameTop - markerOffset) * mmToPxY;
    const bottom = (frameTop + frameHeight + markerOffset) * mmToPxY;
    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom }
    ];
};

const computeColumnOffsets = (
    edges: CvMat,
    layout: ReturnType<typeof getGridLayout>,
    width: number,
    height: number,
    useGappedLayout: boolean
): number[] => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv) {
        return [0, 0, 0, 0];
    }
    const offsets: number[] = [];
    const search = 10;
    const cols = 4;
    const gapCount = useGappedLayout ? Math.floor((25 - 1) / layout.gapEvery) : 0;
    const gridHeight = Math.round(layout.rowHeight * 25 + (gapCount * layout.gapHeight));
    for (let colIdx = 0; colIdx < cols; colIdx++) {
        let bestScore = -1;
        let bestOffset = 0;
        for (let dx = -search; dx <= search; dx++) {
            const xBase = Math.round(layout.gridLeft + (colIdx * layout.colWidth) + layout.optionOffset + dx - 4);
            const yBase = Math.round(layout.startY - 2);
            const w = Math.round(layout.gapX * 3 + layout.bubbleW + 8);
            const h = Math.round(gridHeight + 4);
            if (xBase < 0 || yBase < 0 || xBase + w > width || yBase + h > height) {
                continue;
            }
            const rect = new cv.Rect(xBase, yBase, w, h);
            const roi = edges.roi(rect);
            const score = cv.countNonZero(roi);
            roi.delete();
            if (score > bestScore) {
                bestScore = score;
                bestOffset = dx;
            }
        }
        offsets.push(bestOffset);
    }
    return offsets;
};

const computeRowOffset = (
    edges: CvMat,
    layout: ReturnType<typeof getGridLayout>,
    width: number,
    height: number,
    useGappedLayout: boolean
): number => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv) {
        return 0;
    }
    const search = 8;
    let bestScore = -1;
    let bestOffset = 0;
    const gapCount = useGappedLayout ? Math.floor((25 - 1) / layout.gapEvery) : 0;
    const gridHeight = Math.round(layout.rowHeight * 25 + (gapCount * layout.gapHeight));
    for (let dy = -search; dy <= search; dy++) {
        const xBase = Math.round(layout.gridLeft + layout.optionOffset - 4);
        const yBase = Math.round(layout.startY + dy - 2);
        const w = Math.round(layout.colWidth * 4 + 8);
        const h = Math.round(gridHeight + 4);
        if (xBase < 0 || yBase < 0 || xBase + w > width || yBase + h > height) {
            continue;
        }
        const rect = new cv.Rect(xBase, yBase, w, h);
        const roi = edges.roi(rect);
        const score = cv.countNonZero(roi);
        roi.delete();
        if (score > bestScore) {
            bestScore = score;
            bestOffset = dy;
        }
    }
    return bestOffset;
};

const getMarkerDestPoints = (width: number, height: number): Point[] => {
    const mmToPxX = width / 210;
    const mmToPxY = height / 297;
    const margin = 10;
    const size = 10;
    const half = size / 2;
    const tl = { x: (margin + half) * mmToPxX, y: (margin + half) * mmToPxY };
    const tr = { x: (210 - margin - half) * mmToPxX, y: (margin + half) * mmToPxY };
    const br = { x: (210 - margin - half) * mmToPxX, y: (297 - margin - half) * mmToPxY };
    const bl = { x: (margin + half) * mmToPxX, y: (297 - margin - half) * mmToPxY };
    return [tl, tr, br, bl];
};

const detectGridFrame = (src: CvMat): GridFrameResult | null => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv) {
        return null;
    }
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresh = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
    cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);
    kernel.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.rows * src.cols;
    const minArea = imgArea * 0.08;
    const maxArea = imgArea * 0.6;
    const expectedLegacyRatio = 184 / 168.5;
    const expectedGappedRatio = 184 / 176.5;
    let bestScore = Infinity;
    let bestPoints: Point[] | null = null;
    let bestVariant: 'legacy' | 'gapped' = 'legacy';

    for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area < minArea || area > maxArea) {
            continue;
        }
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
            const rect = cv.boundingRect(approx);
            const ratio = rect.width / rect.height;
            const legacyDiff = Math.abs(Math.log(ratio / expectedLegacyRatio));
            const gappedDiff = Math.abs(Math.log(ratio / expectedGappedRatio));
            const ratioDiff = Math.min(legacyDiff, gappedDiff);
            const variant = legacyDiff <= gappedDiff ? 'legacy' : 'gapped';
            if (ratioDiff < bestScore) {
                const points: Point[] = [];
                for (let j = 0; j < 4; j++) {
                    points.push({
                        x: approx.data32S[j * 2],
                        y: approx.data32S[j * 2 + 1]
                    });
                }
                bestScore = ratioDiff;
                bestPoints = sortPoints(points);
                bestVariant = variant;
            }
        }
        approx.delete();
    }

    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    return bestPoints ? { points: bestPoints, variant: bestVariant } : null;
};

const detectMarkerCentersNearGrid = (src: CvMat, gridFrame: Point[] | null): Point[] | null => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv || !gridFrame) {
        return null;
    }
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresh = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);
    kernel.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.rows * src.cols;
    const minArea = imgArea * 0.0005;
    const maxArea = imgArea * 0.01;
    const candidates: Point[] = [];
    const hData = hierarchy.data32S;

    for (let i = 0; i < contours.size(); ++i) {
        const childIndex = hData[i * 4 + 2];
        if (childIndex < 0) {
            continue;
        }
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        const area = rect.width * rect.height;
        const ratio = rect.width / rect.height;
        if (area >= minArea && area <= maxArea && ratio >= 0.85 && ratio <= 1.15) {
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
            if (approx.rows === 4 && cv.isContourConvex(approx)) {
                const contourArea = cv.contourArea(cnt);
                const extent = contourArea / area;
                if (extent > 0.6) {
                    candidates.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }
            }
            approx.delete();
        }
    }

    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    if (candidates.length < 4) {
        return null;
    }

    const frameW = Math.hypot(gridFrame[1].x - gridFrame[0].x, gridFrame[1].y - gridFrame[0].y);
    const frameH = Math.hypot(gridFrame[3].x - gridFrame[0].x, gridFrame[3].y - gridFrame[0].y);
    const maxDist = Math.max(frameW, frameH) * 0.45;
    const used = new Set<number>();
    const result: Point[] = [];
    for (const target of gridFrame) {
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < candidates.length; i++) {
            if (used.has(i)) {
                continue;
            }
            const dx = candidates[i].x - target.x;
            const dy = candidates[i].y - target.y;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        if (bestIdx < 0 || Math.sqrt(bestDist) > maxDist) {
            return null;
        }
        used.add(bestIdx);
        result.push(candidates[bestIdx]);
    }
    return result;
};

const selectMarkerCorners = (candidates: Point[]): Point[] | null => {
    if (candidates.length < 4) {
        return null;
    }
    let tl = candidates[0];
    let tr = candidates[0];
    let br = candidates[0];
    let bl = candidates[0];
    let minSum = Infinity;
    let maxSum = -Infinity;
    let minDiff = Infinity;
    let maxDiff = -Infinity;
    for (const p of candidates) {
        const sum = p.x + p.y;
        const diff = p.x - p.y;
        if (sum < minSum) {
            minSum = sum;
            tl = p;
        }
        if (sum > maxSum) {
            maxSum = sum;
            br = p;
        }
        if (diff < minDiff) {
            minDiff = diff;
            bl = p;
        }
        if (diff > maxDiff) {
            maxDiff = diff;
            tr = p;
        }
    }
    const unique = new Set([tl, tr, br, bl]);
    if (unique.size < 4) {
        return null;
    }
    return [tl, tr, br, bl];
};

const detectMarkerCentersAnywhere = (src: CvMat): Point[] | null => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv) {
        return null;
    }
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresh = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);
    kernel.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.rows * src.cols;
    const minArea = imgArea * 0.0005;
    const maxArea = imgArea * 0.01;
    const candidates: Point[] = [];
    const hData = hierarchy.data32S;

    for (let i = 0; i < contours.size(); ++i) {
        const childIndex = hData[i * 4 + 2];
        if (childIndex < 0) {
            continue;
        }
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        const area = rect.width * rect.height;
        const ratio = rect.width / rect.height;
        if (area >= minArea && area <= maxArea && ratio >= 0.85 && ratio <= 1.15) {
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
            if (approx.rows === 4 && cv.isContourConvex(approx)) {
                const contourArea = cv.contourArea(cnt);
                const extent = contourArea / area;
                if (extent > 0.6) {
                    candidates.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }
            }
            approx.delete();
        }
    }

    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    return selectMarkerCorners(candidates);
};

const detectMarkerCenters = (src: CvMat): Point[] | null => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv) {
        return null;
    }
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresh = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel);
    kernel.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.rows * src.cols;
    const minArea = imgArea * 0.0005;
    const maxArea = imgArea * 0.01;
    const candidates: Point[] = [];
    const hData = hierarchy.data32S;

    for (let i = 0; i < contours.size(); ++i) {
        const childIndex = hData[i * 4 + 2];
        if (childIndex < 0) {
            continue;
        }
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        const area = rect.width * rect.height;
        const ratio = rect.width / rect.height;
        if (area >= minArea && area <= maxArea && ratio >= 0.85 && ratio <= 1.15) {
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
            if (approx.rows === 4 && cv.isContourConvex(approx)) {
                const contourArea = cv.contourArea(cnt);
                const extent = contourArea / area;
                if (extent > 0.6) {
                    candidates.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }
            }
            approx.delete();
        }
    }

    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    if (candidates.length < 4) {
        return null;
    }
    const w = src.cols;
    const h = src.rows;
    const regions = [
        { corner: { x: 0, y: 0 }, minX: 0, maxX: w * 0.35, minY: 0, maxY: h * 0.35 },
        { corner: { x: w, y: 0 }, minX: w * 0.65, maxX: w, minY: 0, maxY: h * 0.35 },
        { corner: { x: w, y: h }, minX: w * 0.65, maxX: w, minY: h * 0.65, maxY: h },
        { corner: { x: 0, y: h }, minX: 0, maxX: w * 0.35, minY: h * 0.65, maxY: h }
    ];
    const result: Point[] = [];
    for (const region of regions) {
        let best: Point | null = null;
        let bestDist = Infinity;
        for (const p of candidates) {
            if (p.x < region.minX || p.x > region.maxX || p.y < region.minY || p.y > region.maxY) {
                continue;
            }
            const dx = p.x - region.corner.x;
            const dy = p.y - region.corner.y;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                best = p;
            }
        }
        if (!best) {
            return null;
        }
        result.push(best);
    }
    return result;
};

const detectMarkerCentersInWarped = (src: CvMat, width: number, height: number): Point[] | null => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv) {
        return null;
    }
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresh = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const sizePx = (width / 210) * 10;
    const minArea = sizePx * sizePx * 0.3;
    const maxArea = sizePx * sizePx * 4;
    const candidates: Point[] = [];

    for (let i = 0; i < contours.size(); ++i) {
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        const area = rect.width * rect.height;
        const ratio = rect.width / rect.height;
        if (area >= minArea && area <= maxArea && ratio >= 0.85 && ratio <= 1.15) {
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.04 * peri, true);
            if (approx.rows === 4 && cv.isContourConvex(approx)) {
                const contourArea = cv.contourArea(cnt);
                const extent = contourArea / area;
                if (extent > 0.6) {
                    candidates.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                }
            }
            approx.delete();
        }
    }

    gray.delete();
    blurred.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    if (candidates.length < 4) {
        return null;
    }
    const expected = getMarkerDestPoints(width, height);
    const maxDist = sizePx * 3.5;
    const result: Point[] = [];
    for (const target of expected) {
        let best: Point | null = null;
        let bestDist = Infinity;
        for (const p of candidates) {
            const dx = p.x - target.x;
            const dy = p.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                bestDist = dist;
                best = p;
            }
        }
        if (!best || bestDist > maxDist) {
            return null;
        }
        result.push(best);
    }
    return result;
};

const refineWarpUsingMarkers = (src: CvMat, width: number, height: number): CvMat | null => {
    const cv = window.cv as OpenCV | undefined;
    if (!cv) {
        return null;
    }
    const centers = detectMarkerCentersInWarped(src, width, height);
    if (!centers) {
        return null;
    }
    const markerDest = getMarkerDestPoints(width, height);
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        centers[0].x, centers[0].y,
        centers[1].x, centers[1].y,
        centers[2].x, centers[2].y,
        centers[3].x, centers[3].y
    ]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        markerDest[0].x, markerDest[0].y,
        markerDest[1].x, markerDest[1].y,
        markerDest[2].x, markerDest[2].y,
        markerDest[3].x, markerDest[3].y
    ]);
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    const refined = new cv.Mat();
    cv.warpPerspective(src, refined, M, new cv.Size(width, height));
    srcTri.delete();
    dstTri.delete();
    M.delete();
    return refined;
};
