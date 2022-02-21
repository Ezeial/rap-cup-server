const pl = require('fastify-plugin')
const { Server } = require('socket.io')

module.exports = pl(async function (fastify, opts) {
	fastify.decorate('io', new Server(fastify.server, opts))
	
	fastify.addHook('onClose', (fastify, done) => {
		fastify.io.close()
		done()
	})
})