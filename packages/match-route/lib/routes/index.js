const uuid = require('uuid/v4')
const osrm = require('../services/osrm')
const {
  pub,
  redis
} = require('../adapters/redis')

const persons = []
const routes = {}
const pendingRoutes = {}

module.exports = (app, io) => {
  redis.psubscribe('changeRequested:*', (err, count) => console.log(count))
  redis.psubscribe('routeCreated:*', (err, count) => console.log(count))
  io.on('connection', client => {
    console.log('socket connected', client.id)
    const socketId = client.id
    client.on('event', async e => {
      console.log('event received:', e)
      const event = JSON.parse(e)
      if (event.type === "driver") {
        const driverId = uuid()
        const acceptsBeingPassenger = event.payload.acceptsBeingPassenger
        const route = await getBestRouteAsDriver(event.payload)
        addPendingTrip(driverId, route)
        await pub.lpush(driverId, JSON.stringify(socketId))
        io.to(socketId).emit('changeRequested', driverId)
        if (acceptsBeingPassenger || acceptsBeingPassenger === undefined) {
          console.log('subscribing to id:', driverId)
          const bestMatch = await getMatchForPassenger(event.payload)
          if (bestMatch) {
            const {
              match,
              id
            } = bestMatch
            match.ids = [driverId]
            addPendingTrip(id, match)
            await pub.publish(`changeRequested:${id}`, driverId)
          }
          addPersonToList(event.payload, driverId)
        }
      } else if (event.type === 'passenger') {
        const passengerId = uuid()
        const bestMatch = await getMatchForPassenger(event.payload)
        if (bestMatch) {
          const {
            match,
            id
          } = bestMatch
          match.ids = [passengerId]
          addPendingTrip(id, match)
          await pub.publish(`changeRequested:${id}`, passengerId)
        }
        await pub.lpush(passengerId, JSON.stringify(socketId))
        console.log('subscribing to id:', passengerId)
        addPersonToList(event.payload, passengerId)
      } else if (event.type === "acceptChange") {
        const {
          id
        } = event.payload
        removeFromPersonsList(id)
        const route = pendingRoutes[id]
        if (!route) {
          let err = `The route with id ${id} is no longer available`
          const key = Object.keys(routes).find(key => routes[key].ids.includes(id))
          if (key) {
            err += `, the driver for that route have joined route ${key}`
            // TODO: if request is sent for removal of the entry in frontend when removing it from pendingRoutes list
            // this specific error, where a driver is present in another route, should not happen.
          }
          throw Error(err)
        }
        console.log('Driver accepted', route)
        try {
          await Promise.all(
            route.ids
            .map(removeFromPendingRoutes)
            .map(removeFromPersonsList)
            .map(passengerId => pub.publish(`routeCreated:${passengerId}`, id))
          )
        } catch (e) {
          console.log('error sending to clients', e)
        }
        delete pendingRoutes[id]
        routes[id] = route

        client.emit('congrats', id)
        // remove passenger from list
      }
    })
  })

  redis.on('pmessage', async (pattern, channel, msg) => {
    console.log('message recevied', pattern, channel, msg)
    const id = channel.replace(pattern.replace('*', ''), '')

    const socketIds = await pub.lrange(id, 0, -1).then(JSON.parse)
    console.log(socketIds)

    if (pattern === 'routeCreated:*') {
      console.log(`congrats to ${socketIds}, routeId: ${msg}`, )

      io.to(socketIds).emit('congrats', msg)
    } else if (pattern === 'changeRequested:*') {
      io.to(socketIds).emit('changeRequested', id)
    } else if (pattern === 'tripUpdated') {
      io.to(socketIds).emit('tripUpdated', id)
    } else {
      console.log('Unhandled redis message ', pattern)
    }
  })

  function removeFromPendingRoutes (id) {
    delete pendingRoutes[id]
    return id
  }

  function removeFromPersonsList (id) {
    const i = persons.findIndex(p => p.id === id)
    persons.splice(i, 1)
    return id
  }

  function addPendingTrip (id, trip) {
    pendingRoutes[id] = trip
  }

  function addPersonToList (person, id = uuid()) {
    persons.push({
      id,
      passengers: person.passengers,
      startDate: person.start.date,
      endDate: person.end.date,
      startPosition: person.start.position,
      endPosition: person.end.position,
    })
    return id
  }

  function getMatchForPassenger ({
    passengers = 1,
    start: {
      date: startDate,
      position: passengerStartPosition
    },
    end: {
      date: endDate,
      position: passengerEndPosition
    },
  }) {
    return Promise.all(Object.entries(routes).map(async ([id, value]) => {
        const stopsCopy = value.stops.slice()
        const [driverStartPosition] = stopsCopy.splice(0, 1)
        const [driverEndPosition] = stopsCopy.splice(stopsCopy.length - 1, 1)
        const permutations = osrm.getPermutationsWithoutIds(stopsCopy, passengerStartPosition, passengerEndPosition)
        const p = permutations.map(p => ({
          coords: p
        }))
        const match = await osrm.bestMatch({
          startPosition: driverStartPosition,
          endPosition: driverEndPosition,
          permutations: p,
          maxTime: value.maxTime
        })
        if (match) {
          return {
            id,
            match: {
              maxTime: value.maxTime,
              route: match.defaultRoute,
              distance: match.distance,
              stops: match.stops,
              duration: match.duration,
              ids: match.ids
            }
          }
        } else {
          return null
        }
      }))
      .then(matches => matches.filter(Boolean).pop())
  }
  app.post(
    '/pickup', async (req, res) => {
      const bestMatch = await getMatchForPassenger(req.body)
      if (bestMatch) {
        const match = bestMatch.match
        const result = {
          route: match.defaultRoute,
          distance: match.distance,
          stops: match.stops,
          duration: match.duration,
        }
        res.send(result)
      } else {
        addPersonToList(req.body)
        res.sendStatus(200)
      }
    }
  )

  async function getBestRouteAsDriver ({
    maximumAddedTimePercent = 50,
    emptySeats = 3,
    start: {
      date: startDate,
      position: startPosition
    },
    end: {
      date: endDate,
      position: endPosition
    },
  }) {
    const defaultRoute = await osrm.route({
      startPosition,
      endPosition,
    })
    const toHours = duration => duration / 60 / 60

    const defaultRouteDuration = toHours(defaultRoute.routes[0].duration)
    const maxTime = defaultRouteDuration + defaultRouteDuration * (maximumAddedTimePercent / 100)
    const permutations = osrm.getPermutations(persons, emptySeats)

    const bestMatch =
      (await osrm.bestMatch({
        startPosition,
        endPosition,
        permutations,
        maxTime
      })) || {}

    console.log({
      bestMatch,
      emptySeats,
      startDate,
      startPosition,
      endDate,
      endPosition,
    })
    let result
    if (Object.entries(bestMatch).length) {
      result = {
        maxTime,
        route: bestMatch.defaultRoute,
        distance: bestMatch.distance,
        stops: bestMatch.stops,
        duration: bestMatch.duration,
        ids: bestMatch.ids
      }
    } else {
      const {
        routes: [{
          duration: routeDuration,
          distance,
        }],
      } = defaultRoute

      result = {
        maxTime,
        route: defaultRoute,
        distance,
        stops: [startPosition, endPosition],
        duration: toHours(routeDuration),
        ids: []
      }
    }

    return result
  }
  app.post('/route', async (req, res) => {
    try {
      const id = uuid()
      const result = await getBestRouteAsDriver(req.body)
      routes[id] = result
      res.send({
        id,
        ...result,
      })
    } catch (error) {
      console.error(error)
      res.sendStatus(500)
    }

  })

  app.get('/route/:id', ({
    params: {
      id
    }
  }, res) => {
    console.log('received msg', id)

    const route = routes[id]

    if (!route) {
      return res.sendStatus(400)
    }

    res.send(route)
  })

  app.get('/pending-route/:id', ({
    params: {
      id
    }
  }, res) => {
    const route = pendingRoutes[id]

    if (!route) {
      return res.sendStatus(400)
    }
    console.log('returning', route)

    res.send(route)
  })
}