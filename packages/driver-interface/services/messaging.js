const bot = require('../adapters/bot')
const Markup = require('telegraf/markup')
const { open } = require('../adapters/amqp')
const moment = require('moment')
const { getDirectionsFromActivities, getDirectionsUrl } = require('./google')
const replyQueues = new Map()

const onBotStart = (ctx) => {
  ctx.reply(
    "Välkommen till Predictive Movement. När du loggat in kan du agera som förare och hämta och leverera paket i vårt system. Logga in genom att skriva '/login'."
  )
}

const sendPickupOffer = (
  chatId,
  msgOptions,
  { startingAddress, route, activities, bookingIds }
) => {
  replyQueues.set(msgOptions.correlationId, msgOptions.replyQueue)

  const directions = getDirectionsFromActivities(activities)

  const message = `${
    bookingIds.length
  } paket finns att hämta. Rutten börjar på ${startingAddress}. Turen beräknas att ta cirka ${moment
    .duration({ seconds: route.duration })
    .humanize()}. Vill du ha denna order?
  [Se på kartan](${directions})`

  bot.telegram.sendMessage(parseInt(chatId, 10), message, {
    parse_mode: 'markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Nej',
            callback_data: JSON.stringify({
              a: false,
              id: msgOptions.correlationId,
              e: 'offer',
            }),
          },
          {
            text: 'Ja',
            callback_data: JSON.stringify({
              a: true,
              id: msgOptions.correlationId,
              e: 'offer',
            }),
          },
        ],
      ],
    },
  })
}

const onPickupConfirm = (ctx) => {
  const { id } = JSON.parse(ctx.update.callback_query.data)

  return ctx.replyWithMarkdown(
    'Härligt, nu kan du köra paketet till dess destination!',
    Markup.inlineKeyboard([
      Markup.callbackButton(
        'Levererat',
        JSON.stringify({ e: 'delivered', id })
      ),
    ]).extra()
  )
}

const onPickupOfferResponse = (isAccepted, options, msg) => {
  msg.editMessageReplyMarkup()
  msg.answerCbQuery()
  msg.reply(isAccepted ? 'Kul!' : 'Tråkigt, kanske nästa gång!')

  const replyQueue = replyQueues.get(options.id)

  if (!replyQueue)
    return Promise.reject(`missing reply queue for ${options.id}`)

  return open
    .then((conn) => conn.createChannel())
    .then((ch) => {
      ch.sendToQueue(replyQueue, Buffer.from(isAccepted.toString()), {
        correlationId: options.id,
      })
    })
    .catch(console.warn)
}

const onNoInstructionsForVehicle = (ctx) =>
  ctx.reply('Vi kunde inte hitta några instruktioner...')

const onInstructionsForVehicle = (activities, bookingIds, id) => {
  const directions = getDirectionsFromActivities(activities)

  return bot.telegram.sendMessage(
    id,
    `${bookingIds.length} paket finns att hämta.[Se på kartan](${directions}).`,
    { parse_mode: 'markdown' }
  )
}

const sendDriverFinishedMessage = (telegramId) =>
  bot.telegram.sendMessage(telegramId, 'Bra jobbat! Tack för idag!')

const sendDeliveryInstruction = (instruction, telegramId, booking) => {
  return bot.telegram.sendMessage(
    telegramId,
    `🎁 Leverera paket "${instruction.id}" [${
      booking.pickup.street
        ? `vid ${booking.delivery.street}, ${booking.delivery.city}`
        : 'här'
    }](${
      booking.delivery.street && booking.delivery.city
        ? getDirectionsUrl(booking.delivery.street, booking.delivery.city)
        : getDirectionsUrl(instruction.address.lat, instruction.address.lon)
    })!
    `
      .concat(
        booking.metadata &&
          booking.metadata.recipient &&
          booking.metadata.recipient.contact
          ? 'När du kommit fram till leveransplatsen kan du nå mottagaren på ' +
              booking.metadata.recipient.contact
          : ''
      )
      .concat(
        booking.metadata &&
          booking.metadata.recipient &&
          booking.metadata.recipient.doorCode
          ? `\nPortkod: ${booking.metadata.recipient.doorCode}`
          : ''
      ).concat(`
    Tryck "[Levererat]" när du har lämnat paketet.`),
    {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Levererat',
              callback_data: JSON.stringify({
                e: 'delivered',
                id: instruction.id,
              }),
            },
          ],
        ],
      },
    }
  )
}

const sendPickupInstruction = (instruction, telegramId, booking) => {
  return bot.telegram.sendMessage(
    telegramId,
    `🎁 Hämta paket "${instruction.id}" [${
      booking.pickup.street
        ? `vid ${booking.pickup.street}, ${booking.pickup.city}`
        : 'här'
    }](${
      booking.pickup.street && booking.pickup.city
        ? getDirectionsUrl(booking.pickup.street, booking.pickup.city)
        : getDirectionsUrl(instruction.address.lat, instruction.address.lon)
    })!
    `
      .concat(
        booking.metadata &&
          booking.metadata.sender &&
          booking.metadata.sender.contact
          ? '\nNär du kommit fram till upphämtningsplatsen kan du nå avsändaren på ' +
              booking.metadata.sender.contact
          : ''
      )
      .concat(
        booking.metadata &&
          booking.metadata.sender &&
          booking.metadata.sender.doorCode
          ? `\nPortkod: ${booking.metadata.sender.doorCode}`
          : ''
      )
      .concat(
        booking.size.weight ||
          booking.size.measurement ||
          booking.metadata.fragile
          ? '\n\nPaketinformation:'
          : ''
      )
      .concat(`\nÖmtåligt: ${booking.metadata.fragile ? 'Ja' : 'Nej'}`)
      .concat(booking.size.weight && `\nVikt: ${booking.size.weight}kg`)
      .concat(
        booking.size.measurement &&
          `\nMått: ${booking.size.measurement[0]}x${booking.size.measurement[1]}x${booking.size.measurement[2]}cm`
      ).concat(`
    Tryck på "[Hämtat]" när du hämtat upp paketet.`),
    {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Hämtat',
              callback_data: JSON.stringify({
                e: 'picked_up',
                id: instruction.id,
              }),
            },
          ],
        ],
      },
    }
  )
}

module.exports = {
  onNoInstructionsForVehicle,
  onInstructionsForVehicle,
  onBotStart,
  sendPickupOffer,
  sendPickupInstruction,
  sendDeliveryInstruction,
  onPickupConfirm,
  onPickupOfferResponse,
  sendDriverFinishedMessage,
}
