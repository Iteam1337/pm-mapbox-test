import React from 'react'
import styled from 'styled-components'
import Bookings from './Bookings'
import { Switch as RouterSwitch, Route, Redirect } from 'react-router-dom'
import Plan from './Plan'
import Navigation from './Navigation'
import Transports from './Transports'
import NotFound from './NotFound'
import { Booking, Plan as IPlan } from '../types'

const Container = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  background: white;
  height: 100vh;
  display: flex;
`

const Content = styled.div`
  padding: 2rem;
  width: 350px;
  overflow: auto;
`

interface Props {
  bookings: Booking[]
  plan: IPlan
  vehicles: any
  createBooking: (params: any) => void
  deleteBooking: (params: any) => void
  dispatchOffers: (params: any) => void
  addVehicle: (params: any) => void
  deleteVehicle: (id: string) => void
  updateBooking: (booking: any) => void
}

const Sidebar = (state: Props) => {
  return (
    <Container>
      <Navigation />
      <RouterSwitch>
        <Route exact path="/">
          <Redirect from="/" to="/bookings" />
        </Route>
        <Route>
          <Content>
            <RouterSwitch>
              <Route path="/bookings">
                <Bookings
                  bookings={state.bookings}
                  createBooking={state.createBooking}
                  deleteBooking={state.deleteBooking}
                  updateBooking={state.updateBooking}
                />
              </Route>
              <Route path="/transports">
                <Transports
                  transports={state.vehicles}
                  addVehicle={state.addVehicle}
                  deleteVehicle={state.deleteVehicle}
                />
              </Route>
              <Route path="/plans">
                <Plan
                  plan={state.plan}
                  dispatchOffers={state.dispatchOffers}
                  transports={state.vehicles}
                  bookings={state.bookings}
                />
              </Route>
              <Route component={NotFound} />
            </RouterSwitch>
          </Content>
        </Route>
      </RouterSwitch>
    </Container>
  )
}

export default Sidebar
