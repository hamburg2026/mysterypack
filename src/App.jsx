import { HashRouter, Routes, Route } from 'react-router-dom';
import { SpielerProvider }     from './context/SpielerContext';
import { WalletProvider }      from './context/WalletContext';
import { SammlungProvider }    from './context/SammlungContext';
import { LigaProvider }        from './context/LigaContext';
import { MultiplayerProvider } from './context/MultiplayerContext';
import Navbar         from './components/Navbar';
import StatsLeiste    from './components/StatsLeiste';
import TrikotDatenbank from './pages/TrikotDatenbank';
import Quiz           from './pages/Quiz';
import Shop           from './pages/Shop';
import MeineSammlung  from './pages/MeineSammlung';
import Wallet         from './pages/Wallet';
import './App.css';

export default function App() {
  return (
    <LigaProvider>
    <SpielerProvider>
    <WalletProvider>
    <SammlungProvider>
    <HashRouter>
    <MultiplayerProvider>
      <div className="app">
        <Navbar />
        <StatsLeiste />
        <main className="main-content">
          <Routes>
            <Route path="/"         element={<TrikotDatenbank />} />
            <Route path="/quiz"     element={<Quiz />} />
            <Route path="/shop"     element={<Shop />} />
            <Route path="/sammlung" element={<MeineSammlung />} />
            <Route path="/wallet"   element={<Wallet />} />
          </Routes>
        </main>
      </div>
    </MultiplayerProvider>
    </HashRouter>
    </SammlungProvider>
    </WalletProvider>
    </SpielerProvider>
    </LigaProvider>
  );
}
