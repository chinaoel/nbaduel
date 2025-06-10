// React + Tailwind: WelcomePage

import { useState } from "react";

export default function WelcomePage({ onJoin, isJoining, errorMsg }) {
  const [name, setName] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [error, setError] = useState("");

  const handleJoin = () => {
    if (!name || !roomKey) {
      setError("Please enter both name and room key");
      return;
    }

    onJoin(name, roomKey);
  };

  return (
    <div className="flex flex-col justify-center items-center bg-orange-300  rounded-2xl shadow-xl p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-4 text-center">NBA Quiz Game</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            className="w-full border rounded p-2 mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Room Key</label>
          <input
            type="text"
            className="w-full border rounded p-2 mt-1"
            value={roomKey}
            onChange={(e) => setRoomKey(e.target.value)}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={isJoining}
          className={`w-full py-2 rounded transition ${
            isJoining
              ? "bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isJoining ? "Joining..." : "Join Room"}
        </button>
      </div>
    </div>
  );
}
