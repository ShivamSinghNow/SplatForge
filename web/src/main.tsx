import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// No StrictMode: its dev double-mount re-initialises the imperative WebGL splat
// viewer (and other one-shot effects) twice, which the library mishandles. Single
// mount matches production behaviour and keeps the live demo stable.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
