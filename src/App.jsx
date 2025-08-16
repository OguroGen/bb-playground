import React, { useState, useCallback, useRef } from "react";
import BeadColumn from "./components/BeadColumn";
import "./styles.css";

const DIGIT_CONFIGS = [
  {
    position: "hundreds",
    colors: { upper: 0x3b82f6, lower: 0x3b82f6 }, // 青で統一
    beamColor: 0xffd700, // 金色の梁
  },
  {
    position: "tens", 
    colors: { upper: 0xfbbf24, lower: 0xfbbf24 }, // 黄色で統一
    beamColor: 0xffd700, // 金色の梁
  },
  {
    position: "ones",
    colors: { upper: 0xef4444, lower: 0xef4444 }, // 赤で統一
    beamColor: 0xffd700, // 金色の梁
    showTeiiten: true,
  }
];

export default function App() {
  const [values, setValues] = useState([0, 0, 0]);
  const [practiceMode, setPracticeMode] = useState(false);
  const [targetValue, setTargetValue] = useState(null);
  const [score, setScore] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const audioContextRef = useRef(null);
  
  const total = values[0] * 100 + values[1] * 10 + values[2];

  // リセット音を再生
  const playResetSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // 下降する音階でリセット感を演出
      const frequencies = [800, 600, 450, 300];
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          oscillator.type = 'triangle';
          
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }, index * 100);
      });
      
      // 最後にキラキラ音
      setTimeout(() => {
        const sparkle = audioContext.createOscillator();
        const sparkleGain = audioContext.createGain();
        
        sparkle.connect(sparkleGain);
        sparkleGain.connect(audioContext.destination);
        
        sparkle.frequency.setValueAtTime(1200, audioContext.currentTime);
        sparkle.frequency.exponentialRampToValueAtTime(1800, audioContext.currentTime + 0.4);
        sparkle.type = 'sine';
        
        sparkleGain.gain.setValueAtTime(0.15, audioContext.currentTime);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        sparkle.start(audioContext.currentTime);
        sparkle.stop(audioContext.currentTime + 0.4);
      }, 400);
      
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  };

  // 新しい問題を生成
  const generateNewProblem = useCallback(() => {
    const newTarget = Math.floor(Math.random() * 10); // 0-9の問題
    setTargetValue(newTarget);
    setProblemCount(prev => prev + 1);
    
    // 一の位の珠をリセット（問題対象なので）
    setValues(prev => [prev[0], prev[1], 0]);
  }, []);

  // 練習モードの開始
  const startPractice = useCallback(() => {
    setPracticeMode(true);
    setScore(0);
    setProblemCount(0);
    generateNewProblem();
  }, [generateNewProblem]);

  // 練習モードの終了
  const stopPractice = useCallback(() => {
    setPracticeMode(false);
    setTargetValue(null);
  }, []);

  // 正解時の処理
  const handleCorrect = useCallback((value) => {
    setScore(prev => prev + 1);
    
    // 少し待ってから次の問題
    setTimeout(() => {
      generateNewProblem();
    }, 1500);
  }, [generateNewProblem]);

  // 不正解時の処理（特に何もしない、フィードバック用）
  const handleIncorrect = useCallback((value) => {
    // console.log(`現在の値: ${value}, 目標: ${targetValue}`);
  }, [targetValue]);

  const handleValueChange = useCallback((digitIndex, newValue) => {
    setValues(prevValues => {
      const updated = [...prevValues];
      updated[digitIndex] = newValue;
      return updated;
    });
  }, []);

  const resetAll = useCallback(() => {
    setValues([0, 0, 0]);
    playResetSound();
    
    // 練習モードの場合は新しい問題を生成
    if (practiceMode) {
      setTimeout(() => {
        generateNewProblem();
      }, 1000);
    }
  }, [practiceMode, generateNewProblem]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>BeadBoost</h1>
        <div className="subtitle">デジタル計算練習ツール</div>
        
        <div className="control-buttons">
          <button className="reset-button" onClick={resetAll}>
            リセット
          </button>
          
          {!practiceMode ? (
            <button className="practice-button" onClick={startPractice}>
              練習開始
            </button>
          ) : (
            <button className="stop-practice-button" onClick={stopPractice}>
              練習終了
            </button>
          )}
        </div>
      </header>

      {practiceMode && (
        <div className="practice-info">
          <div className="problem">
            <span className="problem-label">問題:</span>
            <span className="problem-number">{targetValue}</span>
            <span className="problem-text">を作ってください</span>
          </div>
          <div className="score">
            <span className="score-label">正解数:</span>
            <span className="score-number">{score}</span>
            <span className="score-total">/ {problemCount}</span>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="bead-container">
          {DIGIT_CONFIGS.map((config, index) => (
            <div key={config.position} className="bead-column">
              <BeadColumn
                width={100}
                upperHeight={100}
                lowerHeight={250}
                beadColorUpper={config.colors.upper}
                beadColorLower={config.colors.lower}
                beamColor={config.beamColor}
                showTeiiten={config.showTeiiten}
                value={values[index]}
                onChange={(newValue) => handleValueChange(index, newValue)}
                // 練習モードでは一の位のみ正解判定
                targetValue={practiceMode && index === 2 ? targetValue : null}
                onCorrect={handleCorrect}
                onIncorrect={handleIncorrect}
              />
            </div>
          ))}
        </div>

        <div className="total-display">
          <span className="total-label">合計</span>
          <span className="total-value">{total.toLocaleString()}</span>
        </div>
      </main>
    </div>
  );
}