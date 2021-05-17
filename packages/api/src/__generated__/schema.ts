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
    get: operations["getItinerary"];
  };
}

export interface components {
  schemas: {
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
      status: "placed" | "approved" | "delivered";
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
}

export interface operations {
  /** Get all the transports to which you have access */
  getTransports: {
    responses: {
      /** OK */
      200: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["Transport"][];
        };
      };
    };
  };
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
          "application/json; charset=utf-8": components["schemas"]["Itinerary"];
        };
      };
    };
  };
}
