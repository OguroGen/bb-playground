import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// import AppRefactored from './AppRefactored.jsx'
// import SimpleApp from './App-simple.jsx'

// オリジナル版（動作確認済み）を使用
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)