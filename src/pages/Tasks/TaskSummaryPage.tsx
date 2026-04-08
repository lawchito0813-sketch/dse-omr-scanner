import { useMemo, useState } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { Card } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { ChevronLeft } from 'lucide-react';
import styles from './TaskSummary.module.scss';
import type { TaskItem, TaskRecord } from '../../store/useStore';

interface TaskSummaryPageProps {
  task: TaskItem;
  records: TaskRecord[];
  onBack: () => void;
}

export const TaskSummaryPage = ({ task, records, onBack }: TaskSummaryPageProps) => {
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const questionStats = useMemo(() => {
    return Array.from({ length: task.questionCount }).map((_, index) => {
      const correctAnswer = task.answerKey[index] || '';
      let countA = 0;
      let countB = 0;
      let countC = 0;
      let countD = 0;
      let correct = 0;
      let incorrect = 0;
      let blank = 0;
      let multi = 0;
      records.forEach((record) => {
        const value = record.correctedAnswers[index] || '';
        if (!correctAnswer) {
          return;
        }
        if (!value) {
          blank += 1;
        } else if (value === 'MULTI') {
          multi += 1;
        } else if (value === 'A') {
          countA += 1;
        } else if (value === 'B') {
          countB += 1;
        } else if (value === 'C') {
          countC += 1;
        } else if (value === 'D') {
          countD += 1;
        } else if (value === correctAnswer) {
          correct += 1;
        } else {
          incorrect += 1;
        }
      });
      correct = correctAnswer ? (correctAnswer === 'A' ? countA : correctAnswer === 'B' ? countB : correctAnswer === 'C' ? countC : countD) : 0;
      incorrect = countA + countB + countC + countD - correct;
      const total = correct + incorrect + blank + multi;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const ratio = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
      return {
        index,
        correctAnswer,
        correct,
        incorrect,
        blank,
        multi,
        countA,
        countB,
        countC,
        countD,
        total,
        accuracy,
        ratioA: ratio(countA),
        ratioB: ratio(countB),
        ratioC: ratio(countC),
        ratioD: ratio(countD),
        ratioBlank: ratio(blank),
        ratioMulti: ratio(multi)
      };
    });
  }, [records, task.answerKey, task.questionCount]);

  const studentStats = useMemo(() => {
    return records.map((record, index) => {
      const accuracy = record.total > 0 ? Math.round((record.score / record.total) * 100) : 0;
      const wrongQuestions: number[] = [];
      for (let i = 0; i < task.questionCount; i += 1) {
        const correct = task.answerKey[i] || '';
        if (!correct) {
          continue;
        }
        const value = record.correctedAnswers[i] || '';
        if (value !== correct) {
          wrongQuestions.push(i + 1);
        }
      }
      return {
        id: record.id,
        index,
        score: record.score,
        total: record.total,
        accuracy,
        createdAt: record.createdAt,
        wrongQuestions
      };
    });
  }, [records, task.answerKey, task.questionCount]);

  const overall = useMemo(() => {
    if (records.length === 0) {
      return { averageScore: 0, averageAccuracy: 0 };
    }
    const totalScore = records.reduce((sum, record) => sum + record.score, 0);
    const totalPossible = records.reduce((sum, record) => sum + record.total, 0);
    const averageAccuracy = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    const averageScore = Math.round(totalScore / records.length);
    return { averageScore, averageAccuracy };
  }, [records]);

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Layout
      title="任务汇总"
      action={
        <Button variant="secondary" onClick={onBack} style={{ padding: '8px' }}>
          <ChevronLeft size={20} />
        </Button>
      }
    >
      <Card>
        <div className={styles.header}>
          <div>
            <div className={styles.taskName}>{task.name}</div>
            <div className={styles.taskMeta}>题量 {task.questionCount} · 已扫描 {records.length} 人</div>
          </div>
          <div className={styles.overall}>
            <div className={styles.overallValue}>{overall.averageAccuracy}%</div>
            <div className={styles.overallLabel}>平均正确率</div>
          </div>
        </div>
        <div className={styles.overallMeta}>平均得分 {overall.averageScore}</div>
      </Card>

      <Card>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>题目统计</div>
            <div className={styles.sectionSubtitle}>每题正确率与分布</div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const rows = [
                ['题号', '标准答案', '正确率', '正确', '错误', 'A%', 'B%', 'C%', 'D%', '空白%', '多选%', '未作答', '多选', '总数']
              ];
              questionStats.forEach((stat) => {
                rows.push([
                  `${stat.index + 1}`,
                  stat.correctAnswer || '-',
                  `${stat.accuracy}%`,
                  `${stat.correct}`,
                  `${stat.incorrect}`,
                  `${stat.ratioA}%`,
                  `${stat.ratioB}%`,
                  `${stat.ratioC}%`,
                  `${stat.ratioD}%`,
                  `${stat.ratioBlank}%`,
                  `${stat.ratioMulti}%`,
                  `${stat.blank}`,
                  `${stat.multi}`,
                  `${stat.total}`
                ]);
              });
              downloadCsv(`${task.name}-question-summary.csv`, rows);
            }}
          >
            导出题目统计
          </Button>
        </div>
        <div className={styles.table}>
          {questionStats.map((stat) => (
            <div key={stat.index} className={styles.tableRow}>
              <div className={styles.tableLeft}>
                <div className={styles.tableTitle}>第 {stat.index + 1} 题</div>
                <div className={styles.tableSubtitle}>标准答案 {stat.correctAnswer || '-'}</div>
              </div>
              <div className={styles.tableRight}>
                <div className={styles.tableAccuracy}>{stat.accuracy}%</div>
                <div className={styles.tableMeta}>
                  正确 {stat.correct} / 错误 {stat.incorrect} / 未作答 {stat.blank} / 多选 {stat.multi}
                </div>
                <div className={styles.tableMeta}>
                  A {stat.ratioA}% / B {stat.ratioB}% / C {stat.ratioC}% / D {stat.ratioD}% / 空白 {stat.ratioBlank}% / 多选 {stat.ratioMulti}%
                </div>
                <div className={styles.distribution}>
                  <div className={styles.segmentA} style={{ width: `${stat.ratioA}%` }} />
                  <div className={styles.segmentB} style={{ width: `${stat.ratioB}%` }} />
                  <div className={styles.segmentC} style={{ width: `${stat.ratioC}%` }} />
                  <div className={styles.segmentD} style={{ width: `${stat.ratioD}%` }} />
                  <div className={styles.segmentBlank} style={{ width: `${stat.ratioBlank}%` }} />
                  <div className={styles.segmentMulti} style={{ width: `${stat.ratioMulti}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>学生统计</div>
            <div className={styles.sectionSubtitle}>每位学生的得分与正确率</div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const rows = [
                ['序号', '得分', '总分', '正确率', '扫描时间']
              ];
              studentStats.forEach((stat) => {
                rows.push([
                  `${stat.index + 1}`,
                  `${stat.score}`,
                  `${stat.total}`,
                  `${stat.accuracy}%`,
                  new Date(stat.createdAt).toLocaleString()
                ]);
              });
              downloadCsv(`${task.name}-student-summary.csv`, rows);
            }}
          >
            导出学生统计
          </Button>
        </div>
        <div className={styles.table}>
          {studentStats.map((stat) => {
            const isExpanded = expandedRecordId === stat.id;
            const wrongText = stat.wrongQuestions.length > 0 ? stat.wrongQuestions.join('、') : '无错题';
            return (
              <div key={stat.id} className={styles.studentCard}>
                <div
                  className={styles.tableRow}
                  onClick={() => setExpandedRecordId(isExpanded ? null : stat.id)}
                >
                  <div className={styles.tableLeft}>
                    <div className={styles.tableTitle}>学生 {stat.index + 1}</div>
                    <div className={styles.tableSubtitle}>扫描于 {new Date(stat.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={styles.tableRight}>
                    <div className={styles.tableAccuracy}>{stat.accuracy}%</div>
                    <div className={styles.tableMeta}>得分 {stat.score} / {stat.total}</div>
                  </div>
                </div>
                {isExpanded && (
                  <div className={styles.studentDetail}>
                    <div className={styles.detailLabel}>错题题号</div>
                    <div className={styles.detailValue}>{wrongText}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Layout>
  );
};
