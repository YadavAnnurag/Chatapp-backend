import { WebSocketServer, WebSocket } from "ws";

type Client = {
  socket: WebSocket;
  room: string;
};

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });


let allSockets: Client[] = [];

function broadcastRoomCount(roomId: string) {
  const count = allSockets.filter(c => c.room === roomId).length;

  for (const client of allSockets) {
    if (client.room === roomId && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(
        JSON.stringify({
          type: "count",
          count,
        })
      );
    }
  }
}


wss.on("connection", (socket) => {
  socket.on("message", (message) => {
    const parsedMessage = JSON.parse(message.toString());

    if (parsedMessage.type === "join") {
      allSockets = allSockets.filter(c => c.socket !== socket);

      allSockets.push({
        socket,
        room: parsedMessage.payload.roomId,
      });

      broadcastRoomCount(parsedMessage.payload.roomId);
    }


    if (parsedMessage.type === "chat") {
      let currentUserRoom: string | null = null;

      for (const client of allSockets) {
        if (client.socket === socket) {
          currentUserRoom = client.room;
        }
      }

      if (!currentUserRoom) return;

      for (const client of allSockets) {
        if (
          client.room === currentUserRoom &&
          client.socket.readyState === WebSocket.OPEN
        ) {
          client.socket.send(
            JSON.stringify({
              type: "chat",
              payload: {
                text: parsedMessage.payload.text,
                senderId: parsedMessage.payload.senderId,
              },
            })
          );


        }
      }
    }
  });

  socket.on("close", () => {
    const client = allSockets.find(c => c.socket === socket);
    if (!client) return;

    const roomId = client.room;
    allSockets = allSockets.filter(c => c.socket !== socket);

    broadcastRoomCount(roomId);
  });

});
