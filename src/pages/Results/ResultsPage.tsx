import { useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { Card } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import styles from './Results.module.scss';

interface ResultsPageProps {
  result: {
    answers: string[];
    correctAnswers: string[];
    questionCount: number;
    previewImage: string;
    layoutVariant: 'legacy' | 'gapped';
  };
  onBack: () => void;
  onRescan: () => void;
  editable?: boolean;
  onConfirm?: (payload: { correctedAnswers: string[]; score: number; total: number }) => void;
}

type Status = 'correct' | 'incorrect' | 'multi' | 'blank' | 'no_key';

export const ResultsPage = ({ result, onBack, onRescan, editable, onConfirm }: ResultsPageProps) => {
  const [correctedAnswers, setCorrectedAnswers] = useState<string[]>(result.answers);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(() => Array.from({ length: result.questionCount }).map((_, index) => {
    const correct = result.correctAnswers[index] || '';
    const given = result.answers[index] || '';
    const corrected = correctedAnswers[index] || '';
    const modified = corrected !== given;
    let status: Status = 'blank';

    if (!correct) {
      status = 'no_key';
    } else if (!corrected) {
      status = 'blank';
    } else if (corrected === 'MULTI') {
      status = 'multi';
    } else if (corrected === correct) {
      status = 'correct';
    } else {
      status = 'incorrect';
    }

    return {
      index,
      given,
      corrected,
      correct,
      modified,
      status
    };
  }), [correctedAnswers, result.answers, result.correctAnswers, result.questionCount]);

  const gradedRows = rows.filter((row) => row.status !== 'no_key');
  const correctCount = gradedRows.filter((row) => row.status === 'correct').length;
  const incorrectCount = gradedRows.filter((row) => row.status === 'incorrect').length;
  const multiCount = gradedRows.filter((row) => row.status === 'multi').length;
  const blankCount = gradedRows.filter((row) => row.status === 'blank').length;
  const total = gradedRows.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const options = ['A', 'B', 'C', 'D'];
  const activeRow = activeQuestion !== null ? rows[activeQuestion] : null;
  const overlayBoxes = useMemo(() => {
    const width = 800;
    const height = 1131;
    const mmToPxX = width / 210;
    const mmToPxY = height / 297;
    const gridLeftMargin = 15 * mmToPxX;
    const startY = 100 * mmToPxY;
    const colWidth = 45 * mmToPxX;
    const rowHeight = 6.5 * mmToPxY;
    const bubbleW = 4.5 * mmToPxX;
    const bubbleH = 3 * mmToPxY;
    const gapX = 7 * mmToPxX;
    const optionOffset = 10 * mmToPxX;
    const gapEvery = 5;
    const gapHeight = result.layoutVariant === 'gapped' ? 2 * mmToPxY : 0;
    const boxes = [];
    for (let q = 0; q < result.questionCount; q++) {
      const colIdx = Math.floor(q / 25);
      const rowIdx = q % 25;
      const gapOffset = Math.floor(rowIdx / gapEvery) * gapHeight;
      const baseX = gridLeftMargin + (colIdx * colWidth);
      const baseY = startY + (rowIdx * rowHeight) + gapOffset;
      const x = baseX + optionOffset - (2 * mmToPxX);
      const y = baseY - (1 * mmToPxY);
      const w = (gapX * 3) + bubbleW + (4 * mmToPxX);
      const h = bubbleH + (2 * mmToPxY);
      boxes.push({ index: q, x, y, w, h });
    }
    return boxes;
  }, [result.layoutVariant, result.questionCount]);
  const [overlayScale, setOverlayScale] = useState({ x: 1, y: 1 });
  const updateScale = () => {
    if (!containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setOverlayScale({ x: rect.width / 800, y: rect.height / 1131 });
  };
  const handleImageLoad = () => {
    updateScale();
    setImageReady(true);
  };
  const handleHotspotClick = (index: number, box: { x: number; y: number; w: number; h: number }) => {
    if (!editable || !containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = (box.x + box.w / 2) * overlayScale.x;
    const centerY = (box.y + box.h / 2) * overlayScale.y;
    const popoverX = Math.min(Math.max(centerX, 40), rect.width - 40);
    const popoverY = Math.min(Math.max(centerY, 40), rect.height - 40);
    setActiveQuestion(index);
    setPopoverPosition({ x: popoverX, y: popoverY });
  };
  const applyCorrection = (value: string) => {
    if (activeQuestion === null) {
      return;
    }
    setCorrectedAnswers((prev) => {
      const next = [...prev];
      next[activeQuestion] = value;
      return next;
    });
    setToast(`第 ${activeQuestion + 1} 題已改為 ${value || '空白'}`);
    setTimeout(() => setToast(null), 1200);
    setActiveQuestion(null);
    setPopoverPosition(null);
  };
  const closePopover = () => {
    setPopoverPosition(null);
    setActiveQuestion(null);
  };
  const handleOverlayClick = () => {
    closePopover();
  };
  const stopBubble = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  useEffect(() => {
    if (!imageReady) {
      return;
    }
    const handleResize = () => updateScale();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageReady]);

  useEffect(() => {
    if (!popoverPosition) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopover();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popoverPosition]);

  return (
    <Layout
      title="扫描结果"
      action={
        <Button variant="secondary" onClick={onBack} style={{ padding: '8px' }}>
          <ChevronLeft size={20} />
        </Button>
      }
    >
      <Card>
        <div className={styles.previewHeader}>
          <div className={styles.previewTitle}>扫描图</div>
          <div className={styles.previewSubtitle}>点击题目区域即可修正，点空白处关闭</div>
        </div>
        <div className={styles.previewFrame}>
          <div className={styles.previewCanvas} ref={containerRef}>
            <img
              src={result.previewImage}
              alt="扫描结果"
              className={styles.previewImage}
              onLoad={handleImageLoad}
            />
            {editable && imageReady && (
              <div className={styles.hotspotLayer} onClick={handleOverlayClick}>
                {overlayBoxes.map((box) => (
                  <button
                    key={box.index}
                    type="button"
                    className={`${styles.hotspot} ${activeQuestion === box.index ? styles.hotspotActive : ''} ${correctedAnswers[box.index] !== result.answers[box.index] ? styles.hotspotModified : ''}`}
                    style={{
                      left: `${box.x * overlayScale.x}px`,
                      top: `${box.y * overlayScale.y}px`,
                      width: `${box.w * overlayScale.x}px`,
                      height: `${box.h * overlayScale.y}px`
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleHotspotClick(box.index, box);
                    }}
                  >
                    {correctedAnswers[box.index] !== result.answers[box.index] && (
                      <span className={styles.hotspotLabel}>
                        {correctedAnswers[box.index] || '空白'}
                      </span>
                    )}
                  </button>
                ))}
                {popoverPosition && activeQuestion !== null && activeRow && (
                  <div
                    className={styles.popover}
                    style={{ left: `${popoverPosition.x}px`, top: `${popoverPosition.y}px` }}
                    onClick={stopBubble}
                  >
                    <div className={styles.popoverHeader}>
                      <div className={styles.popoverTitle}>第 {activeRow.index + 1} 題</div>
                      <div className={styles.popoverStatus} data-status={activeRow.status}>
                        {activeRow.status === 'correct' && '正确'}
                        {activeRow.status === 'incorrect' && '错误'}
                        {activeRow.status === 'multi' && '多选'}
                        {activeRow.status === 'blank' && '未作答'}
                        {activeRow.status === 'no_key' && '未设置答案'}
                      </div>
                      <button type="button" className={styles.popoverClose} onClick={closePopover}>
                        ×
                      </button>
                    </div>
                    <div className={styles.popoverMeta}>
                      <span>识别：{activeRow.given || '-'}</span>
                      <span>修正：{activeRow.corrected || '-'}</span>
                      <span>正确：{activeRow.correct || '未设置'}</span>
                    </div>
                    <div className={styles.popoverActions}>
                      {options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`${styles.popoverButton} ${correctedAnswers[activeQuestion] === option ? styles.popoverButtonActive : ''}`}
                          onClick={() => applyCorrection(option)}
                        >
                          {option}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`${styles.popoverButton} ${correctedAnswers[activeQuestion] === '' ? styles.popoverButtonActive : ''}`}
                        onClick={() => applyCorrection('')}
                      >
                        清空
                      </button>
                      {activeRow.correct && (
                        <button
                          type="button"
                          className={styles.popoverButtonPrimary}
                          onClick={() => applyCorrection(activeRow.correct)}
                        >
                          改為正確
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {toast && (
        <div className={styles.toast}>{toast}</div>
      )}

      <Card>
        <div className={styles.summaryHeader}>
          <div>
            <div className={styles.summaryTitle}>总体概览</div>
            <div className={styles.summarySubtitle}>本次扫描的统计结果</div>
          </div>
          <div className={styles.accuracy}>
            <div className={styles.accuracyValue}>{accuracy}%</div>
            <div className={styles.accuracyLabel}>正确率</div>
          </div>
        </div>
        <div className={styles.summaryGrid}>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>正确题数</div>
            <div className={styles.statValue}>{correctCount}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>错题数</div>
            <div className={styles.statValue}>{incorrectCount}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>未作答</div>
            <div className={styles.statValue}>{blankCount}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>异常题数</div>
            <div className={styles.statValue}>{multiCount}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>多选</div>
            <div className={styles.statValue}>{multiCount}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>计入评分</div>
            <div className={styles.statValue}>{total}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>总题数</div>
            <div className={styles.statValue}>{result.questionCount}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className={styles.detailsHeader}>
          <div className={styles.detailsTitle}>题目明细</div>
          <div className={styles.detailsSubtitle}>
            {editable ? '识别答案可在此修正' : '识别答案与正确答案对照'}
          </div>
        </div>
        <div className={styles.list}>
          {rows.map((row) => (
            <div key={row.index} className={`${styles.row} ${row.modified ? styles.rowModified : ''}`}>
              <div className={styles.rowLeft}>
                <div className={styles.questionNum}>{row.index + 1}</div>
                <div className={styles.answerText}>
                  识别: {row.given || '-'} | 修正: {row.corrected || '-'} | 正确: {row.correct || '-'}
                </div>
                {row.modified && <div className={styles.modifiedBadge}>已人工更正</div>}
                {editable && row.status !== 'no_key' && (
                  <div className={styles.editGroup}>
                    {options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`${styles.editButton} ${row.corrected === option ? styles.editButtonActive : ''}`}
                        onClick={() => {
                          setCorrectedAnswers((prev) => {
                            const next = [...prev];
                            next[row.index] = option;
                            return next;
                          });
                        }}
                      >
                        {option}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`${styles.editButton} ${row.corrected === '' ? styles.editButtonActive : ''}`}
                      onClick={() => {
                        setCorrectedAnswers((prev) => {
                          const next = [...prev];
                          next[row.index] = '';
                          return next;
                        });
                      }}
                    >
                      清空
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.statusPill} data-status={row.status}>
                {row.status === 'correct' && '正确'}
                {row.status === 'incorrect' && '错误'}
                {row.status === 'multi' && '多选'}
                {row.status === 'blank' && '未作答'}
                {row.status === 'no_key' && '未设置答案'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className={styles.actions}>
        {editable && onConfirm && (
          <Button
            fullWidth
            onClick={() => {
              onConfirm({ correctedAnswers, score: correctCount, total });
            }}
          >
            确认保存
          </Button>
        )}
        <Button fullWidth icon={<RefreshCw size={18} />} onClick={onRescan}>
          重新扫描
        </Button>
        <Button fullWidth variant="secondary" onClick={onBack}>
          返回首页
        </Button>
      </div>
    </Layout>
  );
};
