import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DicomViewer from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DicomViewer />
  </StrictMode>,
);
