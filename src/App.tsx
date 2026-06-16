import { Routes, Route } from "react-router-dom";
import { WalletProvider } from "./hooks/useWallet.js";
import Layout from "./components/Layout.js";
import Home from "./pages/Home.js";
import DiceGame from "./pages/Dice.js";
import CoinFlip from "./pages/CoinFlip.js";
import Game from "./pages/Game.js";
import WalletPage from "./pages/Wallet.js";
import History from "./pages/History.js";

export default function App() {
  return (
    <WalletProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/dice" element={<DiceGame />} />
          <Route path="/game/coinflip" element={<CoinFlip />} />
          <Route path="/game" element={<Game />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/history" element={<History />} />
          <Route
            path="*"
            element={
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-400">404 — Page not found</h2>
              </div>
            }
          />
        </Routes>
      </Layout>
    </WalletProvider>
  );
}
