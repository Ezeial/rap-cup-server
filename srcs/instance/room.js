class Player
{
	constructor (_socket, _username)
	{
		this.socket = _socket
		this.username = _username
	}

	log()
	{
		console.log("USERNAME :", this.username, "\n")
		console.log("SOCKET ID:", this.socket.id, "\n")
	}
}

class Room
{
	maxSize = 4
	players = []
	constructor (_roomID)
	{
		this.roomID = _roomID
	}

	addPlayer(socket, username)
	{
		if (this.players.length >= this.maxSize)
			return { error: "Lobby full" }
		this.players.push(new Player(socket, username))	
	}

	log()
	{
		console.log("==========================")
		console.log("ROOM : ", this.roomID, "\n")
		console.log("Player currently in :\n")
		this.players.forEach(player => {
			player.log()
		})	
		console.log("==========================")
	}
}

class RoomManager
{
	rooms = []

	addRoom(roomID)
	{
		if (this.rooms.find(room => room.roomID === roomID))
			return { error: "This room already exists" }
		this.rooms.push(new Room(roomID))
	}

	joinRoom(roomID, socket, username)
	{
		if (!this.rooms.find(room =>room.roomID === roomID))
			return { error: "This room doesn't exists" }
		return this.get(roomID).addPlayer(socket, username)
	}

	get(roomID)
	{
		return this.rooms.find((room) => room.roomID === roomID)
	}

	log()
	{
		this.rooms.forEach(room => room.log())
	}
}

module.exports = (async function(fastify, opts) {
	const roomManager = new RoomManager()

	fastify.io.on("connection", (socket) => {
		socket.on("room:create", (username) => {
			const roomID = "667"
			
			const err = roomManager.addRoom(roomID)

			if (err)
				return console.error("An error has occur creating the room : ", err.error)
			
			roomManager.joinRoom(roomID, socket, username)
		})

		socket.on("room:join", (roomID, username) => {
			const err = roomManager.joinRoom(roomID, socket, username)

			if (err)
				return console.error("An error has occured joining the room : ", err.error)

			socket.emit("room:join:sucess")
		})

		socket.on("room:log", () => {
			roomManager.log()
		})
	})
})