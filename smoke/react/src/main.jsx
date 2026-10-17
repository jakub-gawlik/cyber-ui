import { createRoot } from 'react-dom/client';
// à la carte: per-file layered stylesheets + per-element entry points
// (the Vue smoke app covers the all-in-one styles.css + package entry)
import '@jgawlik/cyber-ui/styles/tokens.css';
import '@jgawlik/cyber-ui/styles/base.css';
import '@jgawlik/cyber-ui/styles/button.css';
import '@jgawlik/cyber-ui/styles/input.css';
import '@jgawlik/cyber-ui/styles/progress.css';
import '@jgawlik/cyber-ui/card';
import '@jgawlik/cyber-ui/modal';
import '@jgawlik/cyber-ui/input';
import '@jgawlik/cyber-ui/select';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
