// React + Tailwind: 顯示比賽結果的 Modal (支援多玩家)

export default function GameOverModal({ scores, onRestart }) {
  // 轉換成陣列以便排序與渲染
  const scoreEntries = Object.entries(scores).sort((a, b) => b[1] - a[1]); // 分數高排前面

  const topScore = scoreEntries[0]?.[1] || 0;
  const winners = scoreEntries
    .filter(([_, score]) => score === topScore)
    .map(([name]) => name);

  const result =
    winners.length === 1
      ? `${winners[0]} Wins! 🎉`
      : `It's a Tie: ${winners.join(" & ")} 🤝`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Game Over</h2>
        <p className="text-lg font-semibold text-blue-700 mb-4">{result}</p>

        <div className="space-y-2">
          {scoreEntries.map(([player, score]) => (
            <div key={player} className="flex justify-between px-4">
              <span className="font-medium text-gray-700">{player}</span>
              <span className="font-bold text-xl">{score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="mt-6 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
