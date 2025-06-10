package main

import (
	"fmt"
	"log"
	"mime"
	"nba-quiz-backend/ws" // 引入你自己寫的 handler 套件
	"net/http"
)

// to support webp image file type
func init() {
	// 確保 .webp 檔案的 Content-Type 正確為 image/webp
	mime.AddExtensionType(".webp", "image/webp")
}


func main() {
	// 註冊 WebSocket handler
	http.HandleFunc("/ws", ws.HandleConnection)

	// 開啟靜態檔案（影片或圖片）
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello! WebSocket backend is running.")
	})


	log.Println("Server listening on http://localhost:8000 ...")
	err := http.ListenAndServe(":8000", nil) // 就像 Flask 的 app.run(port=8080)
	if err != nil {
		log.Fatal("Server error:", err)
	}
}
