import React, { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import Elements from '../shared-elements'
import Form from './forms/AddVehicle'

const AddVehicle = ({ addVehicle, currentPosition }) => {
  const history = useHistory()
  const [isActive, setActive] = React.useState(false)

  const [formState, setState] = React.useState({
    vehicleType: '',
    id: '',
    capacity: '',
    timewindow: { start: null, end: null },
    startPosition: { lat: 61.8172594, lon: 16.0561472 },
    endDestination: { name: '', lat: '', lon: '' },
    driver: { name: '', contact: '' },
  })

  useEffect(() => {
    if (isActive && currentPosition.lat && currentPosition.lon) {
      setState((formState) => ({
        ...formState,
        startPosition: currentPosition,
      }))
    }
  }, [currentPosition, isActive])

  useEffect(() => {
    setActive(true)

    return () => setActive(false)
  }, [isActive])

  const onSubmitHandler = (event) => {
    event.preventDefault()

    addVehicle({
      ...formState,
      lat: formState.startPosition.lat,
      lon: formState.startPosition.lon,
    })

    history.push('/')
  }

  return (
    <Elements.Layout.Container>
      <h3>Lägg till fordon</h3>
      <Form
        onChangeHandler={setState}
        onSubmitHandler={onSubmitHandler}
        state={formState}
      />
    </Elements.Layout.Container>
  )
}
export default AddVehicle
