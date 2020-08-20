package com.predictivemovement.route.optimization;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.graphhopper.jsprit.core.problem.Location;
import com.graphhopper.jsprit.core.problem.cost.VehicleRoutingTransportCosts;
import com.graphhopper.jsprit.core.problem.job.Shipment;
import com.graphhopper.jsprit.core.problem.vehicle.VehicleImpl;
import com.graphhopper.jsprit.core.problem.vehicle.VehicleType;
import com.graphhopper.jsprit.core.problem.vehicle.VehicleTypeImpl;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * This class sets the vehicles, vehicle types and shipments for the VRP.
 */
public class VRPSetting {

    private static final int VOLUME_INDEX = 0;
    private static final int WEIGHT_INDEX = 1;

    private static VehicleType vehicleDummyType;
    static {
        VehicleTypeImpl.Builder vehicleTypeBuilder = VehicleTypeImpl.Builder.newInstance("vehicleDummyType");
        vehicleTypeBuilder.addCapacityDimension(VOLUME_INDEX, 3 * 1000 * 1000);
        vehicleTypeBuilder.addCapacityDimension(WEIGHT_INDEX, 5);
        vehicleTypeBuilder.setCostPerDistance(1);
        vehicleTypeBuilder.setCostPerTransportTime(1);

        vehicleDummyType = vehicleTypeBuilder.build();
    }

    List<VehicleImpl> vehicles;
    List<Shipment> shipments;
    VehicleRoutingTransportCosts routingCosts;

    private JSONObject routeRequest;

    private Map<String, Location> locations;

    VRPSetting(JSONObject routeRequest) {
        this.routeRequest = routeRequest;
    }

    VRPSetting set() {
        locations = new HashMap<>();

        createVehicles();
        createShipments();
        createCostMatrix();
        return this;
    }

    private void createVehicles() {
        vehicles = new ArrayList<>();

        JSONArray jsonVehicles = routeRequest.getJSONArray("vehicles");
        for (Object jsonVehicleObj : jsonVehicles) {
            JSONObject jsonVehicle = (JSONObject) jsonVehicleObj;

            // id
            String vehicleId = jsonVehicle.getString("id");
            VehicleImpl.Builder vehicleBuilder = VehicleImpl.Builder.newInstance(vehicleId);

            // type
            vehicleBuilder.setType(getVehicleType(jsonVehicle));

            // start address
            JSONObject startAddress = jsonVehicle.getJSONObject("start_address");
            Location vehicleStartAddress = getLocation(startAddress);
            vehicleBuilder.setStartLocation(vehicleStartAddress);
            locations.put(startAddress.getString("hint"), vehicleStartAddress);

            // end address
            JSONObject endAddress = jsonVehicle.getJSONObject("end_address");
            Location vehicleEndAddress = getLocation(endAddress);
            vehicleBuilder.setEndLocation(vehicleEndAddress);
            locations.put(endAddress.getString("hint"), vehicleEndAddress);

            VRPSettingTimeUtils timeUtils = new VRPSettingTimeUtils();
            // earliest start
            double earliestStart = timeUtils.getTimeDifferenceFromNow(jsonVehicle, "earliest_start", 0.0);
            vehicleBuilder.setEarliestStart(earliestStart);

            // latest arrival
            double latestArrival = timeUtils.getTimeDifferenceFromNow(jsonVehicle, "latest_end", Double.MAX_VALUE);
            vehicleBuilder.setLatestArrival(latestArrival);

            VehicleImpl vehicle = vehicleBuilder.build();
            vehicles.add(vehicle);
        }
    }

    private void createShipments() {
        shipments = new ArrayList<>();

        JSONArray jsonBookings = routeRequest.getJSONArray("bookings");
        for (Object jsonBookingObj : jsonBookings) {
            JSONObject jsonBooking = (JSONObject) jsonBookingObj;

            // id
            String shipmentId = jsonBooking.getString("id");
            Shipment.Builder shipmentBuilder = Shipment.Builder.newInstance(shipmentId);

            // pickup
            JSONObject jsonPickup = jsonBooking.getJSONObject("pickup");
            Location pickupLocation = getLocation(jsonPickup);
            shipmentBuilder.setPickupLocation(pickupLocation);
            locations.put(jsonPickup.getString("hint"), pickupLocation);

            // delivery
            JSONObject jsonDelivery = jsonBooking.getJSONObject("delivery");
            Location deliveryLocation = getLocation(jsonDelivery);
            shipmentBuilder.setDeliveryLocation(deliveryLocation);
            locations.put(jsonDelivery.getString("hint"), deliveryLocation);

            // time windows
            VRPSettingTimeWindows timeWindows = new VRPSettingTimeWindows();
            timeWindows.add(jsonPickup, (timeWindow) -> {
                shipmentBuilder.addPickupTimeWindow(timeWindow);
            });
            timeWindows.add(jsonDelivery, (timeWindow) -> {
                shipmentBuilder.addDeliveryTimeWindow(timeWindow);
            });

            shipmentBuilder.addSizeDimension(VOLUME_INDEX, 19*18*14);
            shipmentBuilder.addSizeDimension(WEIGHT_INDEX, 1);

            Shipment shipment = shipmentBuilder.build();
            shipments.add(shipment);
        }
    }

    private Location getLocation(JSONObject jsonLocation) {
        float longitude = jsonLocation.getFloat("lon");
        float latitude = jsonLocation.getFloat("lat");
        Location location = Location.newInstance(longitude, latitude);
        return location;
    }

    private int cubicMetersToCentimeter (int meters) {
        return meters * 1000 * 1000;
    }

    private VehicleType getVehicleType(JSONObject vehicle) {
        String profile = vehicle.optString("profile");
        if (profile != null) {
            VehicleTypeImpl.Builder vehicleTypeBuilder = VehicleTypeImpl.Builder.newInstance(profile);
            JSONArray capacities = vehicle.optJSONArray("capacity");
            int volume = capacities != null ? cubicMetersToCentimeter(capacities.getInt(0)) : cubicMetersToCentimeter(3);
            int weight = capacities != null ? capacities.getInt(1): 5;

            vehicleTypeBuilder.addCapacityDimension(VOLUME_INDEX, volume);
            vehicleTypeBuilder.addCapacityDimension(WEIGHT_INDEX, weight);
            vehicleTypeBuilder.setCostPerDistance(1);
            vehicleTypeBuilder.setCostPerTransportTime(1);
            return vehicleTypeBuilder.build();
        }
        return vehicleDummyType;
    }

    private void createCostMatrix() {
        routingCosts = new VRPCostMatrix().set(routeRequest, locations);
    }
}