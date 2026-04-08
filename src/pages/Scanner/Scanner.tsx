import { useCallback, useEffect, useRef, useState } from 'react';
import { loadOpenCv } from '../../services/opencvService';
import { processOMR } from '../../services/omrEngine';
import { Button } from '../../components/Button/Button';
import styles from './Scanner.module.scss';
import { Upload, ChevronLeft, Loader2, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface ScannerProps {
  onBack: () => void;
  onComplete: (result: { answers: string[]; correctAnswers: string[]; questionCount: number; previewImage: string; layoutVariant: 'legacy' | 'gapped' }) => void;
  questionCount?: number;
  correctAnswers?: string[];
}

export const Scanner = ({ onBack, onComplete, questionCount: questionCountOverride, correctAnswers: correctAnswersOverride }: ScannerProps) => {
  const [isCvReady, setIsCvReady] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { questionCount: storeQuestionCount, answers: storeAnswers } = useStore();
  const questionCount = questionCountOverride ?? storeQuestionCount;
  const correctAnswers = correctAnswersOverride ?? storeAnswers;
  
  useEffect(() => {
    loadOpenCv()
      .then(() => setIsCvReady(true))
      .catch((err) => console.error(err));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
           setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = useCallback((canvas: HTMLCanvasElement) => {
    if (!window.cv) {
      console.error("OpenCV not loaded");
      return;
    }
    
    const cv = window.cv;
    const src = cv.imread(canvas);
    
    try {
      const { success, answers, layoutVariant } = processOMR(src, canvas, questionCount, correctAnswers);
      if (!success) {
          const ctx = canvas.getContext('2d');
          if(ctx) {
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 5;
              ctx.strokeRect(0, 0, canvas.width, canvas.height);
              alert("Could not detect answer sheet. Please ensure:\n1. All 4 black corner markers are visible\n2. The background is dark/contrasting\n3. The paper is flat");
          }
      } else if (answers && layoutVariant) {
          const previewImage = canvas.toDataURL('image/png');
          onComplete({ answers, correctAnswers, questionCount, previewImage, layoutVariant });
      }
    } catch (e) {
      console.error("OMR Error:", e);
    }
    
    src.delete();
  }, [correctAnswers, onComplete, questionCount]);

  useEffect(() => {
    if (imageSrc && canvasRef.current && isCvReady) {
      const img = new Image();
      img.onload = () => {
        setIsProcessing(true);
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        
        const MAX_WIDTH = 1024; 
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        setTimeout(() => {
          try {
             processImage(canvas);
          } catch (e) {
             console.error("OpenCV Error:", e);
             alert("Failed to process image. Please try again.");
          }
          setIsProcessing(false);
        }, 100);
      };
      img.src = imageSrc;
    }
  }, [imageSrc, isCvReady, processImage]);

  return (
    <div className={styles.scanner}>
       <div className={styles.toolbar}>
         <Button onClick={onBack} variant="secondary" style={{ padding: '8px', color: 'white', background: 'rgba(255,255,255,0.2)' }}>
           <ChevronLeft size={24} />
         </Button>
         <span style={{ fontWeight: 600 }}>Scanner</span>
         <div style={{ width: 40 }} /> {/* Spacer */}
       </div>
       
       <div className={styles.previewArea}>
         {!imageSrc && (
            <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
               {isCvReady ? 'Ready to scan' : 'Loading OpenCV engine...'}
            </div>
         )}
         <canvas ref={canvasRef} style={{ display: imageSrc ? 'block' : 'none' }} />
         
         {isProcessing && (
            <div className={styles.status}>
              <Loader2 className="animate-spin" size={20} style={{ display: 'inline', marginRight: 8 }} />
              Processing...
            </div>
         )}
         
       </div>
       
       <div className={styles.controls}>
         <div className={styles.uploadButton}>
            <Button fullWidth icon={<Upload size={20} />} disabled={!isCvReady}>
               {imageSrc ? 'Select Another Photo' : 'Upload / Take Photo'}
            </Button>
            <input 
               type="file" 
               accept="image/*" 
               capture="environment"
               onChange={handleImageUpload}
               disabled={!isCvReady}
            />
         </div>
         {imageSrc && (
            <Button 
               fullWidth 
               variant="secondary" 
               icon={<RefreshCw size={20} />}
               onClick={() => {
                   setImageSrc(null);
               }}
            >
               Reset
            </Button>
         )}
       </div>
    </div>
  );
};
