// BeadColumn.jsx — PixiJS v8推奨API版（ブリッジ無し／梁位置修正／高DPI対応）
import React, { useEffect, useMemo, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";

// そろばんの構造定数（変更不可）
const UPPER_SIZE = 2; // 上段の行数（五珠1個+空白1行）
const LOWER_SIZE = 5; // 下段の行数（一珠4個+空白1行）

export default function BeadColumn({
  value = 0,
  onChange,
  width = 120,
  upperHeight = 100,
  lowerHeight = 250,
  showTeiiten = false,
  beadColorUpper = 0xef4444,
  beadColorLower = 0xef4444,
  showCellBorder = false,
  beamColor = 0x2d3748, // 梁の色（アウトラインもこの色に合わせる）
  // 正解判定関連のparams（将来用）
  targetValue = null, // 正解の値（nullの場合は練習モードではない）
  onCorrect = null, // 正解時のコールバック
  onIncorrect = null, // 不正解時のコールバック
}) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const audioContextRef = useRef(null);

  const upperCellH = useMemo(() => upperHeight / UPPER_SIZE, [upperHeight]);
  const lowerCellH = useMemo(() => lowerHeight / LOWER_SIZE, [lowerHeight]);
  // シンプルにコンテナの幅を使用
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
        // 珠の音：控えめで大人しい音（梁から離れる時）
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.08);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      } else if (type === 'correct') {
        // 正解音：明るくて心地よいファンファーレ音
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (メジャーコード)
        
        frequencies.forEach((freq, index) => {
          setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.setValueAtTime(freq, audioContext.currentTime);
            osc.type = 'triangle';
            
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.3);
          }, index * 80); // 少しずつずらして和音を作る
        });
        
        // 最後に高音のキラキラ音を追加
        setTimeout(() => {
          const sparkle = audioContext.createOscillator();
          const sparkleGain = audioContext.createGain();
          
          sparkle.connect(sparkleGain);
          sparkleGain.connect(audioContext.destination);
          
          sparkle.frequency.setValueAtTime(1760, audioContext.currentTime); // A6
          sparkle.frequency.exponentialRampToValueAtTime(2093, audioContext.currentTime + 0.2); // C7
          sparkle.type = 'sine';
          
          sparkleGain.gain.setValueAtTime(0.15, audioContext.currentTime);
          sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          
          sparkle.start(audioContext.currentTime);
          sparkle.stop(audioContext.currentTime + 0.4);
        }, 240);
        
        return; // 以下の処理をスキップ
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
    
    // 値が変わった場合のみ処理
    if (onChange && calculatedValue !== value) {
      onChange(calculatedValue);
      
      // 正解判定（練習モードの場合）
      if (targetValue !== null) {
        if (calculatedValue === targetValue) {
          // 正解！
          playBeadSound('correct');
          if (onCorrect) onCorrect(calculatedValue);
        } else {
          // 不正解または途中
          if (onIncorrect) onIncorrect(calculatedValue);
        }
      }
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
  };

  // 梁色アウトライン専用の描画関数（最背面）
  const drawBeamColorOutline = (g, x, y, r, isSpecial = false) => {
    g.clear();
    if (isSpecial) {
      // 梁と同じ色のアウトライン（太い）
      g.stroke({ width: 4, color: beamColor, alpha: 0.8 })
        .circle(0, 0, r + 4) // 相対位置で描画
        .stroke();
    }
  };

  // 白アウトライン専用の描画関数
  const drawWhiteOutline = (g, x, y, r, isSpecial = false) => {
    g.clear();
    if (isSpecial) {
      // 白いアウトライン（細い）
      g.stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
        .circle(0, 0, r + 1) // 相対位置で描画
        .stroke();
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
        backgroundAlpha: 0, // 背景を透明に戻す
        width: width,
        height: upperHeight + hariH + lowerHeight,
      });
      if (destroyed) return;
      appRef.current = app;
      hostRef.current.appendChild(app.canvas);

      const stage = app.stage;
      const gridLayer = new Container();
      const beamOutlineLayer = new Container(); // 梁色のアウトライン（最背面）
      const whiteOutlineLayer = new Container(); // 白のアウトライン
      const upperLayer = new Container(); // 珠本体
      const lowerLayer = new Container(); // 珠本体
      const hariLayer = new Container(); // 梁（最前面）
      // レイヤー順序: 梁色アウトライン → 白アウトライン → 珠 → 梁
      stage.addChild(gridLayer, beamOutlineLayer, whiteOutlineLayer, upperLayer, lowerLayer, hariLayer);
      // シンプルなセンター寄せ
      [gridLayer, beamOutlineLayer, whiteOutlineLayer, upperLayer, lowerLayer, hariLayer].forEach(
        (c) => (c.x = width / 2) // props.widthの中央
      );

      // かわいい梁の描画
      hariLayer.y = upperHeight + hariH / 2;
      const hari = new Graphics();

      // 梁の影
      hari.fill({ color: darkenColor(beamColor, 0.6), alpha: 0.3 })
        .roundRect(-width / 2 + 2, -hariH / 2 + 2, width, hariH, 8)
        .fill();

      // 梁のメイン（少し透明度を下げて下の珠が見えるように）
      hari.fill({ color: beamColor, alpha: 0.9 })
        .roundRect(-width / 2, -hariH / 2, width, hariH, 8)
        .fill();

      // 梁のハイライト（beamColorから自動計算）
      hari.fill({ color: lightenColor(beamColor, 0.3), alpha: 0.7 })
        .roundRect(-width / 2, -hariH / 2, width, hariH / 3, 8)
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
        for (let r = 0; r < UPPER_SIZE; r++)
          grid.rect(-width / 2, upperRectY(r), width, upperCellH);
        grid.stroke({ width: 2, color: 0x334155, alpha: 0.5 });
        grid.rect(-width / 2, upperHeight, width, hariH);
        grid.stroke({ width: 1, color: 0x94a3b8, alpha: 0.3 });
        for (let r = 0; r < LOWER_SIZE; r++)
          grid.rect(-width / 2, lowerRectY(r), width, lowerCellH);
        gridLayer.addChild(grid);
      }

      const upperBead = new Graphics();
      upperBead.x = 0;
      upperBead.y = upperRowCenterY(upperBlankRef.current === 0 ? 1 : 0);
      drawCuteBead(upperBead, upperRadius, beadColorUpper);
      upperLayer.addChild(upperBead);

      // 上段の梁色アウトライン（最背面）
      const upperBeamOutline = new Graphics();
      beamOutlineLayer.addChild(upperBeamOutline);

      // 上段の白アウトライン
      const upperWhiteOutline = new Graphics();
      whiteOutlineLayer.addChild(upperWhiteOutline);

      const redrawUpperBead = (stickHari) => {
        drawCuteBead(upperBead, upperRadius, beadColorUpper);
        // アウトラインの位置、スケール、回転を珠と同期
        upperBeamOutline.x = upperBead.x;
        upperBeamOutline.y = upperBead.y;
        upperBeamOutline.scale.copyFrom(upperBead.scale);
        upperBeamOutline.rotation = upperBead.rotation;
        upperWhiteOutline.x = upperBead.x;
        upperWhiteOutline.y = upperBead.y;
        upperWhiteOutline.scale.copyFrom(upperBead.scale);
        upperWhiteOutline.rotation = upperBead.rotation;
        // アウトラインを各レイヤーに描画
        drawBeamColorOutline(upperBeamOutline, 0, 0, upperRadius, stickHari);
        drawWhiteOutline(upperWhiteOutline, 0, 0, upperRadius, stickHari);
      };

      const beadCount = LOWER_SIZE - 1;
      const lowerBeads = Array.from({ length: beadCount }).map(() => {
        const g = new Graphics();
        g.x = 0;
        g.y = lowerRowCenterY(0);
        drawCuteBead(g, lowerRadius, beadColorLower);
        lowerLayer.addChild(g);
        return g;
      });

      // 下段の梁色アウトライン（最背面）
      const lowerBeamOutlines = Array.from({ length: beadCount }).map(() => {
        const g = new Graphics();
        beamOutlineLayer.addChild(g);
        return g;
      });

      // 下段の白アウトライン
      const lowerWhiteOutlines = Array.from({ length: beadCount }).map(() => {
        const g = new Graphics();
        whiteOutlineLayer.addChild(g);
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

      // アニメーション用のパラメータ
      const springK = 0.18; // 梁から離れる時の適度なバウンド
      const damping = 0.78;  // 適度なダンピング
      const smoothK = 0.05;  // 梁にくっつく時のスムーズな移動
      const smoothDamping = 0.50; // 強いダンピングでバウンドを抑制
      let vyUpper = 0;
      const vyLower = lowerBeads.map(() => 0);
      
      // 上段の直前の動作を記憶
      let upperLastAction = null; // 'stick' or 'release'
      
      // 下段の直前の動作を記憶
      const lowerLastActions = lowerBeads.map(() => null);

      const upperHits = new Container();
      upperLayer.addChild(upperHits);
      for (let r = 0; r < UPPER_SIZE; r++) {
        upperHits.addChild(
          makeHitRect(-width / 2, upperRectY(r), width, upperCellH, () => {
            if (r !== upperBlankRef.current) {
              const oldBlankIndex = upperBlankRef.current;
              upperBlankRef.current = r;

              // 上段で梁にくっつく時の特別な音の判定
              // 条件：ビーズがブランクより上の行に移動する時（アウトラインが付く時）
              const willStickToHari = oldBlankIndex > r;
              
              // アニメーション用の動作記録（逆にする）
              upperLastAction = willStickToHari ? 'stick' : 'release';
              
              playBeadSound(willStickToHari ? 'special' : 'bead');

              notifyValue();
            }
          })
        );
      }
      const lowerHits = new Container();
      lowerLayer.addChild(lowerHits);
      for (let r = 0; r < LOWER_SIZE; r++) {
        lowerHits.addChild(
          makeHitRect(-width / 2, lowerRectY(r), width, lowerCellH, () => {
            if (r !== lowerBlankRef.current) {
              const oldBlankIndex = lowerBlankRef.current;
              lowerBlankRef.current = r;

              // 下段で梁にくっつく時の特別な音の判定
              // 条件：ビーズがブランクより下の行に移動する時（アウトラインが付く時）
              // oldBlankIndex < r の時、ビーズが下に移動して梁にくっつく
              const willStickToHari = oldBlankIndex < r;
              
              // アニメーション用の動作記録（全ての下段ビーズに適用、逆にする）
              for (let i = 0; i < lowerLastActions.length; i++) {
                lowerLastActions[i] = willStickToHari ? 'stick' : 'release';
              }
              
              playBeadSound(willStickToHari ? 'special' : 'bead');

              notifyValue();
            }
          })
        );
      }

      const rowsWithoutBlank = () => {
        const rows = [];
        for (let r = 0; r < LOWER_SIZE; r++)
          if (r !== lowerBlankRef.current) rows.push(r);
        return rows;
      };

      app.ticker.add(() => {
        // 上段のアニメーション処理（動作に応じたパラメータ）
        const currentK = upperLastAction === 'release' ? smoothK : springK;
        const currentDamping = upperLastAction === 'release' ? smoothDamping : damping;
        
        const upperTargetRow = upperBlankRef.current === 0 ? 1 : 0;
        const yTargetUpper = upperRowCenterY(upperTargetRow);
        const dyU = yTargetUpper - upperBead.y;
        vyUpper = vyUpper * currentDamping + dyU * currentK;
        upperBead.y += vyUpper;
        const stickHari = upperTargetRow === 1;

        // 上段のアニメーション処理
        if (!stickHari) {
          // 梁にくっついていない場合はアニメーションを適用
          upperBead.scale.set(1.1, 0.9); // 上下に潰れる
          upperBead.rotation = Math.sin(Date.now() * 0.008) * 0.08; // ゆらゆら揺れる
        } else {
          // 梁にくっついているときは通常の状態
          upperBead.scale.set(1.0, 1.0);
          upperBead.rotation = 0;
        }

        redrawUpperBead(stickHari);

        const rows = rowsWithoutBlank();
        for (let i = 0; i < lowerBeads.length; i++) {
          const bead = lowerBeads[i];
          
          // 下段のアニメーション処理（動作に応じたパラメータ）
          const currentLowerK = lowerLastActions[i] === 'release' ? smoothK : springK;
          const currentLowerDamping = lowerLastActions[i] === 'release' ? smoothDamping : damping;
          
          const yTarget = lowerRowCenterY(rows[i]);
          const dy = yTarget - bead.y;
          vyLower[i] = vyLower[i] * currentLowerDamping + dy * currentLowerK;
          bead.y += vyLower[i];

          // 下段のビーズが梁にくっついているかどうかを判定
          // ブランクより上の行（小さい行番号）にあるビーズが梁にくっついている
          const isStickingToHari = rows[i] < lowerBlankRef.current;

          // 梁にくっついていない場合はアニメーションを適用
          if (!isStickingToHari) {
            // 上下に潰れるスケール効果
            const scaleX = 1.1;
            const scaleY = 0.9;
            bead.scale.set(scaleX, scaleY);

            // ゆらゆら揺れる回転
            bead.rotation = Math.sin(Date.now() * 0.008 + i * 0.5) * 0.08;
          } else {
            // 梁にくっついているときは通常の状態に戻す
            bead.scale.set(1.0, 1.0);
            bead.rotation = 0;
          }

          // ビーズ本体を描画
          drawCuteBead(bead, lowerRadius, beadColorLower);
          
          // アウトラインの位置、スケール、回転を珠と同期
          lowerBeamOutlines[i].x = bead.x;
          lowerBeamOutlines[i].y = bead.y;
          lowerBeamOutlines[i].scale.copyFrom(bead.scale);
          lowerBeamOutlines[i].rotation = bead.rotation;
          lowerWhiteOutlines[i].x = bead.x;
          lowerWhiteOutlines[i].y = bead.y;
          lowerWhiteOutlines[i].scale.copyFrom(bead.scale);
          lowerWhiteOutlines[i].rotation = bead.rotation;
          
          // アウトラインを各レイヤーに描画
          drawBeamColorOutline(lowerBeamOutlines[i], 0, 0, lowerRadius, isStickingToHari);
          drawWhiteOutline(lowerWhiteOutlines[i], 0, 0, lowerRadius, isStickingToHari);
        }
      });

      notifyValue();

      // シンプルなサイズ設定（レスポンシブ不要）
      app.canvas.style.width = `${width}px`;
      app.canvas.style.height = `${upperHeight + hariH + lowerHeight}px`;

      return () => {
        // クリーンアップのみ
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
    width,
    upperHeight,
    lowerHeight,
    upperCellH,
    lowerCellH,
    upperRadius,
    lowerRadius,
    hariH,
    beadColorUpper,
    beadColorLower,
    beamColor,
    showTeiiten,
    showCellBorder,
  ]);

  return <div ref={hostRef} style={{ width, display: "inline-block" }} />;
}