import palette from './palette'
import { GeoJsonLayer, IconLayer } from '@deck.gl/layers'
import vehicleIcon from '../assets/vehicle.svg'
import parcelIcon from '../assets/parcel.svg'

export const point = (coordinates, props) => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates,
  },
  ...props,
})

export const multiPoint = (coordinates, props) => ({
  type: 'Feature',
  geometry: {
    type: 'MultiPoint',
    coordinates,
  },
  ...props,
})

export const feature = (geometry, props) => ({
  type: 'Feature',
  geometry,
  ...props,
})

export const line = (coordinates, props) => ({
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates,
  },
  ...props,
})

export const hexToRGBA = (hex, opacity) => {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return [r, g, b, opacity]
}

export const hexToRGB = (hex) => {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return [r, g, b]
}

export const routeAssignedToBooking = (assignedTo) =>
  line(
    assignedTo.route.geometry.coordinates.map(({ lat, lon }) => [lon, lat]),
    {
      id: assignedTo.id,
      properties: {
        color: palette[0][0],
        offset: 0,
      },
    }
  )

export const carToFeature = (cars) => {
  let index = 0
  try {
    return [
      ...cars.flatMap(({ id, activities, current_route: currentRoute }, i) => {
        index = i
        if (activities && activities.length) {
          const route = line(
            currentRoute.geometry.coordinates.map(({ lat, lon }) => [lon, lat]),
            {
              id,
              properties: {
                color: palette[0][3],
                offset: 0,
                type: 'plan',
              },
            }
          )

          const points = activities
            .filter(({ type }) => type !== 'start')
            .map(({ address }) =>
              point([address.lon, address.lat], {
                id,
                properties: {
                  color: palette[0][4],
                },
              })
            )

          return [...points, route]
        }
        return []
      }),
    ]
  } catch (error) {
    console.log(index, error)
  }
}

export const carIcon = (cars) => {
  let index = 0
  try {
    return [
      ...cars.flatMap(({ id, tail, start_address }, i) => {
        index = i
        return [
          point([start_address.lon, start_address.lat], {
            properties: {
              color: '#00ff00',
              size: 80,
            },
            id,
            tail,
          }),
        ]
      }),
    ]
  } catch (error) {
    console.log(index, error)
  }
}

export const bookingIcon = (bookings) => {
  let index = 0
  try {
    return [
      ...bookings.flatMap(({ id, pickup }, i) => {
        index = i
        return [
          point([pickup.lon, pickup.lat], {
            properties: {
              color: '#ccffcc',
              size: 80,
            },
            id,
          }),
        ]
      }),
    ]
  } catch (error) {
    console.log(index, error)
  }
}

export const bookingToFeature = (bookings) => {
  return bookings.flatMap(({ id, pickup, delivery, status, route }) => {
    const points = [
      point([delivery.lon, delivery.lat], {
        id,
        properties: {
          status,
          color: '#ccffcc',
        },
      }),
    ]

    if (status === 'assigned' && route) {
      return [...points, routeAssignedToBooking({ id, route })]
    }

    if (route) {
      return [
        ...points,
        line(
          route.geometry.coordinates.map(({ lat, lon }) => [lon, lat]),
          {
            id,
            properties: {
              color: '#e6ffe6',
              offset: 0,
              address: { pickup: pickup, delivery: delivery },
              type: 'booking',
            },
          }
        ),
      ]
    }

    return route ? points : []
  })
}

export const toGeoJsonLayer = (id, data, callback) =>
  new GeoJsonLayer({
    id,
    data,
    pickable: true,
    stroked: false,
    filled: true,
    extruded: true,
    lineWidthScale: 1,
    lineWidthMinPixels: 2,
    getFillColor: (d) => hexToRGBA(d.properties.color, 255),
    highlightColor: [19, 197, 123, 255],
    autoHighlight: true,
    getLineColor: (d) => hexToRGBA(d.properties.color, 255),
    getRadius: (d) => d.properties.size || 300,
    getLineWidth: 5,
    getElevation: 30,
    pointRadiusScale: 1,
    pointRadiusMaxPixels: 10,
    onClick: callback,
  })

export const toBookingIconLayer = (data, activeBookingId) => {
  if (!data.length) {
    return
  }

  const ICON_MAPPING = {
    marker: {
      x: 0,
      y: 0,
      width: 150,
      height: 150,
      mask: true,
    },
  }

  const iconData = data.map((feature) => ({
    coordinates: feature.geometry.coordinates,
    properties: {
      id: feature.id,
      color: activeBookingId === feature.id ? '#19DE8B' : '#ffffff',
    },
  }))

  return new IconLayer({
    id: 'icon-layer-booking',
    data: iconData,
    pickable: true,
    iconAtlas: parcelIcon,
    iconMapping: ICON_MAPPING,
    getIcon: (d) => 'marker',
    sizeScale: 4,
    getPosition: (d) => d.coordinates,
    transitions: { getSize: { duration: 100 }, getColor: { duration: 100 } },
    getSize: (d) => (d.properties.id === activeBookingId ? 8 : 5),
    getColor: (d) => hexToRGB(d.properties.color),
  })
}

export const toVehicleIconLayer = (data) => {
  if (!data.length) {
    return
  }

  const ICON_MAPPING = {
    marker: {
      x: 0,
      y: 0,
      width: 131,
      height: 150,
      mask: true,
    },
  }

  const iconData = data.map((feature) => ({
    coordinates: feature.geometry.coordinates,
    properties: { id: feature.id, color: '#ffffff' },
  }))

  return new IconLayer({
    id: 'icon-layer-car',
    data: iconData,
    pickable: true,
    iconAtlas: vehicleIcon,
    iconMapping: ICON_MAPPING,
    getIcon: (d) => 'marker',
    sizeScale: 7,
    getPosition: (d) => d.coordinates,
    getSize: (d) => 5,
    getColor: (d) => hexToRGB(d.properties.color),
  })
}

export default {
  feature,
  multiPoint,
  point,
  line,
  bookingToFeature,
  carToFeature,
  toGeoJsonLayer,
  toVehicleIconLayer,
  toBookingIconLayer,
  hexToRGB,
  carIcon,
  bookingIcon,
}
