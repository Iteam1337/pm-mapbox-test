open Map;

type state = {
  carResponse: API.Car.response,
  myLocation: option(Geolocation.Navigator.coords),
  tooltip: Map.IconLayer.hoverInfo,
  viewState: Map.DeckGL.viewState,
  pendingRoutes: list(API.Car.response),
};

type action =
  | CarResponse(API.Car.response)
  | Location(Geolocation.Navigator.coords)
  | Tooltip(Map.IconLayer.hoverInfo)
  | ViewState(Map.DeckGL.viewState)
  | PendingRoute(API.Car.response);

let initialState: state = {
  carResponse: {
    duration: 0.0,
    distance: 0.0,
    maxTime: 0.0,
    route: {
      waypoints: [||],
      routes: [||],
    },
    stops: [||],
  },
  myLocation: None,
  tooltip: {
    x: 0,
    y: 0,
    _object: None,
  },
  viewState:
    DeckGL.viewState(~longitude=18.068581, ~latitude=59.329323, ~zoom=8, ()),
  pendingRoutes: [],
};

[@react.component]
let make = () => {
  let (
    {carResponse, myLocation, viewState, tooltip, pendingRoutes},
    dispatch,
  ) =
    React.useReducer(
      (state, action) =>
        switch (action) {
        | CarResponse(carResponse) => {...state, carResponse}
        | Location(location) => {...state, myLocation: Some(location)}
        | Tooltip(tooltip) => {...state, tooltip}
        | ViewState(viewState) => {...state, viewState}
        | PendingRoute(pendingRoute) => {
            ...state,
            pendingRoutes: [pendingRoute, ...state.pendingRoutes],
          }
        },
      initialState,
    );

  let flyToRoute = (waypoints: array(API.Car.waypoint)) => {
    let viewport =
      Belt.Array.(
        switch (waypoints->get(0), waypoints->get(length(waypoints) - 1)) {
        | (Some(f), Some(l)) => [|f.location, l.location|]
        | (_, _) => [||]
        }
      )
      |> Viewport.make;

    dispatch(
      ViewState(
        DeckGL.viewState(
          ~longitude=viewport.longitude,
          ~latitude=viewport.latitude,
          ~zoom=viewport.zoom,
          ~transitionDuration=2000,
          ~transitionInterpolator=Interpolator.FlyTo.make(),
          (),
        ),
      ),
    );
  };

  let handleCar = (t: API.Car.response) => {
    let {API.Car.route: {waypoints}} = t;

    dispatch(CarResponse(t));

    flyToRoute(waypoints);
  };

  React.useEffect0(() => {
    Socket.on(`RouteMatched, API.Travel.route(~callback=handleCar));
    /* TODO: show new route and get explicit approval or denial from user */
    Socket.on(
      `RouteChangeRequested,
      API.Travel.pendingRoute(~callback=route =>
        dispatch(PendingRoute(route))
      ),
    );

    None;
  });

  let handleMove = (coords: Geolocation.Navigator.coords) => {
    dispatch(Location(coords));
    dispatch(
      ViewState(
        DeckGL.viewState(
          ~longitude=coords.longitude,
          ~latitude=coords.latitude,
          ~zoom=16,
          ~transitionDuration=2000,
          ~transitionInterpolator=Interpolator.FlyTo.make(),
          (),
        ),
      ),
    );
  };

  let geoJsonLayers =
    carResponse.route.routes
    ->Belt.Array.map(route => GeoJsonLayer.make(~data=[|route|], ()));

  let iconLayers =
    carResponse.stops
    ->Belt.Array.mapWithIndex((i, stop) =>
        IconLayer.make(
          ~data=[|stop|],
          ~onHover=
            hoverInfo =>
              dispatch(Tooltip(Map.IconLayer.hoverInfoFromJs(hoverInfo))),
          ~id={
            Js.Float.(
              String.concat(
                "-",
                [toString(stop.lat), toString(stop.lon), string_of_int(i)],
              )
            );
          },
          (),
        )
      );

  <Geolocation.Provider value={myLocation: myLocation}>
    <Navigation onRouteSelect=handleCar pendingRoutes />
    <Geolocation handleMove />
    <TripDetails
      duration={carResponse.duration}
      distance={carResponse.distance}
      flyToRoute
      stops={carResponse.stops}
      waypoints={carResponse.route.waypoints}
    />
    <DeckGL
      controller=true
      onViewStateChange={vp => dispatch(ViewState(vp##viewState))}
      viewState
      layers={[|geoJsonLayers, iconLayers|]->Belt.Array.concatMany}>
      <StaticMap
        reuseMaps=true
        preventStyleDiffing=true
        mapboxApiAccessToken=Config.mapboxToken>
        <>
          {switch (myLocation) {
           | None => React.null
           | Some({longitude, latitude}) =>
             <Geolocation.Marker longitude latitude />
           }}
          <Tooltip tooltip />
        </>
      </StaticMap>
    </DeckGL>
  </Geolocation.Provider>;
};
