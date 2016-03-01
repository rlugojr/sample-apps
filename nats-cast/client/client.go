package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/nats-io/nats"
)

func main() {
	var ns *nats.Conn
	var err error
	const maxWait = 30

	i := 0
	for ; i < maxWait; i++ {
		ns, err = nats.Connect(os.Getenv("NATS_URI"))
		if err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}
	if err != nil {
		log.Fatalln("nats.Connect:", err)
	}

	defer ns.Close()

	subReader, err := ns.SubscribeSync("nats-cast")
	if err != nil {
		log.Fatalln("nats.SubscribeSync:", err)
	}

	fmt.Println("waiting for messages from cast-server...")
	for {
		msg, err := subReader.NextMsg(5 * time.Minute)
		if err == nats.ErrConnectionClosed {
			return
		} else if err != nil {
			log.Fatal(err)
		}
		fmt.Println(string(msg.Data))
	}
}
