import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <nav className="border-b border-green-200/50 bg-cream-100/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
              Authentica
            </h1>
          </div>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
