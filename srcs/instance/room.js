const randomstring = require("randomstring")

class Player
{
	teamNumber = -1

	constructor (_socket, _username)
	{
		this.socket = _socket
		this.username = _username
	}

	setTeamNumber(newTeamNumber)
	{
		this.teamNumber = newTeamNumber
	}

	computeData()
	{
		return { username: this.username, teamNumber: this.teamNumber }
	}
}

class Team
{
	teamName = ''
	teamMaxSize = 2
	players = []

	constructor(_number)
	{
		this.number = _number
	}

	setName(newName)
	{
		this.teamName = newName
	}

	joinTeam(player)
	{
		player.setTeamNumber(this.number)	
	}

	computeData()
	{
		return { teamNumber: this.number, teamName: this.teamName }
	}
}

class Room
{
	maxSize = 4
	players = []
	teams = [new Team(0), new Team(1)]

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

	computeData()
	{
		return {
			players: this.players.map(player => player.computeData()),
			teams: this.teams.map(team => team.computeData())
		}
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
		const room = this.rooms.find((room) => room.roomID === roomID)
		if (!room)
			return { error: "This room doesn't exist" }
		return room
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

	fastify.put('/', async (req, reply) => {
		const { pseudo, roomID } = JSON.parse(req.body)

		if (!isValidPseudo(pseudo))
			return reply.code(400).send({ error: "Pseudo must be between 2 and 10 character"})

		const room = roomManager.get(roomID)
		
		if (room.error)
			return reply.code(400).send({ error: res.error })
		
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

		socket.on("room:polldata", (roomID) => {
			const room = roomManager.get(roomID)
			if (room.error) 
				return socket.send("room:error", room.error)
			socket.emit("room:senddata", room.computeData())
		})

		socket.on("room:team:rename", (roomID, teamNumber, newName) => {
			const room = roomManager.get(roomID)
			if (room.error)
				return
			const team = room.teams.find(team => teamNumber === team.number)
			if (!team)
				return 
			team.teamName = newName
			fastify.io.to(roomID).emit("room:senddata", room.computeData())
		})

		socket.on("room:team:join", (roomID, username, teamNumber) => {
			const room = roomManager.get(roomID)
			if (room.error)
				return
			const team = room.teams.find(team => teamNumber === team.number)
			if (!team)
				return
			const player = room.players.find((p) => p.username === username)
			if (!player)
				return 
			team.joinTeam(player)
			fastify.io.to(roomID).emit("room:senddata", room.computeData())
		})
	})
})