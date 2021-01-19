import OpenAPIBackend from 'openapi-backend'
import express from 'express'
import * as routeHandlers from './routeHandlers'

const app = express()
app.use(express.json())

const api = new OpenAPIBackend({
  definition: './spec/predictivemovement-1.0.0.yaml',
  strict: true,
  validate: true,
})

api.register({
  notFound: async (_, __, res) => res.status(404).json({ err: 'not found' }),
  validationFail: (context, __, res) =>
    res.status(400).json({ err: context.validation.errors }),
  ...routeHandlers,
})

app.use((req, res, next) =>
  api.handleRequest(
    {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query as { [key: string]: string | string[] },
      headers: req.headers as { [key: string]: string | string[] },
    },
    req,
    res,
    next
  )
)

api.init()
app.listen(process.env.PORT || 9000, () =>
  console.info(`api listening at http://localhost:${process.env.PORT || 9000}`)
)