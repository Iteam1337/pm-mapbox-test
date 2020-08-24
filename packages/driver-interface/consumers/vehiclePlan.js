const { addVehicle } = require('../services/cache')

const {
  open,
  queues: { SEND_PLAN_TO_VEHICLE },
  exchanges: { OUTGOING_VEHICLE_UPDATES },
} = require('../adapters/amqp')

const vehiclePlan = () => {
  return open
    .then((conn) => conn.createChannel())
    .then((ch) =>
      ch
        .assertQueue(SEND_PLAN_TO_VEHICLE, {
          durable: false,
        })
        .then(() =>
          ch.assertExchange(OUTGOING_VEHICLE_UPDATES, 'topic', {
            durable: false,
          })
        )
        .then(() => ch.bindQueue(SEND_PLAN_TO_VEHICLE, OUTGOING_VEHICLE_UPDATES, 'plan_updated'))
        .then(() =>
          ch.consume(SEND_PLAN_TO_VEHICLE, (msg) => {
            const vehicle = JSON.parse(msg.content.toString())
            if (vehicle.metadata && vehicle.metadata.telegram) {
              addVehicle(vehicle.metadata.telegram.senderId, vehicle)
              ch.ack(msg)
            }
          })
        )
    )
}

module.exports = vehiclePlan
