// React + Tailwind: WelcomePage → PreparePage

import { useEffect, useState } from "react";

export default function PreparePage({
  name,
  roomKey,
  ws,
  players,
  onStart,
  onRoomJoined,
}) {
  const [ready, setReady] = useState(false);
  const [otherReady, setOtherReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [opponent, setOpponent] = useState("");

  useEffect(() => {
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === "opponent_ready") {
        setOtherReady(true);
      }
      if (msg.event === "both_ready") {
        setOtherReady(true);
      } else if (msg.event === "countdown") {
        setCountdown(msg.seconds);
      } else if (msg.event === "start_game") {
        onStart(msg.opponent);
      } else if (msg.event === "opponent_joined") {
        setOpponent(msg.playerName);
      } else if (msg.event === "oponent_ready") {
        setOtherReady(true);
      }
    };
  }, [ws]);

  const handleReady = () => {
    setReady(true);
    ws.send(JSON.stringify({ event: "ready" }));
  };

  return (
    <div className="bg-white flex flex-col justify-center items-center rounded-2xl shadow-xl p-8 w-full max-w-2xl">
      <h1 className="text-2xl font-bold mb-4 text-center">Get Ready</h1>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-2">Rules</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>Guess the NBA player from the silhouette</li>
            <li>5 rounds, 10 seconds each</li>
            <li>First to answer gets the point</li>
            <li>Wrong guess allows opponent to try</li>
            <li>Score = 10 - seconds used</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Players</h2>
          <div className="space-y-2">
            <div className="p-2 border rounded bg-gray-50 flex justify-between">
              <span className="font-medium">You: {name}</span>
              <span
                className={`font-semibold ${
                  ready ? "text-green-600" : "text-gray-500"
                }`}
              >
                {ready ? "Ready" : "Not Ready"}
              </span>
            </div>
            <div className="p-2 border rounded bg-gray-50 flex justify-between">
              <span className="font-medium">Opponent : {opponent}</span>
              <span
                className={`font-semibold ${
                  otherReady ? "text-green-600" : "text-gray-500"
                }`}
              >
                {otherReady ? "Ready" : "Not Ready"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {countdown !== null ? (
        <div className="text-center text-lg font-bold text-blue-600 mt-6">
          Game starts in {countdown}...
        </div>
      ) : (
        <button
          onClick={handleReady}
          disabled={ready}
          className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition disabled:bg-gray-300"
        >
          {ready ? "Waiting for opponent..." : "I am ready!"}
        </button>
      )}
    </div>
  );
}
