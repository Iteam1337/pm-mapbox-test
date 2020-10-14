import React from 'react'
import { StaticMap } from 'react-map-gl'
import DeckGL from '@deck.gl/react'
import mapUtils from '../utils/mapUtils'
import { useHistory, useRouteMatch } from 'react-router-dom'
import Tooltip from './Tooltip'
import { useRecoilState } from 'recoil'
import atoms from '../utils/state/atoms'
import selectors from '../utils/state/selectors'

const Map = ({ data }) => {
  const history = useHistory()
  const [viewState, setViewState] = useRecoilState(atoms.map)
  const [UIState, setUIState] = useRecoilState(selectors.UIState)

  const showTextLayer = useRouteMatch({
    path: ['/plans/routes/:routeId'],
  })
  const handleClickEvent = (event) => {
    if (!event.object) return
    const type = event.object.properties.type
    switch (type) {
      case 'booking':
        return history.push(`/bookings/${event.object.id}`)
      case 'plan':
        return history.push(`/transports/${event.object.id}`)
      default:
        return
    }
  }

  const onMapClick = ({ lngLat: [lon, lat], x, y }) =>
    setUIState({
      type: 'lastClickedPosition',
      payload: { lat, lon, x, y },
    })

  const layers = [
    mapUtils.toGeoJsonLayer(
      'geojson-bookings-layer',
      mapUtils.bookingToFeature(data.bookings),
      handleClickEvent
    ),
    mapUtils.toGeoJsonLayer(
      'geojson-plan-layer',
      mapUtils.planToFeature(data.plan),
      handleClickEvent
    ),
    data.plan.map((route) =>
      mapUtils.toBookingIconLayer(
        mapUtils.routeActivityIcon(route),
        UIState.highlightBooking,
        { offset: [40, 0] }
      )
    ),
    showTextLayer &&
      mapUtils.toTextLayer(mapUtils.routeActivitiesToFeature(data.plan)),
    mapUtils.toTransportIconLayer(
      mapUtils.transportIcon(data.vehicles),
      UIState.highlightTransport
    ),
    mapUtils.toBookingIconLayer(
      mapUtils.bookingIcon(data.bookings),
      UIState.highlightBooking
    ),
  ]

  const handleDragEvent = () =>
    UIState.showMapTooltip && setUIState({ type: 'hideTooltip' })

  return (
    <>
      <DeckGL
        layers={layers}
        controller={true}
        onClick={(e) => {
          onMapClick(e)
          handleClickEvent(e)
        }}
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        onDrag={handleDragEvent}
      >
        <StaticMap mapStyle="mapbox://styles/mapbox/dark-v10" />
      </DeckGL>
      {UIState.showMapTooltip && (
        <Tooltip position={UIState.lastClickedPosition} />
      )}
    </>
  )
}

export default Map
