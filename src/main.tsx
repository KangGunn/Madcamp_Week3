import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App'; // App.tsx가 App으로 자동 해석됩니다.
import { AuthProvider } from './context/AuthContext'; // AuthProvider 사용을 위한 import

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <AuthProvider> {/* 모든 인증 컨텍스트는 이제 여기서 관리됩니다 */}
        <App />
    </AuthProvider>
  </StrictMode>
);
