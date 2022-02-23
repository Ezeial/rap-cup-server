/*
**	REQUIRING MODULES
*/

const fastify = require("fastify")
const fastifyCors = require('fastify-cors')
const fastifySocket = require("./plugins/socket")
const roomInstance = require("./instance/room")

/*
**	CREATING SERVER INSTANCE
*/

const server = fastify()

/*
**	REGISTERING PLUGINS
*/

server.register(fastifyCors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],	
})

server.register(fastifySocket, {
	cors: {
		origin: "http://localhost:3000",
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],	
	}
})

/*
**	ROOM HUB
*/

server.register(roomInstance, { prefix: '/room'} )

/*
**	LAUNCH THE SERVER
*/

server.listen(3001, (error, adress) => {
	if (error) {
		server.log.error(error)
		process.exit(1)
	}
	console.log(`Server listening on ${adress}`)
})