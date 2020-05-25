import React from 'react'
import { useSocket } from 'use-socketio'
import Sidebar from './components/Sidebar'
import 'mapbox-gl/dist/mapbox-gl.css'
import { reducer, initState } from './utils/reducer'
importe { BrowserRouter as Router, Route } from 'react-router-dom'
import Start from './Start'
import Booking from './Booking'

const App = () => {
  const [state, dispatch] = React.useReducer(reducer, initState)
  const { socket } = useSocket()

  const createBooking = ({ pickup, dropoff }) => {
    socket.emit('new-booking', {
      pickup,
      dropoff,
    })
  }

  useSocket('bookings', (bookings) => {
    dispatch({
      type: 'setBookings',
      payload: bookings,
    })
  })

  useSocket('cars', (newCars) => {
    dispatch({
      type: 'setCars',
      payload: newCars,
    })
  })

  return (
    <>
      <Router>
        <Sidebar {...state} createBooking={createBooking} />
        <Route exact path="/">
          <Start state={state} />
        </Route>
        <Route path="/booking/:id">
          <Booking state={state} />
        </Route>
      </Router>
    </>
  )
}

export default App
