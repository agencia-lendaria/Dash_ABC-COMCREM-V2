import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Insights from './pages/Insights';
import CustomerAnalysis from './pages/CustomerAnalysis';
import ProductAnalysis from './pages/ProductAnalysis';
import CityAnalysis from './pages/CityAnalysis';
import AcabamentoAnalysis from './pages/AcabamentoAnalysis';
import InventoryForecast from './pages/InventoryForecast';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main>
                  <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/clientes" element={<CustomerAnalysis />} />
          <Route path="/produtos" element={<ProductAnalysis />} />
          <Route path="/cidades" element={<CityAnalysis />} />
          <Route path="/acabamento" element={<AcabamentoAnalysis />} />
          <Route path="/estoque" element={<InventoryForecast />} />
        </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
