import { Message } from 'telegraf/typings/telegram-types'
import bot from '../adapters/bot'
import * as helpers from '../helpers'
import { Booking, Instruction } from '../types'
import { getDirectionsFromActivities, getDirectionsUrl } from './google'
import { getAddressFromCoordinate } from './pelias'

export const onBotStart = (ctx) => {
  ctx.reply(
    "Välkommen till Predictive Movement. När du loggat in kan du agera som förare och hämta och leverera paket i vårt system. Logga in genom att skriva '/login'."
  )
}

export const onPromptUserForTransportId = (ctx) => ctx.reply('Ange ditt transport-id')

export const onNoVehicleFoundFromId = (ctx) =>
  ctx.reply('Inget fordon som matchar ditt angivna ID kunde hittas...')

export const onDriverLoginSuccessful = (ctx) =>
  ctx.reply(
    'Tack! Du kommer nu få instruktioner för hur du ska hämta upp de bokningar som du har tilldelats.'
  )

export const onNoInstructionsForVehicle = (ctx) =>
  ctx.reply('Vi kunde inte hitta några instruktioner...')

export const onInstructionsForVehicle = (activities, bookingIds, id): Promise<Message> => {
  const directions = getDirectionsFromActivities(activities)

  return bot.telegram.sendMessage(
    id,
    `${bookingIds.length} paket finns att hämta. [Se på kartan](${directions}).`,
    { parse_mode: 'Markdown' }
  )
}

export const sendDriverFinishedMessage = (telegramId: string): Promise<Message> =>
  bot.telegram.sendMessage(telegramId, 'Bra jobbat! Tack för idag!')

export const sendPickupInstruction = async (
  instructionGroup: Instruction[],
  telegramId: string,
  bookings: Booking[]
): Promise<Message> => {
  const [firstBooking] = bookings
  const pickup =
    firstBooking.pickup.street && firstBooking.pickup.city
      ? `${firstBooking.pickup.street}, ${firstBooking.pickup.city}`
      : await getAddressFromCoordinate({ ...firstBooking.pickup })

  const delivery =
    firstBooking.delivery.street && firstBooking.delivery.city
      ? `${firstBooking.delivery.street}, ${firstBooking.delivery.city}`
      : await getAddressFromCoordinate({ ...firstBooking.delivery })

  const message = (instructionGroup.length === 1
    ? `🎁 Hämta paket "${helpers
        .getLastFourChars(instructionGroup[0].id)
        .toUpperCase()}" vid [${pickup}](${getDirectionsUrl(
        pickup
      )}) och leverera det sedan till ${delivery}!`
    : `🎁 Hämta följande paket:
${instructionGroup
  .map((ig, i) => `${++i}. ${helpers.getLastFourChars(ig.id).toUpperCase()}`)
  .join('\n')}\nvid [${pickup}](${getDirectionsUrl(pickup)})`
  ).concat('\nTryck på "[Framme]" när du har anlänt till destinationen.')

  return bot.telegram.sendMessage(telegramId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Framme',
            callback_data: JSON.stringify({
              e: 'arrived',
            }),
          },
        ],
      ],
    },
    disable_web_page_preview: true,
  })
}

export const sendDeliveryInstruction = async (
  instructionGroup: Instruction[],
  telegramId: string,
  bookings: Booking[]
): Promise<Message> => {
  const [firstBooking] = bookings
  const delivery =
    firstBooking.delivery.street && firstBooking.delivery.city
      ? `${firstBooking.delivery.street}, ${firstBooking.delivery.city}`
      : await getAddressFromCoordinate({ ...firstBooking.delivery })

  const message = (instructionGroup.length === 1
    ? `🎁 Leverera paket "${helpers
        .getLastFourChars(instructionGroup[0].id)
        .toUpperCase()}" `
    : `🎁 Leverera följande paket:
  ${instructionGroup
    .map((ig, i) => `${++i}. ${helpers.getLastFourChars(ig.id).toUpperCase()}`)
    .join('\n')}\n`
  )
    .concat(`till [${delivery}](${getDirectionsUrl(delivery)})!\n`)
    .concat('Tryck "[Framme]" när du har anlänt till destinationen.')
  return bot.telegram.sendMessage(telegramId, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Framme',
            callback_data: JSON.stringify({
              e: 'arrived',
            }),
          },
        ],
      ],
    },
    disable_web_page_preview: true,
  })
}

