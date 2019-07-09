const uuid = require('uuid/v4')

const osrm = require('../services/osrm')

const persons = []
const routes = {}

module.exports = app => {
  app.post(
    '/pickup',
    (
      {
        body: {
          passengers = 1,
          start: { date: startDate, position: startPosition },
          end: { date: endDate, position: endPosition },
        },
      },
      res
    ) => {
      persons.push({
        id: uuid(),
        passengers,
        startDate,
        startPosition,
        endDate,
        endPosition,
      })

      res.sendStatus(200)
    }
  )

  app.post(
    '/route',
    async (
      {
        body: {
          emptySeats = 4,
          start: { date: startDate, position: startPosition },
          end: { date: endDate, position: endPosition },
        },
      },
      res
    ) => {
      try {
        const defaultRoute =
          (await osrm.route({
            startPosition,
            endPosition,
            extras: [],
          })) || {}

        const bestMatch =
          (await osrm.bestMatch({
            startPosition,
            endPosition,
            extras: persons,
            emptySeats,
          })) || {}

        console.log({
          defaultRoute,
          bestMatch,
          emptySeats,
          startDate,
          startPosition,
          endDate,
          endPosition,
        })

        const id = uuid()

        const result = {
          route: bestMatch.defaultRoute,
          distance: bestMatch.distance,
          stops: bestMatch.stops,
          duration: bestMatch.duration,
        }

        routes[id] = result

        res.send({
          id,
          ...result,
        })
      } catch (error) {
        console.error(error)
        res.sendStatus(500)
      }
    }
  )

  app.get('/route/:id', ({ params: { id } }, res) => {
    const route = routes[id]

    if (!route) {
      return res.sendStatus(400)
    }

    res.send(route)
  })
}

