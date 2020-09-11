import React from 'react'
import styled from 'styled-components'
import { FlyToInterpolator } from 'react-map-gl'
import RouteActivities from './RouteActivities'
import Icons from '../assets/Icons'
import { UIStateContext } from '../utils/UIStateContext'
import { useHistory, useParams, useRouteMatch } from 'react-router-dom'
import Elements from './Elements'
import { IPlanVehicle } from './Plan'
import { getColor } from '../utils/palette'

interface Props {
  vehicle: IPlanVehicle
  routeNumber: number
}

const RouteTitleWrapper = styled.div`
  display: grid;
  grid-template-columns: 50% 1fr;
  align-items: baseline;
  justify-items: flex-start;
  width: 100%;
`

const Chevron = styled(Icons.Arrow)`
  transform: ${({ active }) => active && `rotate(180deg)`};
  transition: transform 0.2s;
  justify-self: flex-end;
`

const PlanRouteDetails = ({ vehicle, routeNumber }: Props) => {
  const { dispatch } = React.useContext(UIStateContext)
  const history = useHistory()
  const { routeId } = useParams()
  const isCurrentPlan = useRouteMatch({ path: ['/plans/current-plan'] })

  const toggle = (id: string) => {
    if (id === routeId) {
      return history.push(isCurrentPlan ? '/plans/current-plan' : '/plans')
    }

    return history.push(
      isCurrentPlan ? `/plans/current-plan/${id}` : `/plans/routes/${id}`
    )
  }

  return (
    <div key={vehicle.id}>
      <RouteTitleWrapper
        onClick={() => {
          toggle(vehicle.id)
        }}
      >
        <Elements.StrongParagraph dotColor={getColor(routeNumber - 1, 3)}>
          Rutt {routeNumber}
        </Elements.StrongParagraph>
        <Chevron active={routeId === vehicle.id ? true : undefined} />
      </RouteTitleWrapper>

      {routeId === vehicle.id && (
        <>
          <Elements.FlexRowWrapper>
            <Elements.StrongParagraph>Transport</Elements.StrongParagraph>
            <Elements.RoundedLink
              margin="0 0.5rem"
              to={`/transports/${vehicle.id}`}
              onClick={() =>
                dispatch({
                  type: 'viewport',
                  payload: {
                    latitude: vehicle.start_address.lat,
                    longitude: vehicle.start_address.lon,
                    zoom: 10,
                    transitionDuration: 3000,
                    transitionInterpolator: new FlyToInterpolator(),
                    transitionEasing: (t: number) => t * (2 - t),
                  },
                })
              }
            >
              {vehicle.id}
            </Elements.RoundedLink>
          </Elements.FlexRowWrapper>
          <RouteActivities vehicle={vehicle} />
        </>
      )}
    </div>
  )
}

export default PlanRouteDetails