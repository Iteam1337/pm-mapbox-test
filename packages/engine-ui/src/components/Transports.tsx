import React from 'react'
import { Link, Route, useRouteMatch, Switch } from 'react-router-dom'
import CreateTransport from './CreateTransport'
import TransportsList from './TransportsList'
import TransportDetails from './TransportDetails'
import * as stores from '../utils/state/stores'
import { Transport } from '../types'
import NotFound from './NotFound'
import * as Elements from '../shared-elements'
import EditTransport from './EditTransport'

const Transports: React.FC<{
  transports: Transport[]
  createTransport: (params: any) => void
  deleteTransport: (id: string) => void
  updateTransport: (params: any) => void
}> = ({ transports, createTransport, deleteTransport, updateTransport }) => {
  const { path, url } = useRouteMatch()
  const setUIState = stores.ui((state) => state.dispatch)

  return (
    <Switch>
      <Route exact path={path}>
        <h3>Aktuella transporter</h3>
        <TransportsList transports={transports} />
        <Elements.Layout.FlexRowInCenter>
          <Link to={`${url}/add-transport`}>
            <Elements.Buttons.SubmitButton color="#666666">
              + Lägg till transport
            </Elements.Buttons.SubmitButton>
          </Link>
        </Elements.Layout.FlexRowInCenter>
      </Route>
      <Route exact path={`${path}/add-transport`}>
        <CreateTransport onSubmit={createTransport} />
      </Route>
      <Route exact path={`${path}/edit-transport/:transportId`}>
        <EditTransport
          transports={transports}
          updateTransport={updateTransport}
        />
      </Route>
      <Route exact path={`${path}/:transportId`}>
        <TransportDetails
          transports={transports}
          deleteTransport={deleteTransport}
          onUnmount={() =>
            setUIState({ type: 'highlightTransport', payload: undefined })
          }
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
  )
}

export default Transports
