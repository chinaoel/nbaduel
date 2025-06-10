package ws

import (
	"fmt"
	"math"
	"sync"
	"time"
)

type RoundState struct {
	AnsweredBy    map[int]bool   // player index -> 是否已回答
	CorrectPlayer *int           // 指向答對者的 index
	Timer         *time.Timer    // 倒數 10 秒計時器
}



type Room struct {
	Key         string
	Players     [2]*Player
	Questions   []Question
	CurrentQ    int
	RoundState  *RoundState
	ReadyCount  int
	AnsweredBy  *Player
	StartTime   time.Time
	sync.Mutex
}

var RoomManager = struct {
	sync.Mutex
	Rooms map[string]*Room
}{
	Rooms: make(map[string]*Room),
}

// 加入房間（若不存在則建立）
func AddPlayerToRoom(key string, p *Player, questions []Question) (*Room, int, bool, bool) {
	RoomManager.Lock()
	defer RoomManager.Unlock()

	room, exists := RoomManager.Rooms[key]
	if !exists {
		room = &Room{
			Key:       key,
			Questions: questions,
		}
		room.Players[0] = p
		RoomManager.Rooms[key] = room
		return room, 0, true, false
	}
	    if room.Players[0] != nil && room.Players[0].Name == p.Name {
        return room, 0, true, true
    }
    if room.Players[1] != nil && room.Players[1].Name == p.Name {
        return room, 1, true, true
    }

	if room.Players[1] == nil {
		room.Players[1] = p
		return room, 1, true, false
	}

	return nil, -1, false, false // 房間已滿
}

// 玩家按下「我準備好了」
func (r *Room) PlayerReady(p *Player) bool {
	r.Lock()
	defer r.Unlock()
	r.ReadyCount++
	if r.ReadyCount == 1 {
		// notify the opponent
		r.getOpponent(p).SendJSON(
			map[string]interface{}{
				"event":"opponent_ready",
			})
	}
	if r.ReadyCount == 2 {
		for _, p := range r.Players {
			p.SendJSON(map[string]interface{}{
				"event": "both_ready",
			})

			p.SendJSON(map[string]interface{}{
					"event": "countdown",
					"seconds": 3, // ex. 倒數 3 秒
				})
		}

		go func() {
			time.Sleep(3 * time.Second)
			for _, p := range r.Players {
				if p != nil {
					p.Conn.WriteJSON(map[string]any{
						"event": "start_game",
					})
				}
			}
		}()
		return true
	}
	return false
}

// 收到任一位玩家觸發「開始遊戲」按鈕
func (r *Room) StartGame() {
	r.Lock()
	defer r.Unlock()
	r.CurrentQ = 1
	r.sendQuestion()
}

// 傳送目前這一題給兩位玩家
/*
func (r *Room) sendQuestion() {
	fmt.Printf("currentQ : %d, length of q : %d", r.CurrentQ ,len(r.Questions))
	if r.CurrentQ >= len(r.Questions) {
		r.endGame()
		return
	}

	r.RoundState = &RoundState{
		AnsweredBy:    make(map[int]bool),
		CorrectPlayer: nil,
		Timer:         time.NewTimer(10*time.Second),
	}
	q := r.Questions[r.CurrentQ]
	r.StartTime = time.Now()
	r.AnsweredBy = nil

	go func(round *RoundState){
		<- round.Timer.C

		r.Lock()
		defer r.Unlock()

		if r.RoundState == round {
			r.sendNextQuestion()
		}
	}(r.RoundState)

	for _, p := range r.Players {
		p.Reset()
		p.SendJSON(map[string]interface{}{
			"event":    "question",
			"question": q,
			"index":    r.CurrentQ,
		})
	}
}
*/