export const sendPickupInformation = (instructionGroupId: string, telegramId: string, bookings: Booking[]): Promise<Message> => {
  const totalWeight = bookings.reduce(
    (prev, curr) => prev + curr.size.weight || 0,
    0
  )
  const heaviestPackage = Math.max(...bookings.map((b) => b.size.weight || 0))

  const packageInfos = bookings
    .map((b) =>
      `\nID: ${helpers.getLastFourChars(b.id).toUpperCase()}\n`
        .concat(
          b.metadata?.sender?.info
            ? `Extra information vid upphämtning: ${b.metadata.sender.info}\n`
            : ''
        )
        .concat(`Ömtåligt: ${b.metadata?.fragile ? 'Ja' : 'Nej'}`)
        .concat(b.size.weight ? `\nVikt: ${b.size.weight}kg` : '')
        .concat(
          b.size.measurement && b.size.measurement.length === 3
            ? `\nMått: ${b.size.measurement[0]}x${b.size.measurement[1]}x${b.size.measurement[2]}cm`
            : ''
        )
    )
    .join('\n')

  const message = (bookings[0].metadata?.sender?.contact
    ? `Du kan nu nå avsändaren på ${bookings[0].metadata.sender.contact}`
    : ''
  )
    .concat('\n\n***Paketinformation***')
    .concat(
      bookings.length > 1
        ? `\nTotal vikt: ${Math.round(totalWeight * 100) / 100}kg`.concat(
            `\nDet tyngsta paketet väger ${heaviestPackage}kg\n`
          )
        : ''
    )

    .concat(packageInfos)
    .concat(
      `\n\nTryck på "[Hämtat]" när du hämtat upp ${
        bookings.length > 1 ? 'paketen' : 'paketet'
      }.`
    )

  return bot.telegram.sendMessage(telegramId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Hämtat',
            callback_data: JSON.stringify({
              e: 'picked_up',
              id: instructionGroupId,
            }),
          },
        ],
      ],
    },
    disable_web_page_preview: true,
  })
}

export const sendDeliveryInformation = (
  instructionGroup: Instruction[],
  instructionGroupId: string,
  telegramId: string,
  bookings: Booking[]
): Promise<Message> => {
  const [firstBooking] = bookings
  return bot.telegram.sendMessage(
    telegramId,
    ` ${
      firstBooking.metadata?.recipient?.contact
        ? 'Du kan nu nå mottagaren på ' +
          firstBooking.metadata.recipient.contact
        : ''
    }`
      .concat(
        firstBooking.metadata?.recipient?.info
          ? `\nExtra information vid avlämning: ${firstBooking.metadata.recipient.info}`
          : ''
      )
      .concat(
        `\nTryck "[Levererat]" när du har lämnat ${
          instructionGroup.length > 1 ? 'paketen' : 'paketet'
        }, eller "[Kunde inte leverera]" om du av någon anledning inte kunde leverera ${
          instructionGroup.length > 1 ? 'paketen' : 'paketet'
        }.`
      ),
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Levererat',
              callback_data: JSON.stringify({
                e: 'delivered',
                id: instructionGroupId,
              }),
            },
            {
              text: 'Kunde inte leverera',
              callback_data: JSON.stringify({
                e: 'delivery_failed',
                id: instructionGroupId,
              }),
            },
          ],
        ],
      },
      disable_web_page_preview: true,
    }
  )
}