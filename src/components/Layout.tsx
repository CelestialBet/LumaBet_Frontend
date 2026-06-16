import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton.js";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/game/dice", label: "Dice" },
  { to: "/game/coinflip", label: "Coin Flip" },
  { to: "/history", label: "History" },
  { to: "/wallet", label: "Wallet" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
            <span className="text-2xl">🎲</span>
            <span className="text-xl font-bold text-luma-400">LumaBet</span>
          </Link>

          {/* Desktop nav */}
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

          <div className="flex items-center gap-3">
            <WalletButton />

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span
                className={`block w-5 h-0.5 bg-gray-300 transition-transform duration-200 ${
                  menuOpen ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-gray-300 my-1 transition-opacity duration-200 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-gray-300 transition-transform duration-200 ${
                  menuOpen ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile slide-out drawer */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="px-4 pb-4 flex flex-col gap-1 border-t border-gray-800 pt-3">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={closeMenu}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? "bg-luma-700 text-white"
                    : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>

      <footer className="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        <p>
          LumaBet &copy; {new Date().getFullYear()} — Decentralized gambling on{" "}
          <span className="text-luma-400">Stellar XLM</span>. Play responsibly.
        </p>
      </footer>
    </div>
  );
}
