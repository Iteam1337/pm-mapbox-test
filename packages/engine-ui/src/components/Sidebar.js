import React from 'react'
import styled from 'styled-components'
import ParcelIcon from '../assets/parcel.svg'
import ShippingIcon from '../assets/shippingIcon.svg'
import Bookings from './Bookings'
import Cars from './Cars'
import CreateBooking from './CreateBooking'
import CreateBookings from './CreateBookings'
import {
  Switch as RouterSwitch,
  Route,
  Link,
  useLocation,
} from 'react-router-dom'
import BookingDetails from './BookingDetails'
import Hooks from '../Hooks'
import CarDetails from './CarDetails'
import Filters from './Filters'
import AddVehicle from './AddVehicle'
import Dispatch from '../assets/dispatch.svg'
import Elements from './Elements'

const Container = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  background: white;
  height: 100vh;
  display: flex;
`

const NavigationBar = styled.div`
  padding: 3rem 1rem;
  height: 100vh;
  background: #13c57b;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 1px 1px 10px 1px rgba(0, 0, 0, 0.2);

  img {
    width: 30px;
    height: 30px;
    cursor: pointer;
  }
`

const TextLink = styled(Link)`
  text-decoration: none;
  color: #666666;
`

const Content = styled.div`
  padding: 2rem;
  width: 325px;
`

const Line = styled.div`
  background: transparent;
  border-left: 1px solid #e5e5e5;
  height: 87vh;
  align-self: center;
`

const Details = ({ state }) => {
  const { data, type } = Hooks.useFilteredStateFromQueryParams(state)

  const componentFromType = () => {
    switch (type) {
      case 'booking':
        return <BookingDetails booking={data.bookings[0]} />
      case 'car':
        return <CarDetails car={data.cars[0]} />
      default:
        return null
    }
  }

  return componentFromType()
}

const Sidebar = (state) => {
  const [navigationCurrentView, setNavigationCurrentView] = React.useState(
    'bookings'
  )
  const { pathname } = useLocation()
  const { data } = Hooks.useFilteredStateFromQueryParams(state)

  const currentViewToElement = () => {
    switch (navigationCurrentView) {
      case 'bookings':
        return (
          <>
            <h3>Aktuella bokningar</h3>
            <Bookings bookings={state.bookings} />
            <Filters />
            <TextLink to="/add-booking">
              <h3>+ Lägg till bokning</h3>
            </TextLink>
            <TextLink to="/add-bookings">
              <h3>+ Generera historiska bokningar</h3>
            </TextLink>
          </>
        )
      case 'cars':
        return (
          <>
            <h3>Aktuella fordon</h3>
            <Cars cars={data.cars} />
            <TextLink to="/add-vehicle">
              <h3>+ Lägg till bil</h3>
            </TextLink>
          </>
        )
      case 'dispatch':
        return (
          <>
            <button onClick={state.dispatchOffers}>Dispatch Offers</button>
            <button onClick={state.resetState}>Reset state</button>
          </>
        )
      default:
        return null
    }
  }

  return (
    <Container>
      <NavigationBar>
        <Elements.NavIconLink to="/">
          <img
            onClick={() => setNavigationCurrentView('bookings')}
            src={ParcelIcon}
            alt="parcel icon"
          />
        </Elements.NavIconLink>
        <Elements.NavIconLink to="/">
          <img
            onClick={() => setNavigationCurrentView('cars')}
            src={ShippingIcon}
            alt="shipping icon"
          />
        </Elements.NavIconLink>
        <Elements.NavIconLink to="/">
          <img
            onClick={() => setNavigationCurrentView('dispatch')}
            src={Dispatch}
            alt="Dispatch icon"
          />
        </Elements.NavIconLink>
      </NavigationBar>

      <Content>
        <RouterSwitch>
          <Route path="/">
            <>{currentViewToElement()}</>
          </Route>
        </RouterSwitch>
      </Content>

      {pathname !== '/' && (
        <>
          <Line />
          <Content>
            <RouterSwitch>
              <Route path="/details">
                <Details state={data} />
              </Route>
              <Route path="/add-vehicle">
                <AddVehicle
                  currentPosition={state.currentPosition}
                  addVehicle={state.addVehicle}
                />
              </Route>
              <Route path="/add-booking">
                <CreateBooking createBooking={state.createBooking} />
              </Route>
              <Route path="/add-bookings">
                <CreateBookings createBookings={state.createBookings} />
              </Route>
            </RouterSwitch>
          </Content>
        </>
      )}
    </Container>
  )
}

export default Sidebar
