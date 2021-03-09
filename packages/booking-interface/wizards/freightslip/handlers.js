const { Markup } = require('telegraf')
const Composer = require('telegraf/composer')
const bot = require('../../adapters/bot')
const services = require('../../services')
const utils = require('../../utils')
const wizardHelpers = require('../helpers')

const awaitAdditionalInformationOrConfirm = new Composer()
  .action('booking:confirm', (ctx) => {
    return ctx.scene.enter('freightslip')
  })
  .action('booking:add_extra', (ctx) => {
    console.log('booking wants extra')
  })

const awaitFreightSlipAnswer = new Composer()
  .action('freightslip:confirm', (ctx) =>
    wizardHelpers.jumpToStep(ctx, 'askForUpload')
  )
  .action('freightslip:decline', (ctx) => {
    console.log('hasFreightSlipDecline')
    // wizardHelpers.jumpToStep(ctx, 'askForRecipientInput')
  })

const awaitSenderOrRecipientConfirmation = new Composer()
  .action('freightslip:is_sender', (ctx) => {})
  .action('freightslip:is_recipient', (ctx) => {
    const { state } = ctx.scene.session
    state.booking = { to: state.matches[0] }
    return wizardHelpers.jumpToStep(ctx, 'askForLocation')
  })

const awaitLocationAlternativeSelect = new Composer()
  .action('location:from_location', (ctx) => {
    return wizardHelpers.jumpToStep(ctx, 'askForSenderLocationConfirm')
  })
  .action('location:from_manual', (ctx) => {})
  .action('location:from_freightslip', (ctx) => {})

const awaitSenderLocationConfirm = new Composer().on('location', (ctx) => {
  const { state } = ctx.scene.session

  state.booking = Object.assign({}, state.booking, {
    from: Object.assign({}, state.booking.from, {
      location: ctx.message.location,
    }),
  })

  return wizardHelpers.jumpToStep(ctx, 'askAddAdditionalInformation')
})

const askAddAdditionalInformation = (ctx) => {
  return ctx
    .replyWithMarkdown(
      `Tack. Då har du fått bokningsnummer: ZS5C. Anteckna detta på försändelsen.`,
      Markup.inlineKeyboard([
        Markup.callbackButton('Fyll i fler detaljer', 'booking:add_extra'),
        Markup.callbackButton('Påbörja nästa bokning', 'booking:confirm'),
      ]).extra()
    )
    .then(() => ctx.wizard.next())
}

const askForLocation = (ctx) => {
  return ctx
    .replyWithMarkdown(
      `Tack! Vill du skicka din nuvarande position\n som avsändaradress?`,
      Markup.inlineKeyboard([
        Markup.callbackButton('Ja', 'location:from_location'),
        Markup.callbackButton(
          'Nej, hämta från fraktsedeln',
          'location:from_freightslip'
        ),
        Markup.callbackButton('Nej, skriv in manuellt', 'location:from_manual'),
      ]).extra()
    )
    .then(() => ctx.wizard.next())
}

const intro = (ctx) =>
  ctx
    .replyWithMarkdown(
      `Har din försändelse en fraktsedel?`,
      Markup.inlineKeyboard([
        Markup.callbackButton('Ja', 'freightslip:confirm'),
        Markup.callbackButton('Nej', 'freightslip:decline'),
      ]).extra()
    )
    .then(() => ctx.wizard.next())

const askForUpload = (ctx) =>
  ctx
    .reply(
      'Ta en bild på fraktsedeln eller addresslappen och skicka den till mig!'.concat(
        `\nFörsök ta bilden så nära det går och i så bra ljus som möjligt.`
      )
    )
    .then(() => ctx.wizard.next())

const awaitImageUpload = new Composer().on('photo', async (ctx) => {
  const photos = ctx.update.message.photo
  const [{ file_id }] = Array.from(photos).reverse()

  const fileLink = await services.bot.getFileLink(bot, file_id)

  // const photo = Buffer.from(response.data, 'binary').toString('base64')

  try {
    const text = await services.text.getTextFromPhoto(fileLink)

    if (text) {
      const { state } = ctx.scene.session

      Object.assign(state, {
        matches: await utils.scanAddress(text),
      })

      return wizardHelpers.jumpToStep(
        ctx,
        'askForSenderOrRecipientConfirmation'
      )
    }
  } catch (error) {
    console.warn('something went wrong: ', error)
  }
})

const askForSenderOrRecipientConfirmation = (ctx) => {
  const [match] = ctx.scene.session.state.matches

  if (!match) return // enter manually or something

  return ctx
    .replyWithMarkdown(
      `${match.name}`
        .concat(`\n${match.address}`)
        .concat(`\n${match.postCode}`)
        .concat(`\n${match.city}`),
      Markup.inlineKeyboard([
        Markup.callbackButton('Mottagare', 'freightslip:is_sender'),
        Markup.callbackButton('Avsändare', 'freightslip:is_recipient'),
      ]).extra()
    )
    .then(() => ctx.wizard.next())
}

const askForSenderLocationConfirm = (ctx) => {
  return ctx
    .replyWithMarkdown(
      Markup.keyboard([
        Markup.locationRequestButton('📍 Dela position'),
      ]).oneTime()
    )
    .then(() => ctx.wizard.next())
}

module.exports = [
  intro,
  awaitFreightSlipAnswer,
  askForUpload,
  awaitImageUpload,
  askForSenderOrRecipientConfirmation,
  awaitSenderOrRecipientConfirmation,
  askForLocation,
  awaitLocationAlternativeSelect,
  askForSenderLocationConfirm,
  awaitSenderLocationConfirm,
  askAddAdditionalInformation,
  awaitAdditionalInformationOrConfirm,
]
