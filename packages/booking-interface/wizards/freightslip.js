const { Markup } = require('telegraf')
const WizardScene = require('telegraf/scenes/wizard')
const bot = require('../adapters/bot')
const axios = require('axios')
const services = require('../services')

const messages = {
  LOCATION_REQUEST_DENIED: 'location_request_denied',
  LOCATION_REQUEST_GRANTED: 'location_request_granted',
}

const forceNext = (ctx) => {
  ctx.wizard.next()
  ctx.wizard.steps[ctx.wizard.cursor](ctx)
}

const intro = (ctx) =>
  ctx
    .reply(
      'Ta en bild på fraktsedeln eller addresslappen och skicka den till mig!'.concat(
        `\nFörsök ta bilden så nära det går och i så bra ljus som möjligt.`
      )
    )
    .then(() => ctx.wizard.next())

const handleImage = async (ctx) => {
  if (!ctx.message.photo) {
    ctx.reply(
      'Jag förstår inte ditt meddelande. Till mig kan du bara skicka bilder! :)'
    )
  }

  const photos = ctx.update.message.photo
  const [{ file_id }] = Array.from(photos).reverse()

  const fileLink = await bot.telegram.getFileLink(file_id)
  const response = await axios.get(fileLink, {
    responseType: 'arraybuffer',
  })

  const photo = Buffer.from(response.data, 'binary').toString('base64')

  return services.amqp
    .publishFreightslipPhoto(photo)
    .then(() =>
      ctx.reply('Tack! Bilden har tagits emot och skickats till plattformen.')
    )
  // ctx.wizard.state = { photo }
  // return forceNext(ctx)
}

// const askLocationRequest = (ctx) =>
//   ctx
//     .reply('Vill du även dela din position?', {
//       reply_markup: Markup.inlineKeyboard([
//         Markup.callbackButton('Ja', messages.LOCATION_REQUEST_GRANTED),
//         Markup.callbackButton('NEJ', messages.LOCATION_REQUEST_DENIED),
//       ]).oneTime(),
//       // reply_markup: Markup.keyboard([
//       //   Markup.locationRequestButton('📍 Dela position'),
//       // ]).oneTime(),
//     })
//     .then(() => ctx.wizard.next())

const freightslip = new WizardScene(
  'freightslip',
  intro,
  handleImage
  // askLocationRequest
)

freightslip.action(messages.LOCATION_REQUEST_DENIED, () =>
  console.log('denied')
)

module.exports = freightslip
