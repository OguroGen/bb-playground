// BeadColumn.jsx — PixiJS v8推奨API版（ブリッジ無し／梁位置修正／高DPI対応）
import React, { useEffect, useMemo, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";

export default function BeadColumn({
  value = 0,
  onChange,
  width = 120,
  upperSize = 2,
  lowerSize = 5,
  upperHeight = 100,
  lowerHeight = 250,
  showTeiiten = false,
  beadColorUpper = 0xef4444,
  beadColorLower = 0xef4444,
  showCellBorder = false,
}) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const audioContextRef = useRef(null);

  const upperCellH = useMemo(() => upperHeight / upperSize, [upperHeight, upperSize]);
  const lowerCellH = useMemo(() => lowerHeight / lowerSize, [lowerHeight, lowerSize]);
  const colWidth = Math.max(upperCellH, lowerCellH);
  const hariH = Math.max(10, upperCellH * 0.6);

  const upperRadius = useMemo(() => upperCellH * 0.5, [upperCellH]);
  const lowerRadius = useMemo(() => lowerCellH * 0.5, [lowerCellH]);

  // Web Audio APIで音を生成する関数
  const playBeadSound = (type = 'bead') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'bead') {
        // 珠の音：明るいピンク音
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } else if (type === 'special') {
        // 特別な珠の音：キラキラ音
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.15);
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // エコー効果を追加
        setTimeout(() => {
          const echoOsc = audioContext.createOscillator();
          const echoGain = audioContext.createGain();
          echoOsc.connect(echoGain);
          echoGain.connect(audioContext.destination);
          
          echoOsc.frequency.setValueAtTime(1200, audioContext.currentTime);
          echoOsc.type = 'sine';
          echoGain.gain.setValueAtTime(0.1, audioContext.currentTime);
          echoGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          echoOsc.start(audioContext.currentTime);
          echoOsc.stop(audioContext.currentTime + 0.2);
        }, 100);
      }
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  };

  // valueから初期位置を計算
  const getInitialPositions = () => {
    const upperValue = value >= 5 ? 5 : 0;
    const lowerValue = value - upperValue;
    return {
      upperBlankIndex: upperValue === 5 ? 0 : 1,
      lowerBlankIndex: lowerValue,
    };
  };

  const { upperBlankIndex: initialUpperBlankIndex, lowerBlankIndex: initialLowerBlankIndex } = getInitialPositions();
  
  const upperBlankRef = useRef(initialUpperBlankIndex);
  const lowerBlankRef = useRef(initialLowerBlankIndex);

  const notifyValue = () => {
    const upperValue = upperBlankRef.current === 0 ? 5 : 0;
    const calculatedValue = upperValue + lowerBlankRef.current;
    if (onChange && calculatedValue !== value) {
      onChange(calculatedValue);
    }
  };

  const upperRowCenterY = (row) => row * upperCellH + upperCellH / 2;
  const lowerRowCenterY = (row) =>
    upperHeight + hariH + row * lowerCellH + lowerCellH / 2;
  const upperRectY = (row) => row * upperCellH;
  const lowerRectY = (row) => upperHeight + hariH + row * lowerCellH;

  // かわいい珠の描画関数（PixiJS形式）
  const drawCuteBead = (g, r, baseColor, isSpecial = false) => {
    g.clear();
    
    // 色を明るくしてかわいらしく
    const lighterColor = lightenColor(baseColor, 0.4);
    const darkerColor = darkenColor(baseColor, 0.3);
    
    // 影（下の方に暗い色）
    g.fill({ color: darkerColor, alpha: 0.3 })
      .circle(r * 0.1, r * 0.1, r * 0.9)
      .fill();
    
    // メインの珠
    g.fill({ color: baseColor })
      .circle(0, 0, r)
      .fill();
    
    // ハイライト（上の方に明るい色）
    g.fill({ color: lighterColor, alpha: 0.7 })
      .circle(-r * 0.3, -r * 0.3, r * 0.5)
      .fill();
    
    // 小さなキラキラ
    g.fill({ color: 0xffffff, alpha: 0.9 })
      .circle(-r * 0.2, -r * 0.4, r * 0.15)
      .fill();
    
    g.fill({ color: 0xffffff, alpha: 0.6 })
      .circle(r * 0.3, -r * 0.2, r * 0.1)
      .fill();
    
    // 特別な状態（梁にくっついている）の場合のシンプルなアウトライン
    if (isSpecial) {
      // 白いアウトライン
      g.stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
      g.circle(0, 0, r);
      g.stroke();
      
      // 追加の色付きアウトライン（1本だけ）
      g.stroke({ width: 2, color: 0x48dbfb, alpha: 0.6 });
      g.circle(0, 0, r + 4);
      g.stroke();
    }
  };

  // 色を明るくする関数
  const lightenColor = (color, factor) => {
    const r = (color >> 16) & 0xff;
    const gr = (color >> 8) & 0xff;
    const b = color & 0xff;
    
    const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
    const newG = Math.min(255, Math.floor(gr + (255 - gr) * factor));
    const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
    
    return (newR << 16) | (newG << 8) | newB;
  };

  // 色を暗くする関数
  const darkenColor = (color, factor) => {
    const r = (color >> 16) & 0xff;
    const gr = (color >> 8) & 0xff;
    const b = color & 0xff;
    
    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(gr * (1 - factor));
    const newB = Math.floor(b * (1 - factor));
    
    return (newR << 16) | (newG << 8) | newB;
  };

  // valueが変更されたときに位置を更新
  useEffect(() => {
    const { upperBlankIndex: newUpperBlank, lowerBlankIndex: newLowerBlank } = getInitialPositions();
    upperBlankRef.current = newUpperBlank;
    lowerBlankRef.current = newLowerBlank;
  }, [value]);

  useEffect(() => {
    let destroyed = false;

    (async () => {
      const app = new Application();
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
        width: colWidth,
        height: upperHeight + hariH + lowerHeight,
      });
      if (destroyed) return;
      appRef.current = app;
      hostRef.current.appendChild(app.canvas);

      const stage = app.stage;
      const gridLayer = new Container();
      const upperLayer = new Container();
      const hariLayer = new Container();
      const lowerLayer = new Container();
      stage.addChild(gridLayer, upperLayer, hariLayer, lowerLayer);
      [gridLayer, upperLayer, hariLayer, lowerLayer].forEach(
        (c) => (c.x = colWidth / 2)
      );

      // かわいい梁の描画
      hariLayer.y = upperHeight + hariH / 2;
      const hari = new Graphics();
      
      // 梁の影
      hari.fill({ color: 0x1a202c, alpha: 0.3 })
          .roundRect(-colWidth / 2 + 2, -hariH / 2 + 2, colWidth, hariH, 8)
          .fill();
      
      // 梁のメイン
      hari.fill({ color: 0x2d3748 })
          .roundRect(-colWidth / 2, -hariH / 2, colWidth, hariH, 8)
          .fill();
      
      // 梁のハイライト
      hari.fill({ color: 0x4a5568, alpha: 0.8 })
          .roundRect(-colWidth / 2, -hariH / 2, colWidth, hariH / 3, 8)
          .fill();
      
      hariLayer.addChild(hari);

      if (showTeiiten) {
        const dot = new Graphics();
        
        // 定位点の影
        dot.fill({ color: 0x92400e, alpha: 0.5 })
           .circle(1, 1, 7)
           .fill();
        
        // 定位点のメイン
        dot.fill({ color: 0xf59e0b })
           .circle(0, 0, 6)
           .fill();
        
        // 定位点のハイライト
        dot.fill({ color: 0xfbbf24, alpha: 0.8 })
           .circle(-2, -2, 3)
           .fill();
        
        // キラキラ
        dot.fill({ color: 0xffffff, alpha: 0.9 })
           .circle(-1, -2, 1.5)
           .fill();
        
        hariLayer.addChild(dot);
      }

      if (showCellBorder) {
        const grid = new Graphics();
        grid.stroke({ width: 1, color: 0x94a3b8, alpha: 0.3 });
        for (let r = 0; r < upperSize; r++)
          grid.rect(-colWidth / 2, upperRectY(r), colWidth, upperCellH);
        grid.stroke({ width: 2, color: 0x334155, alpha: 0.5 });
        grid.rect(-colWidth / 2, upperHeight, colWidth, hariH);
        grid.stroke({ width: 1, color: 0x94a3b8, alpha: 0.3 });
        for (let r = 0; r < lowerSize; r++)
          grid.rect(-colWidth / 2, lowerRectY(r), colWidth, lowerCellH);
        gridLayer.addChild(grid);
      }

      const upperBead = new Graphics();
      upperBead.x = 0;
      upperBead.y = upperRowCenterY(upperBlankRef.current === 0 ? 1 : 0);
      drawCuteBead(upperBead, upperRadius, beadColorUpper);
      upperLayer.addChild(upperBead);

      const redrawUpperBead = (stickHari) => {
        drawCuteBead(upperBead, upperRadius, beadColorUpper, stickHari);
      };

      const beadCount = lowerSize - 1;
      const lowerBeads = Array.from({ length: beadCount }).map(() => {
        const g = new Graphics();
        g.x = 0;
        g.y = lowerRowCenterY(0);
        drawCuteBead(g, lowerRadius, beadColorLower);
        lowerLayer.addChild(g);
        return g;
      });

      const makeHitRect = (x, y, w, h, onPointer) => {
        const r = new Graphics();
        r.fill({ color: 0x000000, alpha: 0.001 }).rect(x, y, w, h).fill();
        r.eventMode = "static";
        r.cursor = "pointer";
        r.on("pointerdown", onPointer);
        return r;
      };
      
      const upperHits = new Container();
      upperLayer.addChild(upperHits);
      for (let r = 0; r < upperSize; r++) {
        upperHits.addChild(
          makeHitRect(-colWidth / 2, upperRectY(r), colWidth, upperCellH, () => {
            if (r !== upperBlankRef.current) {
              upperBlankRef.current = r;
              
              // 上段の珠が梁にくっつく場合は特別な音
              const willStickToHari = r === 0;
              playBeadSound(willStickToHari ? 'special' : 'bead');
              
              notifyValue();
            }
          })
        );
      }
      const lowerHits = new Container();
      lowerLayer.addChild(lowerHits);
      for (let r = 0; r < lowerSize; r++) {
        lowerHits.addChild(
          makeHitRect(-colWidth / 2, lowerRectY(r), colWidth, lowerCellH, () => {
            if (r !== lowerBlankRef.current) {
              lowerBlankRef.current = r;
              
              // 下段で梁にくっつく珠の場合は特別な音
              const willStickToHari = r < lowerBlankRef.current;
              playBeadSound(willStickToHari ? 'special' : 'bead');
              
              notifyValue();
            }
          })
        );
      }

      const springK = 0.18;
      const damping = 0.78;
      let vyUpper = 0;
      const vyLower = lowerBeads.map(() => 0);
      const rowsWithoutBlank = () => {
        const rows = [];
        for (let r = 0; r < lowerSize; r++)
          if (r !== lowerBlankRef.current) rows.push(r);
        return rows;
      };

      app.ticker.add(() => {
        const upperTargetRow = upperBlankRef.current === 0 ? 1 : 0;
        const yTargetUpper = upperRowCenterY(upperTargetRow);
        const dyU = yTargetUpper - upperBead.y;
        vyUpper = vyUpper * damping + dyU * springK;
        upperBead.y += vyUpper;
        const stickHari = upperTargetRow === 1;
        redrawUpperBead(stickHari);

        const rows = rowsWithoutBlank();
        for (let i = 0; i < lowerBeads.length; i++) {
          const bead = lowerBeads[i];
          const yTarget = lowerRowCenterY(rows[i]);
          const dy = yTarget - bead.y;
          vyLower[i] = vyLower[i] * damping + dy * springK;
          bead.y += vyLower[i];
          
          // 下段のビーズが梁にくっついているかどうかを判定
          // ブランクより上の行（小さい行番号）にあるビーズが梁にくっついている
          const isStickingToHari = rows[i] < lowerBlankRef.current;
          
          // 隣接する珠の判定（スケール効果用）
          const touching = Math.abs(rows[i] - lowerBlankRef.current) === 1;
          
          // かわいいスケール効果
          const scaleX = touching ? 1.1 : 1.0;
          const scaleY = touching ? 0.9 : 1.0;
          bead.scale.set(scaleX, scaleY);
          
          // 触れている珠は少し回転
          if (touching) {
            bead.rotation = Math.sin(Date.now() * 0.008) * 0.08;
          } else {
            bead.rotation = 0;
          }
          
          // 下段で梁にくっついているBeadにだけアウトライン効果を適用
          drawCuteBead(bead, lowerRadius, beadColorLower, isStickingToHari);
        }
      });

      notifyValue();

      const resize = () => {
        const hostW = hostRef.current?.clientWidth || width;
        const logW = colWidth;
        const logH = upperHeight + hariH + lowerHeight;
        const aspect = logH / logW;
        const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        const scale = hostW / logW;
        app.canvas.style.width = `${hostW}px`;
        app.canvas.style.height = `${hostW * aspect}px`;
        app.stage.scale.set(scale);
        app.renderer.resolution = dpr;
        app.renderer.resize(
          Math.round(logW * scale * dpr),
          Math.round(logH * scale * dpr)
        );
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(hostRef.current);
      window.addEventListener("resize", resize);

      return () => {
        window.removeEventListener("resize", resize);
        ro.disconnect();
        app.destroy();
      };
    })();

    return () => {
      destroyed = true;
      if (appRef.current && !appRef.current.destroyed) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, [
    colWidth,
    upperHeight,
    lowerHeight,
    upperCellH,
    lowerCellH,
    upperRadius,
    lowerRadius,
    hariH,
    beadColorUpper,
    beadColorLower,
    showTeiiten,
    width,
    showCellBorder,
  ]);

  return <div ref={hostRef} style={{ width, display: "inline-block" }} />;
}