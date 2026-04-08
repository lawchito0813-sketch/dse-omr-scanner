import { jsPDF } from "jspdf";

export const generateAnswerSheet = (questionCount: number = 45) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  // Revert to standard Helvetica to fix encoding issues
  doc.setFont("helvetica");

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  
  // ==========================================
  // 1. 锚点标记 (Fiducial Markers) - 使用 ArUco 风格的正方形
  // ==========================================
  // 绘制 7x7 网格的简单标记，用于精确角点检测
  // Top-Left
  drawFiducialMarker(doc, margin, margin, 10);
  // Top-Right
  drawFiducialMarker(doc, pageWidth - margin - 10, margin, 10);
  // Bottom-Left
  drawFiducialMarker(doc, margin, pageHeight - margin - 10, 10); // Move up slightly
  // Bottom-Right
  drawFiducialMarker(doc, pageWidth - margin - 10, pageHeight - margin - 10, 10); // Move up slightly

  // ==========================================
  // 2. 头部信息 (Header)
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("HONG KONG DIPLOMA OF SECONDARY EDUCATION EXAMINATION", pageWidth / 2, 25, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("ANSWER SHEET", pageWidth / 2, 32, { align: "center" });

  // 考生编号区域 (Candidate Number)
  // 右上角区域
  const headerRightX = 130;
  const headerY = 40;
  
  doc.setFontSize(9);
  doc.text("(1) Candidate No.", headerRightX, headerY);
  
  // 绘制 10 个格子
  const boxSize = 6;
  for (let i = 0; i < 10; i++) {
      doc.rect(headerRightX + (i * boxSize), headerY + 2, boxSize, 8);
  }
  
  doc.text("(2) Name of Candidate", headerRightX, headerY + 18);
  doc.line(headerRightX, headerY + 28, headerRightX + 60, headerY + 28); // 下划线
  
  doc.text("(3) Signature of Candidate", headerRightX, headerY + 36);
  doc.line(headerRightX, headerY + 46, headerRightX + 60, headerY + 46); // 下划线

  // 左侧贴纸区
  doc.setLineWidth(0.3);
  doc.rect(20, 40, 70, 30);
  doc.setFontSize(8);
  doc.text("Please stick the barcode label here", 55, 54, { align: "center" });

  // 提示语
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("YOU ARE ADVISED TO USE H.B. PENCILS", 55, 84, { align: "center" });

  // ==========================================
  // 3. 题目网格 (Question Grid) - 严格 4 列布局
  // ==========================================
  // DSE 答题卡标准：4列，每列25题，共100题。
  const startY = 100;
  const questionsPerCol = 25;
  const totalQuestions = 100; // 即使只选45题，模板也显示100个位置
  
  // 计算列宽
  // 页面宽度 210mm，左右边距 10mm -> 190mm 可用
  // 4 列 -> 每列约 45mm
  const gridLeftMargin = 15;
  const colWidth = 45; 
  const rowHeight = 6.5; // 行高
  
  // 气泡样式
  const bubbleWidth = 4.5;
  const bubbleHeight = 3;
  const options = ['A', 'B', 'C', 'D'];

  const frameLeft = gridLeftMargin - 2;
  const frameTop = startY - 4;
  const frameWidth = (colWidth * 4) + 4;
  const frameHeight = (rowHeight * questionsPerCol) + 6;
  doc.setLineWidth(1.2);
  doc.rect(frameLeft, frameTop, frameWidth, frameHeight);
  doc.setLineWidth(0.3);

  // doc.setFont("helvetica", "normal");
  
  // 绘制所有 100 个题目的空位
  for (let i = 0; i < totalQuestions; i++) {
    const colIndex = Math.floor(i / questionsPerCol); // 0, 1, 2, 3
    const rowIndex = i % questionsPerCol; // 0 - 24
    
    // 计算当前题目的起始坐标
    // x = 左边距 + (列索引 * 列宽)
    const xBase = gridLeftMargin + (colIndex * colWidth);
    // y = 起始Y + (行索引 * 行高)
    const yBase = startY + (rowIndex * rowHeight);
    
    // 1. 绘制列分割线 (可选，DSE通常有竖线分隔)
    if (rowIndex === 0 && colIndex > 0) {
        doc.setDrawColor(200, 200, 200);
        doc.line(xBase - 5, startY, xBase - 5, startY + (questionsPerCol * rowHeight));
        doc.setDrawColor(0, 0, 0); // Reset to black
    }

    // 2. 绘制列头 (A B C D) - 仅在每列第一行上方绘制
    if (rowIndex === 0) {
       doc.setFontSize(7);
       for (let opt = 0; opt < 4; opt++) {
          const bx = xBase + 10 + (opt * 7); // 7mm spacing
          doc.text(options[opt], bx + 1, yBase - 2);
       }
       doc.setFontSize(9);
    }
    
    // 3. 绘制题号
    // 如果题目超出了用户设定的 questionCount，则不显示题号，或者显示灰色？
    // DSE 答题卡是通用的，通常印有 1-100 全部题号。
    // 这里我们印全部 1-100，但为了 OMR 方便，我们保持一致。
    doc.setFontSize(9);
    if (i < questionCount) {
        doc.setTextColor(0, 0, 0); // 黑色 (有效题目)
    } else {
        doc.setTextColor(180, 180, 180); // 浅灰色 (无效题目)
    }
    
    // 题号对齐 (右对齐)
    doc.text(`${i + 1}`, xBase + 6, yBase + 2.5, { align: "right" });
    
    // 4. 绘制选项框
    doc.setDrawColor(0, 0, 0); // 边框永远黑色
    for (let opt = 0; opt < 4; opt++) {
      const bx = xBase + 10 + (opt * 7);
      const by = yBase;
      
      // 绘制小矩形框
      doc.rect(bx, by, bubbleWidth, bubbleHeight);
    }
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);

  // ==========================================
  // 4. 底部指引 (Instructions) - 修正排版
  // ==========================================
  // 移动到底部区域，不要与题目重叠
  const footerY = 270; // 靠近页面底部
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // 左侧：正确填涂示范
  const leftX = 20;
  doc.text("Mark your answers as follows:", leftX, footerY + 5);
  
  // 示范框 (Box 23)
  const demoY = footerY + 10;
  doc.text("23", leftX, demoY + 3);
  
  // Draw A B C D boxes for demo
  for(let opt=0; opt<4; opt++) {
     const bx = leftX + 10 + (opt * 7);
     doc.rect(bx, demoY, bubbleWidth, bubbleHeight);
     // Draw letters above
     doc.setFontSize(7);
     doc.text(options[opt], bx + 1, demoY - 2);
  }
  // Fill 'B' as example
  doc.rect(leftX + 10 + 7 + 1, demoY + 1, bubbleWidth - 2, bubbleHeight - 2, "F");
  
  doc.setFontSize(9);
  
  // 右侧：错误填涂警告
  const rightX = 110;
  doc.text("Wrong marks should be completely erased with a clean rubber.", rightX, footerY + 5);
  
  doc.text("DO NOT FOLD OR PUNCTURE THIS SHEET", rightX, footerY + 17);

  doc.save("dse_answer_sheet.pdf");
};

