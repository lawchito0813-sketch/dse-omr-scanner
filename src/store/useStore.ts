import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TaskItem {
  id: string;
  name: string;
  questionCount: number;
  answerKey: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TaskRecord {
  id: string;
  taskId: string;
  answers: string[];
  correctedAnswers: string[];
  previewImage: string;
  score: number;
  total: number;
  createdAt: number;
}

interface AppState {
  questionCount: number;
  answers: string[];
  tasks: TaskItem[];
  records: TaskRecord[];
  setQuestionCount: (count: number) => void;
  setAnswer: (index: number, value: string) => void;
  resetAnswers: () => void;
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => TaskItem;
  addRecord: (record: Omit<TaskRecord, 'id' | 'createdAt'>) => TaskRecord;
}

const MAX_RECORDS = 50;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      questionCount: 45,
      answers: Array(100).fill(''), // Always initialize 100 slots
      tasks: [],
      records: [],
      
      setQuestionCount: (count) => {
        set({ questionCount: count });
        // Optionally resize answers array if needed, but keeping 100 is safer
      },
      
      setAnswer: (index, value) => {
        const newAnswers = [...get().answers];
        newAnswers[index] = value;
        set({ answers: newAnswers });
      },

      resetAnswers: () => {
        set({ answers: Array(100).fill('') });
      },
      addTask: (task) => {
        const newTask: TaskItem = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: task.name,
          questionCount: task.questionCount,
          answerKey: task.answerKey,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        set({ tasks: [...get().tasks, newTask] });
        return newTask;
      },
      addRecord: (record) => {
        const newRecord: TaskRecord = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          taskId: record.taskId,
          answers: record.answers,
          correctedAnswers: record.correctedAnswers,
          previewImage: record.previewImage,
          score: record.score,
          total: record.total,
          createdAt: Date.now()
        };
        const nextRecords = [...get().records, newRecord].slice(-MAX_RECORDS);
        set({ records: nextRecords });
        return newRecord;
      }
    }),
    {
      name: 'dse-scanner-storage',
      partialize: (state) => ({
        questionCount: state.questionCount,
        answers: state.answers,
        tasks: state.tasks,
        records: state.records.map((record) => ({
          ...record,
          previewImage: ''
        }))
      })
    }
  )
);
