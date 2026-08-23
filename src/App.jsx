import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { AdminRoute } from './components/AdminRoute';
import { Home } from './pages/Home';
import { GoalSettings } from './pages/GoalSettings';
import { AddTransaction } from './pages/AddTransaction';
import { Statement } from './pages/Statement';
import { StatementChart } from './pages/StatementChart';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route
              path="goal-settings"
              element={
                <AdminRoute>
                  <GoalSettings />
                </AdminRoute>
              }
            />
            <Route
              path="add-transaction"
              element={
                <AdminRoute>
                  <AddTransaction />
                </AdminRoute>
              }
            />
            <Route
              path="statement"
              element={
                <AdminRoute>
                  <Statement />
                </AdminRoute>
              }
            />
            <Route
              path="statement-chart"
              element={
                <AdminRoute>
                  <StatementChart />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}