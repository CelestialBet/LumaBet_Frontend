import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton.js";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/game/dice", label: "Dice" },
  { to: "/history", label: "History" },
  { to: "/wallet", label: "Wallet" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎲</span>
            <span className="text-xl font-bold text-luma-400">LumaBet</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? "bg-luma-700 text-white"
                    : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <WalletButton />
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        <p>
          LumaBet &copy; {new Date().getFullYear()} — Decentralized gambling on{" "}
          <span className="text-luma-400">Stellar XLM</span>. Play responsibly.
        </p>
      </footer>
    </div>
  );
}
