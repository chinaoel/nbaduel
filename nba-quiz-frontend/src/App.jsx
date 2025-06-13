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
  const [playerIndex, setPlayerIndex] = useState(null);
  const [opponent, setOpponent] = useState(null);

  const handleJoin = (name, roomKey) => {
    const backendUrl = import.meta.env.VITE_API_BASE_URL;

    const socket = new WebSocket(`${backendUrl}/ws`);

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
          setPlayerIndex(msg.playerIndex);
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
  const handleStart = (opponent) => {
    setPage("game");
    setOpponent(opponent);
  };
  const handleBackToHome = () => {
    setShowModal(false);
    setPage("welcome");
    setScores([]);
    ws.close();
  };

  const onJoinRoom = (playerIndex) => {
    setPlayerIndex(playerIndex);
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
          onRoomJoined={onJoinRoom}
        />
      )}
      {page === "game" && (
        <GamePage
          ws={ws}
          onGameOver={handleGameOver}
          name={name}
          playerIdx={playerIndex}
          opponent={opponent}
        />
      )}

      {showModal && (
        <GameOverModal scores={scores} onRestart={handleBackToHome} />
      )}
    </div>
  );
}
