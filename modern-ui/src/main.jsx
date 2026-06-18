import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Intercetta tutti i log console.error per scriverli nel file di log di Rust
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError.apply(console, args);
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`;
    } else if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch(e) { return String(arg); }
    }
    return String(arg);
  }).join(' ');
  
  import('@tauri-apps/api/core').then(({ invoke }) => {
    invoke('log_frontend_error', { 
      message: `CONSOLE_ERROR: ${message}`, 
      stack: '' 
    }).catch(originalConsoleError);
  }).catch(originalConsoleError);
};

// Gestione globale errori JavaScript asincroni
window.addEventListener('error', (event) => {
  const message = event.error ? event.error.toString() : event.message;
  const stack = event.error ? event.error.stack : '';
  import('@tauri-apps/api/core').then(({ invoke }) => {
    invoke('log_frontend_error', { 
      message: `GLOBAL_JS_ERROR: ${message}`, 
      stack: stack || '' 
    }).catch(console.error);
  }).catch(console.error);
});

// Gestione globale delle Promise rifiutate e non gestite (es. errori API)
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason ? event.reason.toString() : 'Unknown rejection';
  const stack = event.reason && event.reason.stack ? event.reason.stack : '';
  import('@tauri-apps/api/core').then(({ invoke }) => {
    invoke('log_frontend_error', { 
      message: `UNHANDLED_PROMISE_REJECTION: ${message}`, 
      stack: stack || '' 
    }).catch(console.error);
  }).catch(console.error);
});

// Auto-seleziona il testo di qualsiasi input/textarea alla ricezione del focus (sia click che tab)
let selectOnMouseUp = false;

document.addEventListener('focusin', (e) => {
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    const ignoredTypes = ['button', 'submit', 'checkbox', 'radio', 'file', 'image', 'range', 'reset', 'color'];
    if (ignoredTypes.includes(target.type)) return;
    
    selectOnMouseUp = true;
    
    setTimeout(() => {
      if (document.activeElement === target && selectOnMouseUp) {
        try {
          if (typeof target.select === 'function') {
            target.select();
          }
          selectOnMouseUp = false;
        } catch (err) {}
      }
    }, 50);
  }
});

document.addEventListener('mouseup', (e) => {
  const target = e.target;
  if (selectOnMouseUp && target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    setTimeout(() => {
      try {
        if (typeof target.select === 'function') {
          target.select();
        }
      } catch (err) {}
    }, 0);
    selectOnMouseUp = false;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

