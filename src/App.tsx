import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { InventoryPage } from './features/inventory/InventoryPage';
import { VehicleDetailPage } from './features/vehicle/VehicleDetailPage';
import styles from './App.module.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className={styles.root}>
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Vehicle Auction</h1>
            </div>
          </header>

          <main className={styles.main}>
            <Routes>
              <Route path="/" element={<InventoryPage />} />
              <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
