/*
 * Copyright 2016 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dojo/dom-class",
  "esri/opsdashboard/WidgetProxy",
  "esri/opsdashboard/MapWidgetProxy",
  "esri/geometry/webMercatorUtils",
  "esri/config",
  "esri/request",
  "dojo/text!./weatherTemplate.html"
], function (declare, lang, _WidgetBase, _TemplatedMixin, domClass, WidgetProxy, MapWidgetProxy, webMercatorUtils, esriConfig, esriRequest, templateString) {

  return declare("WeatherWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {
    templateString: templateString,

    // ***************************************************************
    // NOTE: To run this sample, you must sign up for and enter here a
    // free Weather Underground Developer API key.
    // Sign up at http://www.wunderground.com/weather/api/
    // ****************************************************************
    constructor: function () {
      this.inherited(arguments);

      this.developerKey = "yourDeveloperKey"; // ENTER YOUR WEATHER UNDERGROUND DEVELOPER API KEY HERE

      this.wundergroundDomain = "api.wunderground.com";
      esriConfig.defaults.io.corsEnabledServers.push(this.wundergroundDomain);
    },

    hostReady: function () {
      if (!this.developerKey) {
        this.showWarningPage("Enter a Weather Underground developer key to run this sample");
        return;
      }

      // Calculate the weather information when map extent changes
      this.mapWidgetProxy.subscribeToMapEvents();

      this.mapWidgetProxy.on("map-extent-change", function (result) {
        this.showLoadingPage();
        this.showWeatherInformation(result.extent);
      }.bind(this));

      // Calculate and show the weather information using the default map extent
      this.mapWidgetProxy.getMapExtent().then(function (extent) {
        this.showWeatherInformation(extent);
      }.bind(this), function (error) {
        this.showWarningPage("Error getting map extent");
        console.log("Error: ", error.message);
      }.bind(this));
    },

    showWeatherInformation: function (extent) {
      // Send a request to the Weather Underground API to get the weather information, then show the results

      // Get the center of the map extent. If spatial reference is Web Mercator, convert the point to Geographic, otherwise assume Geographic
      var mapCenter = extent.getCenter();
      var geoMapCenter = mapCenter.spatialReference.isWebMercator() ?
        webMercatorUtils.webMercatorToGeographic(mapCenter) : mapCenter;

      // Request for weather information
      var weatherServiceUrl = location.protocol + "//" + this.wundergroundDomain + "/api/" + this.developerKey + "/conditions/satellite/webcams/q/" +
        geoMapCenter.getLatitude() + "," + geoMapCenter.getLongitude() + ".json";

      esriRequest({
        url: weatherServiceUrl
      }).then(function (response) {

        if (!response) {
          this.showWarningPage("Error getting weather information");
          return;
        }

        // Request finishes successfully. Display the results
        this.displayResult(response);

      }.bind(this), function (error) {
        this.showWarningPage("Error getting weather information");
        console.log("Error: ", error.message);
      }.bind(this))
    },

    displayResult: function (response) {
      // Display the results

      var observation = response.current_observation;
      var satellite = response.satellite;

      if (!observation || !satellite) {
        this.showWarningPage("Weather information not available");
        return;
      }

      // Show the location information
      this.fullLocationName.innerHTML = observation.display_location.full;
      this.observationTime.innerHTML = observation.observation_time;

      // Show the observation result on the details page
      this.weather.innerHTML = observation.weather;

      this.weatherImg.src = observation.icon_url;
      this.weatherImgCaption.innerHTML = observation.temp_f + "&deg;F (" + observation.temp_c + "&deg;C); " +
        "Feels like " + observation.feelslike_f + "&deg;F (" + observation.feelslike_c + "&deg;C)";

      this.uv.innerHTML = observation.UV;
      this.windInfo.innerHTML = observation.wind_dir + " " + observation.wind_mph + " mph";
      this.precipitationToday.innerHTML = observation.precip_today_string;
      this.relativeHumidity.innerHTML = observation.relative_humidity;
      this.dewPoint.innerHTML = observation.dewpoint_f + "&deg;F (" + observation.dewpoint_c + "&deg;C)";
      this.visibility.innerHTML = observation.visibility_mi + " mi (" + observation.visibility_km + " km)";

      // Show the satellite image result on the map page
      this.visibleSatelliteImage.src = satellite.image_url_vis;

      // Show the result on the UI
      this.showResultsPage();
    },

    mapWidgetRemoved: function (removedMapWidgetId) {
      // Show an error message if the map widget used by the widget is removed

      if (this.mapWidgetProxy.id !== removedMapWidgetId)
        return;

      this.mapWidgetProxy.unsubscribeFromMapEvents();
      this.showWarningPage("Map widget is removed");
    },

    showLoadingPage: function () {
      domClass.remove(this.loadingPage, "hide");
      domClass.add(this.resultsPage, "hide");
      domClass.add(this.warningPage, "hide");
    },

    showResultsPage: function () {
      domClass.add(this.loadingPage, "hide");
      domClass.remove(this.resultsPage, "hide");
      domClass.add(this.warningPage, "hide");
    },

    showWarningPage: function (message) {
      this.warningMsg.innerHTML = message;

      domClass.add(this.loadingPage, "hide");
      domClass.add(this.resultsPage, "hide");
      domClass.remove(this.warningPage, "hide");
    },

    showDetailsPage: function () {
      domClass.remove(this.detailsPage, "hide");
      domClass.add(this.mapPage, "hide");

      domClass.add(this.detailsPageBtn, "active");
      domClass.remove(this.mapPageBtn, "active");
    },

    showMapPage: function () {
      domClass.add(this.detailsPage, "hide");
      domClass.remove(this.mapPage, "hide");

      domClass.remove(this.detailsPageBtn, "active");
      domClass.add(this.mapPageBtn, "active");
    }
  });
});