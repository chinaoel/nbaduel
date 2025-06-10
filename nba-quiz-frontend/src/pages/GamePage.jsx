// React + Tailwind: GamePage

import { useEffect, useState } from "react";

export default function GamePage({ ws, name, roomKey, onGameOver }) {
  const [question, setQuestion] = useState(null);
  const [scores, setScores] = useState([0, 0]);
  const [countdown, setCountdown] = useState(10);
  const [timerId, setTimerId] = useState(null); // 記錄計時器 ID

  // timer's use effect
  useEffect(() => {
    // first called
    if (!question) return;

    if (timerId) clearInterval(timerId);

    setCountdown(10);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerId(id);
  }, [question]);

  useEffect(() => {
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === "question") {
        setQuestion(msg.question);
      } else if (msg.event === "answer_result") {
        // stale closure problem
        setScores((prevScores) => {
          const updatedScores = [...prevScores];
          updatedScores[msg.playerIdx] += msg.score;
          return updatedScores;
        });
      } else if (msg.event === "game_over") {
        onGameOver(msg.scores);
      }
    };

    ws.send(JSON.stringify({ event: "start_game" }));
  }, [ws]);

  const sendAnswer = (choice) => {
    ws.send(JSON.stringify({ event: "answer", choice }));
  };

  if (!question)
    return (
      <div className="text-center text-gray-600">Waiting for question...</div>
    );

  const ext = question.id.endsWith(".mp4") ? "mp4" : "webp";
  const mediaPath = `${import.meta.env.VITE_API_BASE_URL}/static/videos/${
    question.id
  }`;

  return (
    <div className="grid grid-cols-3 gap-6 items-start">
      <div className="bg-gray-100 p-4 rounded shadow">
        <h2 className="font-bold mb-2">Player A</h2>
        <p className="text-xl font-semibold">{scores[0]}</p>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold mb-4">Who's this player?</h1>
        <p className="text-red-600 text-lg font-bold mb-2">
          ⏳ {countdown}s
        </p>{" "}
        {/* 倒數區塊 */}
        {ext === "mp4" ? (
          <video
            src={mediaPath}
            width={300}
            height={300}
            autoPlay
            muted
            loop
            className="mx-auto rounded"
          />
        ) : (
          <img
            src={mediaPath}
            width={300}
            height={300}
            alt="silhouette"
            className="mx-auto rounded object-contain"
          />
        )}
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {question.options.map((opt, idx) => (
            <li key={idx}>
              <button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded shadow"
                onClick={() => sendAnswer(opt)}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-100 p-4 rounded shadow">
        <h2 className="font-bold mb-2">Player B</h2>
        <p className="text-xl font-semibold">{scores[1]}</p>
      </div>
    </div>
  );
}
