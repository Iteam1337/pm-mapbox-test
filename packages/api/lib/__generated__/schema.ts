/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/transports": {
    /** Get all the transports to which you have access */
    get: operations["getTransports"];
  };
  "/itinerary": {
    /** Get an itinerary */
    get: operations["getItinerary"];
  };
  "/activity/{activity_id}/complete": {
    /** Create an event for an activity of type complete */
    post: {
      responses: {
        /** OK */
        204: {
          content: {
            "application/json": components["schemas"]["ApiResponse"];
          };
        };
      };
    };
  };
  "/activity/{activity_id}/failure": {
    /** Create an event for an activity of type failure */
    post: {
      responses: {
        /** OK */
        204: {
          content: {
            "application/json": components["schemas"]["ApiResponse"];
          };
        };
      };
      requestBody: {
        content: {
          "application/json": {
            reason?: string;
          };
        };
      };
    };
  };
  "/bookings/{booking_id}": {
    /** Get info about a specific booking */
    get: operations["getBooking"];
    /** Delete a booking based on bookingId */
    delete: operations["deleteBooking"];
  };
  "/bookings": {
    /** Create a booking */
    post: operations["createBooking"];
  };
  "/me": {
    /** Get your own user profile */
    get: operations["getMe"];
  };
  "/users": {
    /** Create a new user */
    post: {
      responses: {
        /** OK */
        200: {
          content: {
            "application/json": components["schemas"]["User"];
          };
        };
      };
      requestBody: components["requestBodies"]["User"];
    };
  };
}

export interface components {
  schemas: {
    Auth: {
      token?: string;
    };
    Activity: {
      id?: string;
      booking_id?: string;
      distance?: number;
      duration?: number;
      type?: "start" | "end" | "pickup" | "delivery";
      address?: {
        schema?: components["schemas"]["Position"];
      };
    };
    Transport: {
      transport_id?: string;
      busy?: boolean;
      capacity?: {
        volume?: number;
        weight?: number;
      };
      earliestStart?: string;
      latestEnd?: string;
      metadata?: { [key: string]: any };
      startAddress?: {
        city?: string;
        street?: string;
        name?: string;
        position?: {
          schema?: components["schemas"]["Position"];
        };
      };
      endAddress?: {
        city?: string;
        street?: string;
        name?: string;
        lon?: number;
        lat?: number;
      };
    };
    Booking: {
      id: string;
      tripId: number;
      delivery?: {
        city?: string;
        name?: string;
        street?: string;
        position?: components["schemas"]["Position"];
      };
      pickup?: {
        city?: string;
        name?: string;
        street?: string;
        position?: components["schemas"]["Position"];
      };
      details?: {
        schema?: components["schemas"]["BookingDetails"];
      };
      shipDate: string;
      /** Order Status */
      status: "placed" | "approved" | "delivered" | "new" | "deleted";
      complete: boolean;
    };
    BookingDetails: {
      metadata?: {
        cargo?: string;
        fragile?: boolean;
        recipient?: {
          contact?: string;
          name?: string;
          info?: string;
        };
        sender?: {
          contact?: string;
          name?: string;
          info?: string;
        };
      };
      weight?: number;
      volume?: number;
      dimensions?: {
        width?: number;
        height?: number;
        length?: number;
      };
      loadingMeters?: number;
      quantity?: number;
    };
    /** Booking notifications */
    BookingNotification: {
      bookingId?: string;
      message?: string;
      status?: "new" | "deleted" | "error";
    };
    User: {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      password?: string;
      phone: string;
    };
    Place: {
      position: components["schemas"]["Position"];
      address?: string;
    };
    Position: {
      lon: number;
      lat: number;
    };
    Plan: { [key: string]: any };
    Itinerary: {
      transport_id: string;
      route: { [key: string]: any };
      activities: components["schemas"]["Activity"][];
    };
    ApiResponse: {
      code?: number;
      type?: string;
      message?: string;
    };
  };
  requestBodies: {
    User: { [key: string]: any };
  };
}

export interface operations {
  /** Get all the transports to which you have access */
  getTransports: {
    responses: {
      /** OK */
      200: {
        content: {
          "application/json": components["schemas"]["Transport"][];
        };
      };
    };
  };
  /** Get an itinerary */
  getItinerary: {
    parameters: {
      query: {
        /** ID of the transport to which the itinerary is assigned */
        transportId: string;
      };
    };
    responses: {
      /** OK */
      200: {
        content: {
          "application/json": components["schemas"]["Itinerary"];
        };
      };
    };
  };
  /** Get info about a specific booking */
  getBooking: {
    parameters: {
      path: {
        /** ID of the booking that you want info about */
        bookingId: string;
      };
    };
    responses: {
      /** OK */
      200: {
        content: {
          "application/json": components["schemas"]["Booking"];
        };
      };
    };
  };
  /** Delete a booking based on bookingId */
  deleteBooking: {
    parameters: {
      path: {
        /** ID of the booking that you want to delete */
        booking_id: string;
      };
    };
    responses: {
      /** OK */
      200: {
        content: {
          "application/json": components["schemas"]["Booking"];
        };
      };
    };
  };
  /** Create a booking */
  createBooking: {
    responses: {
      /** OK */
      200: {
        content: {
          "application/json": {
            bookingId?: string;
          };
        };
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["Booking"];
      };
    };
  };
  /** Get your own user profile */
  getMe: {
    responses: {
      /** OK */
      200: {
        content: {
          "application/json": components["schemas"]["User"];
        };
      };
    };
  };
}
