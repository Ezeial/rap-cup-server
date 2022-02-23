const randomstring = require("randomstring")

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

const isValidPseudo = (pseudo) => {
	return (2 < pseudo.length && pseudo.length < 10) === true
}

module.exports = (async function(fastify, opts) {
	const roomManager = new RoomManager()

	fastify.post('/', async (req, reply) => {
		const { pseudo } = JSON.parse(req.body)

		if (!isValidPseudo(pseudo))
			return reply.code(400).send({ error: "Pseudo must be between 2 and 10 character"})

		const roomID = randomstring.generate(4).toUpperCase()

		while (roomManager.rooms.find(room => room.roomID === roomID))
			roomID = randomstring.generate(4).toUpperCase()
		
		const err = roomManager.addRoom(roomID)

		if (err)
			reply.code(400).send({ error: err.error })
		
		return { roomID }
	})

	fastify.io.on("connection", (socket) => {
		socket.on("room:join", (roomID, username) => {
			const err = roomManager.joinRoom(roomID, socket, username)
			if (err)
				return console.error("An error has occured joining the room : ", err.error)
			
			socket.join(roomID)
			socket.emit("room:join:sucess", roomID)
		})

		socket.on("room:log", () => {
			roomManager.log()
		})
	})
})