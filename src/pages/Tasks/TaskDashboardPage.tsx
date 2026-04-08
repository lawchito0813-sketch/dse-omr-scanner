import { Layout } from '../../components/Layout/Layout';
import { Card } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { ChevronLeft } from 'lucide-react';
import styles from './TaskDashboard.module.scss';
import type { TaskItem } from '../../store/useStore';

interface TaskDashboardPageProps {
  task: TaskItem;
  scannedCount: number;
  onBack: () => void;
  onStartScan: () => void;
  onViewSummary: () => void;
}

export const TaskDashboardPage = ({ task, scannedCount, onBack, onStartScan, onViewSummary }: TaskDashboardPageProps) => {
  return (
    <Layout
      title="任务工作台"
      action={
        <Button variant="secondary" onClick={onBack} style={{ padding: '8px' }}>
          <ChevronLeft size={20} />
        </Button>
      }
    >
      <Card>
        <div className={styles.taskHeader}>
          <div>
            <div className={styles.taskName}>{task.name}</div>
            <div className={styles.taskMeta}>题量 {task.questionCount}</div>
          </div>
          <div className={styles.taskMeta}>
            创建于 {new Date(task.createdAt).toLocaleDateString()}
          </div>
        </div>
      </Card>

      <Card>
        <div className={styles.sectionTitle}>扫描进度</div>
        <div className={styles.progressRow}>
          <div className={styles.progressLabel}>已扫描 {scannedCount} 人</div>
          <div className={styles.progressHint}>统计将在确认保存后更新</div>
        </div>
        <div className={styles.actions}>
          <Button fullWidth onClick={onStartScan}>开始扫描</Button>
          <Button fullWidth variant="secondary" onClick={onViewSummary}>查看汇总</Button>
        </div>
      </Card>
    </Layout>
  );
};
