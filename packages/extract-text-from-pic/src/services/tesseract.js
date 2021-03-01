const textract = require('textract')

const config = {
  lang: 'swe',
  oem: 1,
  psm: 3,
}

function extractTextFromImageUrl(url) {
  return new Promise((resolve) => {
    textract.fromUrl(url, config, (error, text) => resolve(text))
  })
}

function extractTextFromImage(img) {
  return new Promise((resolve) => {
    textract.fromBufferWithMime(img, config, (error, text) => {
      resolve(text)
    })
  })
}

module.exports = {
  extractTextFromImageUrl,
  extractTextFromImage,
}