// 傳送目前這一題給兩位玩家
func (r *Room) sendQuestion() {
	fmt.Printf("currentQ : %d, length of q : %d", r.CurrentQ, len(r.Questions))
	if r.CurrentQ >= len(r.Questions) {
		r.endGame()
		return
	}

	// 為了在 AfterFunc 的閉包中安全地檢查回合是否已變，我們記下當前的問題索引
	qIndex := r.CurrentQ

	r.RoundState = &RoundState{
		AnsweredBy:    make(map[int]bool),
		CorrectPlayer: nil,
		// 使用 time.AfterFunc
		Timer: time.AfterFunc(10*time.Second, func() {
			r.Lock()
			defer r.Unlock()

			// 雙重檢查：
			// 1. 檢查 RoundState 是否還存在 (可能已被 HandleAnswer 清除)
			// 2. 檢查當前的問題索引是否還是我們設定計時器時的那個
			//    這是為了防止計時器在極端情況下觸發時，遊戲已經進入了下一題
			if r.RoundState != nil && r.CurrentQ == qIndex {
				fmt.Println("Round timeout for question", qIndex)
				// 直接呼叫統一的回合結束函式
				r.concludeRoundAndProceed()
			}
		}),
	}

	
	
	q := r.Questions[r.CurrentQ]
	r.StartTime = time.Now()
	// AnsweredBy 已在 RoundState 中，這裡的 r.AnsweredBy 可以考慮移除
	r.AnsweredBy = nil 

	for _, p := range r.Players {
		p.Reset()
		p.SendJSON(map[string]interface{}{
			"event":    "question",
			"question": q,
			"index":    r.CurrentQ,
		})
	}
}

// concludeRoundAndProceed 負責結束當前回合並準備進入下一題
// !! 這個函式假設外部已經取得了鎖 !!
func (r *Room) concludeRoundAndProceed() {
	if r.RoundState == nil {
		return
	}

	// 只需停止計時器即可。這會阻止 AfterFunc 中的函式被執行。
	// 即使 Stop 返回 false (代表函式已經開始或結束執行)，
	// 我們在 AfterFunc 中的安全檢查 (if r.RoundState != nil) 也能處理這種情況。
	r.RoundState.Timer.Stop()

	// 清理狀態，這是避免重複執行的關鍵
	r.RoundState = nil

	// 進入下一題
	r.sendNextQuestion()
}

// 處理某一位玩家答題
func (r *Room) HandleAnswer(player *Player, choice string) {
	r.Lock()
	defer r.Unlock()

	rs := r.RoundState
	if rs == nil {
		return
	}

	var playerIdx int
	if player == r.Players[0] {
		playerIdx = 0
	} else if player == r.Players[1] {
		playerIdx = 1
	} else {
		return
	}

	// 忽略重複答題
	if rs.AnsweredBy[playerIdx] {
		return
	}
	rs.AnsweredBy[playerIdx] = true // ✅ 記錄已答過

	correct := r.Questions[r.CurrentQ].Answer == choice
	if correct {

		
		rs.CorrectPlayer = &playerIdx

		elapsed := time.Since(r.StartTime).Seconds()
		score := int(math.Max(10.0-elapsed, 1))
		player.Score += score

		for _, p := range r.Players {
			p.SendJSON(map[string]interface{}{
				"event":     "answer_result",
				"correct":   true,
				"score":     score,
				"playerIdx": playerIdx,
			})
		}

		r.getOpponent(player).SendJSON(map[string]interface{}{
			"event": "opponent_answered",
		})

		r.concludeRoundAndProceed()
	} else {
		for _, p := range r.Players {
			p.SendJSON(map[string]interface{}{
				"event":     "answer_result",
				"correct":   false,
				"score":     0,
				"playerIdx": playerIdx,
			})
		}

		// ❗️若兩人都答錯且沒人答對 → 下一題
		if len(rs.AnsweredBy) == 2 && rs.CorrectPlayer == nil {
			r.concludeRoundAndProceed()
		}
	}
}

// 下一題（加點 delay）
func (r *Room) sendNextQuestion() {
	r.CurrentQ++
	time.AfterFunc(1*time.Second, func() {
		r.sendQuestion()
	})
	
}

// 結束遊戲並送出比分
func (r *Room) endGame() {
	//scores := []int{r.Players[0].Score, r.Players[1].Score}
	scores := map[string]int{
		r.Players[0].Name: r.Players[0].Score,
		r.Players[1].Name: r.Players[1].Score,
	}

	for _, p := range r.Players {
		p.SendJSON(map[string]interface{}{
			"event":  "game_over",
			"scores": scores,
		})
	}
	delete(RoomManager.Rooms, r.Key)
}

// 回傳對手指標
func (r *Room) getOpponent(p *Player) *Player {
	if r.Players[0] == p {
		return r.Players[1]
	}
	return r.Players[0]
}

func (r *Room) HasPlayer(name string) bool {
	for _, p := range r.Players {
		if p.Name == name {
			return true
		}
	}
	return false
}
