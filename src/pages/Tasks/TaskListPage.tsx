import { Layout } from '../../components/Layout/Layout';
import { Card } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { ChevronLeft } from 'lucide-react';
import styles from './TaskList.module.scss';
import type { TaskItem } from '../../store/useStore';

interface TaskListPageProps {
  tasks: TaskItem[];
  onBack: () => void;
  onCreate: () => void;
  onSelect: (taskId: string) => void;
}

export const TaskListPage = ({ tasks, onBack, onCreate, onSelect }: TaskListPageProps) => {
  return (
    <Layout
      title="任务列表"
      action={
        <Button variant="secondary" onClick={onBack} style={{ padding: '8px' }}>
          <ChevronLeft size={20} />
        </Button>
      }
    >
      {tasks.length === 0 ? (
        <Card>
          <div className={styles.emptyTitle}>暂无任务</div>
          <div className={styles.emptySubtitle}>请先新建一个任务</div>
          <Button fullWidth onClick={onCreate}>
            新建任务
          </Button>
        </Card>
      ) : (
        <div className={styles.list}>
          {tasks.map((task) => (
            <Card key={task.id} className={styles.taskCard}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.taskName}>{task.name}</div>
                  <div className={styles.taskMeta}>
                    题量 {task.questionCount} · 创建于 {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => onSelect(task.id)}>
                  进入任务
                </Button>
              </div>
            </Card>
          ))}
          <Button fullWidth onClick={onCreate}>
            新建任务
          </Button>
        </div>
      )}
    </Layout>
  );
};
