import { useCallback, useMemo, useState } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { Card } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { ChevronLeft } from 'lucide-react';
import styles from './TaskCreate.module.scss';
import { useStore } from '../../store/useStore';

interface TaskCreatePageProps {
  onBack: () => void;
  onCreated: (taskId: string) => void;
}

export const TaskCreatePage = ({ onBack, onCreated }: TaskCreatePageProps) => {
  const { addTask } = useStore();
  const [taskName, setTaskName] = useState('');
  const [questionCount, setQuestionCount] = useState(45);
  const [answerKey, setAnswerKey] = useState<string[]>(Array(100).fill(''));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [rangeValue, setRangeValue] = useState<'A' | 'B' | 'C' | 'D' | ''>('');
  const [pasteText, setPasteText] = useState('');
  const [pasteStart, setPasteStart] = useState(1);

  const stats = useMemo(() => {
    const limitedAnswers = answerKey.slice(0, questionCount);
    const configured = limitedAnswers.filter((a) => a).length;
    return {
      configured,
      blank: questionCount - configured
    };
  }, [answerKey, questionCount]);

  const clampQuestionCount = useCallback((value: number) => {
    return Math.max(10, Math.min(75, value));
  }, []);

  const setAnswer = useCallback((index: number, value: string) => {
    setAnswerKey((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const applyRange = useCallback(() => {
    const start = Math.max(1, Math.min(questionCount, rangeStart));
    const end = Math.max(1, Math.min(questionCount, rangeEnd));
    const from = Math.min(start, end) - 1;
    const to = Math.max(start, end) - 1;
    for (let i = from; i <= to; i++) {
      setAnswer(i, rangeValue);
    }
  }, [questionCount, rangeEnd, rangeStart, rangeValue, setAnswer]);

  const applyPaste = useCallback(() => {
    const chars = pasteText.toUpperCase().match(/[ABCD]/g) || [];
    let index = Math.max(1, Math.min(questionCount, pasteStart)) - 1;
    for (const ch of chars) {
      if (index >= questionCount) {
        break;
      }
      setAnswer(index, ch);
      index += 1;
    }
  }, [pasteStart, pasteText, questionCount, setAnswer]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    const map: Record<string, string> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', a: 'a', b: 'b', c: 'c', d: 'd' };
    if (map[key]) {
      setAnswer(currentIndex, map[key].toUpperCase());
      setCurrentIndex(Math.min(questionCount - 1, currentIndex + 1));
      event.preventDefault();
      return;
    }
    if (key === 'arrowup') {
      setCurrentIndex(Math.max(0, currentIndex - 1));
      event.preventDefault();
    }
    if (key === 'arrowdown') {
      setCurrentIndex(Math.min(questionCount - 1, currentIndex + 1));
      event.preventDefault();
    }
    if (key === 'backspace' || key === 'delete') {
      setAnswer(currentIndex, '');
      event.preventDefault();
    }
  }, [currentIndex, questionCount, setAnswer]);

  const handleCreate = useCallback(() => {
    const name = taskName.trim() || '未命名任务';
    const newTask = addTask({
      name,
      questionCount,
      answerKey
    });
    onCreated(newTask.id);
  }, [addTask, answerKey, onCreated, questionCount, taskName]);

  return (
    <Layout
      title="新建任务"
      action={
        <Button variant="secondary" onClick={onBack} style={{ padding: '8px' }}>
          <ChevronLeft size={20} />
        </Button>
      }
    >
      <Card>
        <div className={styles.sectionTitle}>任务信息</div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>任务名称</label>
          <input
            className={styles.textInput}
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="例如：A 卷"
          />
        </div>

        <div className={styles.sectionTitle}>题量设置</div>
        <div className={styles.countRow}>
          <div className={styles.countInfo}>
            <div className={styles.countLabel}>Question Count</div>
            <div className={styles.countValue}>{questionCount}</div>
          </div>
          <div className={styles.countControls}>
            <Button variant="secondary" onClick={() => setQuestionCount(clampQuestionCount(questionCount - 1))}>-</Button>
            <input
              className={styles.countInput}
              type="number"
              value={questionCount}
              min={10}
              max={75}
              onChange={(e) => setQuestionCount(clampQuestionCount(Number(e.target.value)))}
            />
            <Button variant="secondary" onClick={() => setQuestionCount(clampQuestionCount(questionCount + 1))}>+</Button>
          </div>
        </div>

        <div className={styles.progressRow}>
          <div className={styles.progressText}>已设置 {stats.configured} / {questionCount}</div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.round((stats.configured / Math.max(1, questionCount)) * 100)}%` }}
            />
          </div>
          <div className={styles.progressHint}>未设置 {stats.blank}</div>
        </div>
      </Card>

      <Card>
        <div className={styles.sectionTitle}>批量设置</div>
        <div className={styles.bulkRow}>
          <div className={styles.bulkInputs}>
            <input
              className={styles.rangeInput}
              type="number"
              min={1}
              max={questionCount}
              value={rangeStart}
              onChange={(e) => setRangeStart(Number(e.target.value))}
            />
            <span className={styles.rangeDivider}>-</span>
            <input
              className={styles.rangeInput}
              type="number"
              min={1}
              max={questionCount}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(Number(e.target.value))}
            />
            <select
              className={styles.rangeSelect}
              value={rangeValue}
              onChange={(e) => setRangeValue(e.target.value as 'A' | 'B' | 'C' | 'D' | '')}
            >
              <option value="">清空</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div className={styles.bulkActions}>
            <Button fullWidth onClick={applyRange}>应用区间</Button>
            <Button fullWidth variant="secondary" onClick={() => setAnswerKey(Array(100).fill(''))}>清空全部</Button>
          </div>
        </div>

        <div className={styles.sectionTitle}>粘贴答案</div>
        <div className={styles.pasteRow}>
          <div className={styles.pasteInputs}>
            <input
              className={styles.rangeInput}
              type="number"
              min={1}
              max={questionCount}
              value={pasteStart}
              onChange={(e) => setPasteStart(Number(e.target.value))}
            />
            <textarea
              className={styles.pasteArea}
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="请输入答案串，例如 ABCDABCD"
            />
          </div>
          <Button fullWidth onClick={applyPaste}>应用粘贴</Button>
        </div>
      </Card>

      <Card>
        <div className={styles.sectionTitle}>答案录入</div>
        <div className={styles.currentHint}>当前题号 {currentIndex + 1}</div>
        <div className={styles.answerGrid} tabIndex={0} onKeyDown={handleKeyDown}>
          {Array.from({ length: questionCount }).map((_, i) => (
            <div
              key={i}
              className={`${styles.questionRow} ${i === currentIndex ? styles.activeRow : ''}`}
              onClick={() => setCurrentIndex(i)}
            >
              <span className={styles.questionNum}>{i + 1}</span>
              <div className={styles.optionGroup}>
                {['A', 'B', 'C', 'D'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.optionButton} ${answerKey[i] === option ? styles.optionActive : ''}`}
                    onClick={() => {
                      setAnswer(i, option);
                      setCurrentIndex(Math.min(questionCount - 1, i + 1));
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className={styles.actions}>
        <Button fullWidth onClick={handleCreate}>保存任务</Button>
        <Button fullWidth variant="secondary" onClick={onBack}>取消</Button>
      </div>
    </Layout>
  );
};
