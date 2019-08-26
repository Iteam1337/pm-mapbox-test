import { RequestHandler } from 'express'
import genRequests from '../services/genRequests'
import hasProp from '../util/hasProp'

export const handler: RequestHandler = async ({ query }, res) => {
  let destinationJSON: any
  try {
    destinationJSON = JSON.parse(
      hasProp(query, 'destination') && query.destination
    )
  } catch (_) {
    //
  }

  const wait = hasProp(query, 'wait') && query.wait === 'true'

  const destination =
    destinationJSON &&
    hasProp(destinationJSON, 'lat') &&
    hasProp(destinationJSON, 'lon') &&
    typeof destinationJSON.lat === 'number' &&
    typeof destinationJSON.lon === 'number'
      ? destinationJSON
      : undefined

  const count =
    hasProp(query, 'count') &&
    !isNaN(Number.parseFloat(query.count)) &&
    Number.parseInt(query.count, 10)

  const params = {
    destination,
    count:
      typeof count === 'number'
        ? Math.max(1, Math.min(count, 256))
        : undefined,
  }

  if (!wait) {
    res.status(200).send(null)
    await genRequests(params)
    return
  }

  const response = await genRequests(params)

  res.status(200).json(response)
}

export default handler