export const generateScanOnlySheet = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica");

  const startY = 100;
  const questionsPerCol = 25;
  const totalQuestions = 100;
  const gridLeftMargin = 15;
  const colWidth = 45;
  const rowHeight = 6.5;
  const gapEvery = 5;
  const gapHeight = 2;
  const bubbleWidth = 4.5;
  const bubbleHeight = 3;
  const options = ['A', 'B', 'C', 'D'];

  const frameLeft = gridLeftMargin - 2;
  const frameTop = startY - 4;
  const frameWidth = (colWidth * 4) + 4;
  const gapCount = Math.floor((questionsPerCol - 1) / gapEvery);
  const frameHeight = (rowHeight * questionsPerCol) + (gapCount * gapHeight) + 6;
  const markerSize = 10;
  const markerOffset = 6;
  const markerCenters = [
    { x: frameLeft - markerOffset, y: frameTop - markerOffset },
    { x: frameLeft + frameWidth + markerOffset, y: frameTop - markerOffset },
    { x: frameLeft + frameWidth + markerOffset, y: frameTop + frameHeight + markerOffset },
    { x: frameLeft - markerOffset, y: frameTop + frameHeight + markerOffset }
  ];
  for (const center of markerCenters) {
    drawFiducialMarker(doc, center.x - markerSize / 2, center.y - markerSize / 2, markerSize);
  }
  doc.setLineWidth(1.2);
  doc.rect(frameLeft, frameTop, frameWidth, frameHeight);
  doc.setLineWidth(0.3);

  for (let i = 0; i < totalQuestions; i++) {
    const colIndex = Math.floor(i / questionsPerCol);
    const rowIndex = i % questionsPerCol;
    const xBase = gridLeftMargin + (colIndex * colWidth);
    const gapOffset = Math.floor(rowIndex / gapEvery) * gapHeight;
    const yBase = startY + (rowIndex * rowHeight) + gapOffset;

    if (rowIndex === 0 && colIndex > 0) {
        doc.setDrawColor(200, 200, 200);
        doc.line(xBase - 5, startY, xBase - 5, startY + frameHeight - 6);
        doc.setDrawColor(0, 0, 0);
    }

    if (rowIndex === 0) {
       doc.setFontSize(7);
       for (let opt = 0; opt < 4; opt++) {
          const bx = xBase + 10 + (opt * 7);
          doc.text(options[opt], bx + 1, yBase - 2);
       }
       doc.setFontSize(9);
    }

    if (rowIndex > 0 && rowIndex % gapEvery === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(xBase - 2, yBase - gapHeight, colWidth - 2, gapHeight, "F");
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`${i + 1}`, xBase + 6, yBase + 2.5, { align: "right" });

    for (let opt = 0; opt < 4; opt++) {
      const bx = xBase + 10 + (opt * 7);
      const by = yBase;
      doc.rect(bx, by, bubbleWidth, bubbleHeight);
    }
  }

  doc.save("dse_answer_sheet_scan.pdf");
};

// Helper to draw a square fiducial marker (concentric squares)
// Similar to a QR code finder pattern
const drawFiducialMarker = (doc: jsPDF, x: number, y: number, size: number) => {
    // Outer black box
    doc.setFillColor(0, 0, 0);
    doc.rect(x, y, size, size, "F");
    
    // Inner white box
    doc.setFillColor(255, 255, 255);
    const innerSize = size * 0.6;
    const offset = (size - innerSize) / 2;
    doc.rect(x + offset, y + offset, innerSize, innerSize, "F");
    
    // Center black box
    doc.setFillColor(0, 0, 0);
    const centerSize = size * 0.3;
    const centerOffset = (size - centerSize) / 2;
    doc.rect(x + centerOffset, y + centerOffset, centerSize, centerSize, "F");
    
    // Reset fill color
    doc.setFillColor(0, 0, 0); // Default black
};
