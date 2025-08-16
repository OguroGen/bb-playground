import React, { useState } from "react";
import BeadColumn from "./components/BeadColumn";

export default function SimpleApp() {
  const [value, setValue] = useState(5);

  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>Simple BeadColumn Test (レスポンシブなし)</h1>
      
      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        marginTop: '20px'
      }}>
        <div style={{ 
          border: '2px solid red',
          display: 'inline-block'
        }}>
          <BeadColumn
            width={100}
            upperHeight={100}
            lowerHeight={250}
            beadColorUpper={0x3b82f6}
            beadColorLower={0x3b82f6}
            outlineColor={0xffd700}
            showTeiiten={false}
            value={value}
            onChange={setValue}
          />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <p>値: {value}</p>
        <button onClick={() => setValue(0)}>0</button>
        <button onClick={() => setValue(3)}>3</button>
        <button onClick={() => setValue(5)}>5</button>
        <button onClick={() => setValue(8)}>8</button>
      </div>
    </div>
  );
}
