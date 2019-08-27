module Car = {
  open Json.Decode;

  module Stops = {
    type t = {
      lat: float,
      lon: float,
    };

    let make = (lat, lon) => {lat, lon};

    let fromJson = json => {
      lat: json |> field("lat", Json.Decode.float),
      lon: json |> field("lon", Json.Decode.float),
    };
  };

  type geometry = {
    coordinates: array(array(float)),
    _type: string,
  };

  type properties = {color: array(int)};

  type route = {
    geometry,
    properties,
  };

  type waypoint = {location: array(float)};

  type routeRoot = {
    routes: array(route),
    waypoints: array(waypoint),
  };

  type response = {
    maxTime: float,
    distance: float,
    duration: float,
    route: routeRoot,
    stops: array(Stops.t),
  };

  type routeWithId = {
    id: string,
    response,
  };

  let geometry = json => {
    coordinates:
      json |> field("coordinates", array(array(Json.Decode.float))),
    _type: json |> field("type", string),
  };

  let properties = json => {color: json |> field("color", array(int))};

  let route = json => {
    geometry: json |> field("geometry", geometry),
    properties: {
      color: [|255, 0, 0, 255|],
    },
  };

  let waypoint = json => {
    location: json |> field("location", array(Json.Decode.float)),
  };

  let routeRoot = json => {
    routes: json |> field("routes", array(route)),
    waypoints: json |> field("waypoints", array(waypoint)),
  };

  let routeFromJson = (~color, json) => {
    maxTime: json |> field("maxTime", Json.Decode.float),
    distance: json |> field("distance", Json.Decode.float),
    duration: json |> field("duration", Json.Decode.float),
    route: json |> field("route", routeRoot),
    stops: json |> field("stops", array(Stops.fromJson)),
  };

  let routesFromJson = (~color, json) => {
    field("data", list(routeFromJson(~color)), json);
  };
};

module Travel = {
  module Route = {
    let fromType =
      fun
      | `Person => "/pickup"
      | `PendingRoute(id) => "/pending-route/" ++ id
      | `Driver => "/route"
      | `RouteId(id) => "/route/" ++ id;

    let fromSocketType =
      fun
      | `Person => "passenger"
      | `Driver => "driver";

    let make = t => Config.apiHost ++ fromType(t);
  };

  module Socket = {
    let make = (~route, ~body) => {
      let payload =
        Js.Json.stringify(
          Json.Encode.(
            object_([
              ("type", string(Route.fromSocketType(route))),
              ("payload", body),
            ])
          ),
        );
      Socket.emit("event", payload);
    };

    module Events = {
      let acceptChange = id =>
        Socket.emit(
          "event",
          Js.Json.stringify(
            Json.Encode.(
              object_([
                ("type", string("acceptChange")),
                ("payload", object_([("id", string(id))])),
              ])
            ),
          ),
        );
    };
  };

  let routes = (~url="/demo/routes", ~callback, ()) =>
    Refetch.fetch(Config.apiHost ++ url)
    |> Repromise.andThen(Refetch.json)
    |> Repromise.map(Car.routesFromJson(~color=[|0, 0, 255, 255|]))
    |> Repromise.wait(callback);

  let route = (~url="/route/", ~callback, id) =>
    Refetch.fetch(Config.apiHost ++ url ++ id)
    |> Repromise.andThen(Refetch.json)
    |> Repromise.map(Car.routeFromJson(~color=[[|0, 255, 0, 255|]]))
    |> Repromise.wait(callback);

  let pendingRoute = (~callback, id) =>
    route(~url="/pending-route/", ~callback, id);

  let generateRoutes = (~callback) =>
    Refetch.fetch(Config.generateRoutesHost)
    |> Repromise.andThen(Refetch.json)
    |> Repromise.wait(callback);

  let pending = (~url="/demo/pending", ~callback, ()) =>
    Refetch.fetch(Config.apiHost ++ url)
    |> Repromise.andThen(Refetch.json)
    |> Repromise.map(Car.routesFromJson(~color=[|255, 0, 0, 255|]))
    |> Repromise.wait(callback);
};
