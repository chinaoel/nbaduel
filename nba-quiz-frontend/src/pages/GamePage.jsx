import { useEffect, useState } from "react";

export default function GamePage({
  ws,
  name,
  roomKey,
  onGameOver,
  playerIdx,
  opponent,
}) {
  const [question, setQuestion] = useState(null);
  const [scores, setScores] = useState([0, 0]);
  const [countdown, setCountdown] = useState(10);
  const [timerId, setTimerId] = useState(null);
  const [answered, setAnswered] = useState(false);

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [correctChoice, setCorrectChoice] = useState(null);
  const [answerKey, setAnswerKey] = useState(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);

  const maxScore = 50;

  useEffect(() => {
    ws.send(JSON.stringify({ event: "start_game" }));
  }, []);

  useEffect(() => {
    if (!question) return;
    if (timerId) clearInterval(timerId);

    setCountdown(10);
    setSelectedChoice(null);
    setCorrectChoice(null);
    setOpponentAnswered(false);
    setAnswered(false);

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
        setAnswerKey(msg.question.answer);
      } else if (msg.event === "answer_result") {
        setScores((prevScores) => {
          const updated = [...prevScores];
          updated[msg.playerIdx] += msg.score;
          return updated;
        });

        if (msg.correct) {
          setCorrectChoice(answerKey);
        } else {
          setSelectedChoice(msg.choice);
        }
      } else if (msg.event === "game_over") {
        onGameOver(msg.scores);
        return;
      }
    };

    return () => {
      ws.onmessage = null;
    };
  }, [ws, answerKey]);

  const sendAnswer = (choice) => {
    if (answered) return;
    setAnswered(true);
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

  const isCorrect = (opt) => correctChoice && opt === correctChoice;
  const isWrong = (opt) => selectedChoice === opt && opt !== correctChoice;

  const yourIdx = playerIdx;
  const opponentIdx = yourIdx === 0 ? 1 : 0;

  return (
    <div className="grid grid-cols-3 gap-6 items-start">
      {/* Your Score */}
      <div className="bg-gray-100 p-4 rounded shadow w-full">
        <h2 className="font-bold mb-2 text-center">You ({name})</h2>
        <div className="h-6 bg-white rounded border overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-300"
            style={{
              width: `${(scores[yourIdx] / maxScore) * 100}%`,
            }}
          ></div>
        </div>
        <p className="text-xl font-semibold text-center mt-1">
          {scores[yourIdx]} / {maxScore}
        </p>
      </div>

      {/* Center Section */}
      <div className="text-center">
        <h1 className="text-xl font-bold mb-4">Who's this player?</h1>
        <p className="text-red-600 text-lg font-bold mb-2">⏳ {countdown}s</p>

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
          {question.options.map((opt, idx) => {
            let bg = "bg-blue-500 hover:bg-blue-600";
            if (correctChoice) {
              if (isCorrect(opt)) bg = "bg-green-500";
              else bg = "bg-gray-300";
            } else if (selectedChoice) {
              if (isWrong(opt)) bg = "bg-red-500";
            }

            return (
              <li key={idx}>
                <button
                  className={`w-full text-white py-2 rounded shadow ${bg} disabled:opacity-70`}
                  onClick={() => sendAnswer(opt)}
                  disabled={!!correctChoice}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>

        {opponentAnswered && (
          <p className="text-sm text-gray-600 mt-2 font-medium">
            ✅ Opponent has answered
          </p>
        )}
      </div>

      {/* Opponent Score */}
      <div className="bg-gray-100 p-4 rounded shadow w-full">
        <h2 className="font-bold mb-2 text-center">Opponent ({opponent})</h2>
        <div className="h-6 bg-white rounded border overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-300"
            style={{
              width: `${(scores[opponentIdx] / maxScore) * 100}%`,
            }}
          ></div>
        </div>
        <p className="text-xl font-semibold text-center mt-1">
          {scores[opponentIdx]} / {maxScore}
        </p>
      </div>
    </div>
  );
}
