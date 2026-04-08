import { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { Card } from './components/Card/Card';
import { Button } from './components/Button/Button';
import { generateAnswerSheet, generateScanOnlySheet } from './services/pdfGenerator';
import { Scanner } from './pages/Scanner/Scanner';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { ResultsPage } from './pages/Results/ResultsPage';
import { TaskListPage } from './pages/Tasks/TaskListPage';
import { TaskCreatePage } from './pages/Tasks/TaskCreatePage';
import { TaskDashboardPage } from './pages/Tasks/TaskDashboardPage';
import { TaskSummaryPage } from './pages/Tasks/TaskSummaryPage';
import { Scan, FileDown, Settings } from 'lucide-react';
import { useStore } from './store/useStore';

function App() {
  const { questionCount, setQuestionCount, tasks, records, addRecord } = useStore();
  const [view, setView] = useState<'home' | 'scanner' | 'settings' | 'results' | 'task-list' | 'task-create' | 'task-dashboard' | 'task-summary'>('home');
  const [scanResult, setScanResult] = useState<{ answers: string[]; correctAnswers: string[]; questionCount: number; previewImage: string; layoutVariant: 'legacy' | 'gapped' } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : null;

  if (view === 'scanner') {
    return (
      <Scanner
        onBack={() => setView(activeTask ? 'task-dashboard' : 'home')}
        onComplete={(result) => {
          setScanResult(result);
          setView('results');
        }}
        questionCount={activeTask?.questionCount}
        correctAnswers={activeTask?.answerKey}
      />
    );
  }
  
  if (view === 'settings') {
    return <SettingsPage onBack={() => setView('home')} />;
  }

  if (view === 'task-list') {
    return (
      <TaskListPage
        tasks={tasks}
        onBack={() => setView('home')}
        onCreate={() => setView('task-create')}
        onSelect={(taskId) => {
          setActiveTaskId(taskId);
          setView('task-dashboard');
        }}
      />
    );
  }

  if (view === 'task-create') {
    return (
      <TaskCreatePage
        onBack={() => setView('task-list')}
        onCreated={(taskId) => {
          setActiveTaskId(taskId);
          setView('task-dashboard');
        }}
      />
    );
  }

  if (view === 'task-dashboard' && activeTask) {
    const scannedCount = records.filter((record) => record.taskId === activeTask.id).length;
    return (
      <TaskDashboardPage
        task={activeTask}
        scannedCount={scannedCount}
        onBack={() => setView('task-list')}
        onStartScan={() => setView('scanner')}
        onViewSummary={() => setView('task-summary')}
      />
    );
  }

  if (view === 'task-summary' && activeTask) {
    const taskRecords = records.filter((record) => record.taskId === activeTask.id);
    return (
      <TaskSummaryPage
        task={activeTask}
        records={taskRecords}
        onBack={() => setView('task-dashboard')}
      />
    );
  }

  if (view === 'results' && scanResult) {
    return (
      <ResultsPage
        result={scanResult}
        editable={!!activeTask}
        onConfirm={activeTask ? ({ correctedAnswers, score, total }) => {
          addRecord({
            taskId: activeTask.id,
            answers: scanResult.answers,
            correctedAnswers,
            previewImage: scanResult.previewImage,
            score,
            total
          });
          setView('task-dashboard');
        } : undefined}
        onBack={() => setView(activeTask ? 'task-dashboard' : 'home')}
        onRescan={() => setView('scanner')}
      />
    );
  }

  return (
    <Layout title="DSE Scanner">
      <Card>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Generate Answer Sheet</h2>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Question Count: {questionCount}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              variant="secondary" 
              onClick={() => setQuestionCount(Math.max(10, questionCount - 5))}
            >-</Button>
            <Button 
              variant="secondary" 
              onClick={() => setQuestionCount(Math.min(75, questionCount + 5))}
            >+</Button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <Button 
            fullWidth 
            icon={<FileDown size={18} />} 
            onClick={() => generateAnswerSheet(questionCount)}
          >
            Download PDF Template
          </Button>
          <Button 
            fullWidth 
            variant="secondary"
            icon={<FileDown size={18} />} 
            onClick={() => generateScanOnlySheet()}
          >
            Download Scan-only PDF
          </Button>
        </div>
      </Card>

      <Card>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Scan Answer Sheet</h2>
        <p style={{ color: 'var(--ios-text-secondary)', marginBottom: '24px' }}>
          Use your camera to scan the printed answer sheet. Ensure good lighting and include all four corner markers.
        </p>
        <Button fullWidth icon={<Scan size={18} />} onClick={() => {
          setActiveTaskId(null);
          setView('scanner');
        }}>
          Start Scanner
        </Button>
      </Card>
      
      <Card>
         <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Settings</h2>
         <Button fullWidth variant="secondary" icon={<Settings size={18} />} onClick={() => setView('settings')}>
            Configure Answers
         </Button>
      </Card>

      <Card>
         <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Tasks</h2>
         <Button fullWidth variant="secondary" onClick={() => setView('task-list')}>
            Manage Tasks
         </Button>
      </Card>
    </Layout>
  );
}

export default App;
