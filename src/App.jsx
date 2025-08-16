import React, { useState, useCallback, useRef } from "react";
import BeadColumn from "./components/BeadColumn";
import "./styles.css";

const DIGIT_CONFIGS = [
  {
    position: "hundreds",
    colors: { upper: 0x3b82f6, lower: 0x3b82f6 }, // 青で統一
    outlineColor: 0xffd700, // 金色の梁とアウトライン
  },
  {
    position: "tens", 
    colors: { upper: 0xfbbf24, lower: 0xfbbf24 }, // 黄色で統一
    outlineColor: 0xffd700, // 金色の梁とアウトライン
  },
  {
    position: "ones",
    colors: { upper: 0xef4444, lower: 0xef4444 }, // 赤で統一
    outlineColor: 0xffd700, // 金色の梁とアウトライン
    showTeiiten: true,
  }
];

export default function App() {
  const [values, setValues] = useState([0, 0, 0]);
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
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>BeadBoost</h1>
        <div className="subtitle">デジタル計算練習ツール</div>
        <button className="reset-button" onClick={resetAll}>
          リセット
        </button>
      </header>

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
                outlineColor={config.outlineColor}
                showTeiiten={config.showTeiiten}
                value={values[index]}
                onChange={(newValue) => handleValueChange(index, newValue)}
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