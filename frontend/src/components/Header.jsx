export default function Header({ onLogout, onClearHistory, email }) {
  return (
    <header className="flex items-center justify-between bg-[#1a1a3d] px-4 py-3 border-b border-gray-700">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded-full bg-[#635BFF] grid place-items-center font-bold">M</div>
        <div className="text-white font-semibold">Mehran Assistant</div>
        {email && <div className="text-gray-400 text-sm ml-2">({email})</div>}
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onClearHistory}
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-white"
        >
          Clear history
        </button>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 rounded bg-[#635BFF] hover:bg-[#534ae6] text-sm text-white"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
