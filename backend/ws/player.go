package ws

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Player struct {
	Name     string
	Conn     *websocket.Conn
	Score    int
	Answered bool
	Mutex    sync.Mutex
}

// SendJSON safely sends a JSON-serializable object to the player's websocket connection
func (p *Player) SendJSON(message interface{}) error {
	p.Mutex.Lock()
	defer p.Mutex.Unlock()
	return p.Conn.WriteJSON(message)
}

// Reset resets answer status (called at the start of each new question)
func (p *Player) Reset() {
	p.Answered = false
}
