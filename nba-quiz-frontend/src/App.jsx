// React Router-like page control for NBA Quiz

import { useState } from "react";
import WelcomePage from "./pages/WelcomePage";
import PreparePage from "./pages/PreparePage";
import GamePage from "./pages/GamePage";
import GameOverModal from "./pages/GameOverModal";

export default function App() {
  const [page, setPage] = useState("welcome"); // welcome → prepare → game
  const [name, setName] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [ws, setWs] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleJoin = (name, roomKey) => {
    const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${wsProto}://${window.location.host}/ws`);

    setIsJoining(true);
    setErrorMsg("");
    socket.onopen = () => {
      socket.send(JSON.stringify({ event: "join", name, key: roomKey }));
    };
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.event === "room_joined") {
        setPlayers(msg.players);
        setWs(socket);
        setName(name);
        setRoomKey(roomKey);

        if (!msg.alreadyJoined) {
          setPage("prepare"); // ✅ 僅在第一次加入時跳頁
        }

        setIsJoining(false);
      } else if (msg.event === "error") {
        setErrorMsg(msg.msg || "Failed to join");
        setIsJoining(false);
        socket.close();
      }
    };
  };
  const handleGameOver = (finalScore) => {
    setScores(finalScore);
    setShowModal(true);
  };
  const handleStart = () => setPage("game");
  const handleBackToHome = () => {
    setShowModal(false);
    setPage("welcome");
    setScores([]);
    ws.close();
  };
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {page === "welcome" && (
        <WelcomePage
          onJoin={handleJoin}
          isJoining={isJoining}
          errorMsg={errorMsg}
        />
      )}
      {page === "prepare" && (
        <PreparePage
          name={name}
          roomKey={roomKey}
          ws={ws}
          players={players}
          onStart={handleStart}
        />
      )}
      {page === "game" && <GamePage ws={ws} onGameOver={handleGameOver} />}

      {showModal && (
        <GameOverModal scores={scores} onRestart={handleBackToHome} />
      )}
    </div>
  );
}
