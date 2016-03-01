package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
	"github.com/nats-io/nats"
)

func handleWebSocket(rw http.ResponseWriter, r *http.Request) {
	up := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	ws, err := up.Upgrade(rw, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer ws.Close()

	ns, err := nats.Connect(os.Getenv("NATS_URI"))
	if err != nil {
		log.Println(err)
		ws.WriteMessage(websocket.TextMessage, []byte(err.Error()))
		return
	}
	defer ns.Close()

	for {
		_, msg, err := ws.ReadMessage()
		if _, is := err.(*websocket.CloseError); is {
			return
		} else if err != nil {
			log.Println(err)
			return
		}

		if err := ns.Publish("nats-cast", msg); err != nil {
			log.Println(err)
			return
		}
	}
}

func serveIndex(rw http.ResponseWriter, req *http.Request) {
	fmt.Fprintln(rw, indexHTML)
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/", serveIndex)

	if err := http.ListenAndServe(":"+os.Getenv("PORT"), nil); err != nil {
		log.Fatal(err)
	}
}
