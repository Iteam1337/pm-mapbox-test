import React, { useEffect } from 'react'
import styled from 'styled-components'
import locationIcon from '../assets/location.svg'

const Container = styled.div`
  margin-bottom: 2rem;
`

const InputContainer = styled.div`
  margin-bottom: 1rem;
`

const InputInnerContainer = styled.div`
  position: relative;
`

const TextInput = styled.input`
  border: none;
  background-color: #f1f3f5;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  border-radius: 0.25rem;
  width: 100%;
  font-size: 0.875rem;
  padding-left: 2.5rem;
`

const Label = styled.label`
  margin-bottom: 0.5rem;
  display: block;
  font-weight: bold;
  font-size: 0.875rem;
`

const SubmitButton = styled.button`
  padding: 0.75rem 1rem;
  background: #e6ffe6;
  border-radius: 0.75rem;
  font-weight: 600;
  color: inherit;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;

  :hover {
    background: #ccffcc;
  }
`

const LocationIcon = styled.img`
  width: 16px;
  height: 18px;
  position: absolute;
  top: 12px;
  left: 12.5px;
`

const AddVehicle = ({ addVehicle, currentPosition }) => {
  const [formState, setState] = React.useState('')
  const [position, setPosition] = React.useState({})
  const [isActive, setActive] = React.useState(false)

  useEffect(() => {
    if (position.lat && position.lon) {
      setState(`${position.lat},${position.lon}`)
    }
  }, [position])

  useEffect(() => {
    if (isActive && currentPosition.lat && currentPosition.lon) {
      setPosition(currentPosition)
    }
  }, [currentPosition])

  useEffect(() => {
    setActive(true)

    return () => setActive(false)
  })

  const create = (event) => {
    event.preventDefault()

    const position = formState
      .split(',')
      .map(parseFloat)
      .filter((x) => !!x)

    if (!position.length) return false
    addVehicle({ lat: position[0], lon: position[1] })
  }

  return (
    <Container>
      <h3>Lägg till fordon</h3>
      <form onSubmit={create} autoComplete="on">
        <div>
          <InputContainer>
            <Label htmlFor="position">Position</Label>
            <InputInnerContainer>
              <LocationIcon alt="Position icon" src={`${locationIcon}`} />
              <TextInput
                name="position"
                type="text"
                value={formState}
                placeholder="61.8294925,16.0565493"
                onChange={(e) => setState(e.target.value)}
              />
            </InputInnerContainer>
          </InputContainer>
        </div>
        <div>
          <SubmitButton type="submit">Lägg till fordon</SubmitButton>
        </div>
      </form>
    </Container>
  )
}
export default AddVehicle
