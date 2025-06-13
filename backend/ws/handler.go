package ws

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type IncomingMessage struct {
	Event     string `json:"event"`
	Name      string `json:"name,omitempty"`
	Key       string `json:"key,omitempty"`
	Choice    string `json:"choice,omitempty"`
	Timestamp float64 `json:"timestamp,omitempty"` // optional

}

func HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	var player *Player
	var room *Room

	for {
		var msg IncomingMessage
		if err := conn.ReadJSON(&msg); err != nil {
			log.Println("read error:", err)
			break
		}

		switch msg.Event {
		case "join":
			raw, err := LoadRawQuestions("static/questions.json")
			if err != nil {
				log.Println("failed to load questions:", err)
				conn.WriteJSON(map[string]string{
					"event": "error",
					"msg":   "failed to load questions",
				})
				continue
			}
			qs := GenerateQuestions(raw, 5)

			player = &Player{
				Name: msg.Name,
				Conn: conn,
			}

			var ok bool
			var playerIndex int
			var alreadyJoined bool
			room, playerIndex, ok, alreadyJoined = AddPlayerToRoom(msg.Key, player, qs)
			if !ok {
				conn.WriteJSON(map[string]string{
					"event": "error",
					"msg":   "room full or invalid",
				})
				return
			}


			conn.WriteJSON(map[string]interface{}{
				"event":       "room_joined",
				"playerIndex": playerIndex,
				"alreadyJoined": alreadyJoined,

			})
			
			if !alreadyJoined{
				// new player, broadcast to other existing player
				//var opponents = []
				for _ ,p := range room.Players{
					
					if p != nil && p.Name != player.Name{
						p.Conn.WriteJSON(map[string]interface{}{
							"event":       "opponent_joined",
							"playerName":  player.Name,

						})
					}
					
				}
				// exisiting opponent
				var opponent = room.getOpponent(player)
				if opponent != nil{
					conn.WriteJSON(map[string]interface{}{
						"event": "opponent_joined",
						"playerName": opponent.Name,
					})
				}
				// notify it has an awaiting opponent
				
			}


		case "ready":
			if room != nil && player != nil{
				room.PlayerReady(player)
			}

		case "start_game":
			if room != nil {
				room.StartGame()
			}

		case "answer":
			fmt.Println("[Answer] player", player, room, msg.Choice )
			if room != nil && player != nil {
				room.HandleAnswer(player, msg.Choice)
			}

		default:
			log.Println("Unknown event:", msg.Event)
		}
	}
}
