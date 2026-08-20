import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { GoalSettings } from './pages/GoalSettings';
import { AddTransaction } from './pages/AddTransaction';
import { Statement } from './pages/Statement';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="goal-settings" element={<GoalSettings />} />
            <Route path="add-transaction" element={<AddTransaction />} />
            <Route path="statement" element={<Statement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
