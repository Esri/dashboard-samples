/*
 * Copyright 2015 Esri
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
  "dojo/dom-class",
  "dojo/Deferred",
  "esri/tasks/Geoprocessor",
  "esri/graphic",
  "esri/geometry/webMercatorUtils",
  "esri/geometry/geodesicUtils",
  "esri/units",
  "esri/tasks/FeatureSet",
  "esri/Color",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/geometry/Point",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "esri/opsdashboard/WidgetProxy",
  "dojo/text!./elevationProfileWidgetTemplate.html"
], function (
  declare,
  lang,
  domClass,
  Deferred,
  Geoprocessor,
  Graphic,
  webMercatorUtils,
  geodesicUtils,
  Units,
  FeatureSet,
  Color,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  Point,
  _WidgetBase,
  _TemplatedMixin,
  WidgetProxy,
  templateString) {
    
    return declare("elevationProfileWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {

      templateString: templateString,

      constructor: function () {
        this.inherited(arguments);

        // Set the default unit to US standard (distance unit is miles)
        this.unit = "Miles";

        // Margins for the profile graph SVG
        this.margins = { top: 15, right: 40, bottom: 80, left: 60 };

        // Input line to be shown on the map
        var outlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#192a64"), 3);
        this.inputLineGraphic = new Graphic(null, outlineSymbol);

        // A symbol that marks the corresponding map location when user hovers on the profile graph
        var chartLocationSymbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_X,
          15,
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#000000"), 1),
          new Color("#000000"));
        this.locationGraphic = new Graphic(null, chartLocationSymbol);
      },

      postCreate: function () {
        this.inherited(arguments);

        // Set up the x and y ranges to fit the profile graph UI into the widget's window
        this.calculateRanges();

        // When window resizes, redraw the profile graph based on the new window dimension
        window.onresize = lang.hitch(this, function () {
          this.calculateRanges();

          if (this.profileGraph) {
            this.clearProfileGraph();
            this.showProfileGraph();
          }
        });
      },

      hostReady: function () {
        // Set up the elevation profile geoprocessing service
        // when the host (Operations Dashboard) is ready

        // Retrieve the async elevation service specified for the organization
        // Note: The elevationProfileWidget.json manifest file must have
        // the "usePortalServices" set to true in order for the elevation service
        // (and any other helper services) to be retrieved
        if (!this.portalHelperServices || !this.portalHelperServices.elevationSync) {
          console.log("Cannot get the elevation service.");
          return;
        }

        var profileServiceUrl = this.portalHelperServices.elevationSync.url + "/Profile";
        this.profileService = new Geoprocessor(profileServiceUrl);
        this.profileService.outSpatialReference = this.mapWidgetProxy.spatialReference;

        // Create a graphics layer to contain the input line graphic and the location marker graphic
        return this.mapWidgetProxy.createGraphicsLayerProxy().then(lang.hitch(this, function (graphicsLayerProxy) {

          this.graphicsLayerProxy = graphicsLayerProxy;
          this.graphicsLayerProxy.addOrUpdateGraphics([this.inputLineGraphic, this.locationGraphic]);
        }));
      },

      hostInitializationError: function (err) {
        // Called when the widget could not establish contact with Operations Dashboard
        console.log(err);
      },

      drawLine: function () {
        // Activate the drawing toolbar, and show the waiting page until user finishes drawing

        this.activateDrawingToolbar({ geometryTypes: ["polyline"] }).then(lang.hitch(this, function (result) {
          if (!result)
            console.log("Error activating drawing toolbar");
        }), lang.hitch(this, function (err) {
          console.log("Error activating drawing toolbar " + err);
        }));

        this.showWaitingPage();
      },

      cancelDrawLine: function () {
        // Reset the widget to the startup state

        this.deactivateDrawingToolbar(this.mapWidgetProxy);
        this.showStartupPage();
      },

      toolbarDrawComplete: function (inputLine) {
        // Capture the geometry of the input line,
        // then use it to calculate the elevation profile

        this.deactivateDrawingToolbar(this.mapWidgetProxy);

        this.showCalculatingPage();

        this.calculateElevationInfos(inputLine).then(lang.hitch(this, function (elevationInfos) {

          // Calculate the elevation profile
          this.elevationInfos = elevationInfos;

          // Hide the loading icon and show the profile graph
          this.showResultPage();

          if (!this.elevationInfos || !this.elevationInfos.elevations || !this.elevationInfos.locations) {
            console.log("Unable to get the elevation info");
            return;
          }

          // Update the input line's geometry and its host graphics layer
          this.inputLineGraphic.setGeometry(inputLine);
          this.graphicsLayerProxy.addOrUpdateGraphic(this.inputLineGraphic);

          // Show the elevation info on the profile graph
          this.showProfileGraph();

        }), lang.hitch(this, function (err) {
          // Error occurred when calculating the elevation profile
          // Reset the widget to the startup state

          alert(err);
          this.showStartupPage();
        }));
      },

      drawingToolbarDeactivated: function () {
        this.showStartupPage();
      },

      calculateElevationInfos: function (inputLine) {
        // Calculate the elevation profile for the input line

        var deferred = new Deferred();
        var inputLineFeatures = new FeatureSet();
        var elevations = [];
        var locations = [];

        // Convert web mercator polyline to geographic, then get the sampling distance
        // Assume geographic if not in web mercator
        var geoPolyline = (inputLine.spatialReference.isWebMercator()) ?
          webMercatorUtils.webMercatorToGeographic(inputLine) : inputLine;
        var profileLengthMeters = geodesicUtils.geodesicLengths([geoPolyline], this.getUnitConstant())[0];
        var samplingDistance = (profileLengthMeters / 198);

        // Create input feature set for the geoprocessing task
        inputLineFeatures.features = [new Graphic(inputLine)];

        this.profileService.execute({
          "InputLineFeatures": inputLineFeatures,
          "DEMResolution": "FINEST",
          "MaximumSampleDistance": samplingDistance,
          "MaximumSampleDistanceUnits": this.unit,
          "returnZ": true,
          "returnM": true
        }).then(lang.hitch(this, function (results) {

          if (results.length == 0) {
            deferred.reject(new Error("unable to get elevation information"));
            return;
          }

          // Add the elevation info (m and z values) and locations infos (x and y values)
          // into two arrays. They will be used to update the profile graph

          if (results[0].value.features.length == 0) {
            deferred.reject(new Error("unable to get elevation information"));
            return;
          }

          var profile = results[0].value.features[0].geometry;
          if (profile.paths.length == 0) {
            deferred.reject(new Error("unable to get elevation information"));
            return;
          }

          profile.paths[0].forEach(lang.hitch(this, function (profilePoint) {
            var elevationInfo = {
              m: profilePoint[3],
              z: profilePoint[2]
            };
            var locationInfo = {
              x: profilePoint[0],
              y: profilePoint[1]
            };
            elevations.push(elevationInfo);
            locations.push(locationInfo);
          }));

          deferred.resolve({
            locations: locations,
            elevations: elevations
          });
        }), deferred.reject);

        return deferred.promise;
      },

      showProfileGraph: function () {
        // Show the elevation data on a line chart

        if (!this.elevationInfos)
          return;

        var elevations = this.elevationInfos.elevations;
        var locations = this.elevationInfos.locations;

        // m (distance) and z (elevation) values are in meter.
        // They need to be converted into user's selected unit
        elevations = this.convertElevationInfoToSelectedUnit(elevations);

        this.profileGraph = d3.select("#profileGraph");

        // ********************************************************
        // Map the x and y domains (associated with m and z values respectively) into their ranges
        this.xRange.domain([
          d3.min(elevations, function (d) { return d.m }),
          d3.max(elevations, function (d) { return (d.m) })
        ]);

        this.yRange.domain([
          d3.min(elevations, function (d) { return d.z }),
          d3.max(elevations, function (d) { return (d.z + d.z / 10) })
        ]);

        // ********************************************************
        // Set up the axes
        var xAxis = d3.svg.axis()
          .scale(this.xRange)
          .tickFormat(this.mValueFormat());

        var yAxis = d3.svg.axis()
          .tickSize(2)
          .scale(this.yRange)
          .orient("left")
          .tickFormat(this.zValueFormat());

        // Create the axes UI
        this.profileGraph.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(0, " + (this.height - this.margins.bottom) + ")")
          .call(xAxis);

        this.profileGraph.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(" + (this.margins.left - 1) + ", 0)")
          .call(yAxis);

        // Add titles to the axes:
        // x axis
        this.profileGraph.append("text")
          .attr("class", "title")
          .attr("text-anchor", "middle")
          .attr("x", this.width / 2)
          .attr("y", this.height - 45)
          .text("Distance in " + this.unit);

        // y axis
        this.profileGraph.append("text")
          .attr("class", "title")
          .attr("text-anchor", "middle")
          .attr("transform", "translate(" + (this.margins.left / 4) + "," + (this.height / 2.5) + ")rotate(-90)")
          .text("Elevation in " + this.getZValueUnit());

        // ********************************************************
        // Define the line function, then use it to render the profile line
        var lineFunction = d3.svg.line()
          .x(lang.hitch(this, function (d) { return this.xRange(d.m); }))
          .y(lang.hitch(this, function (d) { return this.yRange(d.z); }))
          .interpolate("linear");

        this.profileGraph.append("path")
          .attr("class", "path")
          .attr("id", "profileLine")
          .attr("d", lineFunction(elevations));

        // ********************************************************
        // Create two area charts to color the profile graph's background,
        // one above the profile line and one below

        // Area chart above the profile line
        var areaAboveFunction = d3.svg.area()
          .x(lang.hitch(this, function (d) { return this.xRange(d.m); }))
          .y0(lang.hitch(this, function (d) { return this.yRange(d.z); }))
          .y1(this.margins.top);

        this.profileGraph.append("path")
          .datum(elevations)
          .attr("class", "area above")
          .attr("d", areaAboveFunction);

        // Area chart below the profile line
        var areaBelowFunction = d3.svg.area()
          .x(lang.hitch(this, function (d) { return this.xRange(d.m); }))
          .y0(this.height - this.margins.bottom)
          .y1(lang.hitch(this, function (d) { return this.yRange(d.z); }));

        this.profileGraph.append("path")
          .datum(elevations)
          .attr("class", "area below")
          .attr("d", areaBelowFunction);

        // ********************************************************
        // When hovering on the line chart, show a circle marker at the corresponding point on the profile line,
        // and show the z value based on the closest m value
        var focus = this.profileGraph.append("g")
          .style("display", "none")
          .attr("class", "focus");

        focus.append("circle")
          .attr("r", 4.5)
          .attr("x", -5)
          .attr("y", -5);

        focus.append("text")
          .attr("x", 10)
          .attr("y", -5);

        // ********************************************************
        // Display a vertical marker line on the chart when hovering the mouse over
        // Start by keeping the line off screen
        this.profileGraph.append("line")
          .attr("id", "markerLine")
          .attr("x1", -1)
          .attr("x2", -1)
          .attr("y1", 0 + this.margins.top)
          .attr("y2", this.height - this.margins.bottom);

        // ********************************************************
        // When mouse moves on the profile graph:
        // - Update the x coordinate of a vertical marker line
        // - Update the mouse marker and elevation text that move with the line
        // - Update the locationGraphic on the map to highlight the corresponding map location

        this.profileGraph.append("rect")
          .attr("class", "overlay")
          .attr("width", this.width)
          .attr("height", this.height)
          .on("mouseover", function () { focus.style("display", "inline"); })
          .on("mousemove", lang.hitch(this, function () {

            // Translate the mouse position to the corresponding elevation and location info

            // _m: the value mapped from this.xRange based on the current mouse position
            var _m = this.xRange.invert(d3.mouse(this.domNode)[0]);
            if (_m < 0) // mouse is on the left side of the x-axis
              return;

            // i: the index of _m when it's compared with all m vales in elevations
            var bisectM = d3.bisector(function (d) { return d.m; }).left;
            var i = bisectM(elevations, _m);

            // dElevations[0]: the elevation info whose m value is just smaller than _m
            // dElevations[1]: the elevation info whose m value is just greater than _m
            var dElevation0 = elevations[i - 1];
            var dElevation1 = elevations[i];
            if (!dElevation0 || !dElevation1)  // return if i or --i is out of the range of elevations
              return;

            // dElevation: equals dElevation1 if dElevation1.m is closer to _m, otherwise equals dElevation0
            var dElevation;
            if (_m - dElevation0.m > dElevation1.m - _m) {
              dElevation = dElevation1;
            }
            else {
              dElevation = dElevation0;
              --i;
            }
            var m = dElevation.m;
            var z = dElevation.z;

            // Slide the vertical line along the x axis as the mouse moves:
            // If its x position < this.margins.left (i.e. th line is on the left side of the y-axis),
            // move the line off-screen (-1); Otherwise, slide the line as the mouse moves
            var x = this.xRange(m) < this.margins.left ? -1 : this.xRange(m);
            this.profileGraph.select("#markerLine")
              .attr("x1", x)
              .attr("x2", x);

            // Show the mouse marker and elevation text next to the vertical line
            var elevationText = this.zValueFormat()(z) + " " + this.getZValueUnit();
            focus.select("text").text(elevationText);
            focus.attr("transform", "translate(" + this.xRange(m) + "," + this.yRange(z) + ")");

            // Update the geometry of the locationGraphic
            // location: the location information at the given dElevation
            var location = locations[i];
            this.locationGraphic.setGeometry(new Point(location.x, location.y, this.mapWidgetProxy.spatialReference));
            this.graphicsLayerProxy.addOrUpdateGraphic(this.locationGraphic);

          }));
      },

      calculateRanges: function () {
        this.height = window.innerHeight;
        this.width = window.innerWidth;

        this.xRange = d3.scale.linear()
          .range([this.margins.left, this.width - this.margins.right]);

        this.yRange = d3.scale.linear()
          .range([this.height - this.margins.bottom, this.margins.top]);
      },

      clearResult: function () {
        // Destroy the elements appended to the chart and remove the map graphics
        // Then show startup page
        this.clearProfileGraph();

        this.graphicsLayerProxy.clear();

        this.showStartupPage();
      },

      clearProfileGraph: function () {
        // Clear the UIs appended to the graph

        if (!this.profileGraph)
          return;

        this.profileGraph.selectAll("g").remove();
        this.profileGraph.selectAll("path").remove();
        this.profileGraph.selectAll("line").remove();
        this.profileGraph.selectAll("text").remove();
        this.profileGraph.selectAll("rect").remove();
      },

      selectedUnitChanged: function () {
        // Selected unit has changed. Clear the profile graph elements and recreate them
        if (this.unit === "Miles")
          this.unit = "Kilometers";
        else
          this.unit = "Miles";

        this.clearProfileGraph();
        this.showProfileGraph();
      },

      getUnitConstant: function () {
        // Return the unit constant based on the given string
        // Default is Units.Miles
        if (this.unit === "Kilometers")
          return Units.KILOMETERS;
        else if (this.unit === "Miles")
          return Units.MILES;
      },

      convertElevationInfoToSelectedUnit: function (elevations) {
        // For each item in elevationInfos, m (distance) and z (elevation) values are both in meters.
        // Convert them to their appropriate units

        var newElevations = elevations.map(lang.hitch(this, function (elevation) {
          var newElevation = {};
          if (this.unit == "Kilometers") {
            // If unit is metric: convert distance to km, no need to convert elevation
            newElevation.m = elevation.m * 0.001;
            newElevation.z = elevation.z;
          }
          else if (this.unit == "Miles") {
            // If unit is US standard: convert distance to mile, convert elevation to feet
            newElevation.m = elevation.m * 0.000621371;
            newElevation.z = elevation.z * 3.28084;
          }
          return newElevation;
        }));
        return newElevations;
      },

      getZValueUnit: function () {
        // Return the y-axis label based on the distance unit
        if (this.unit === "Kilometers")
          return "Meters";
        else if (this.unit === "Miles")
          return "Feet";
      },

      zValueFormat: function () {
        return d3.format(",.0f");
      },

      mValueFormat: function () {
        return d3.format(",.2f");
      },

      showStartupPage: function () {
        // Show the widget start up page with a button to let user
        // activate the drawing toolbar

        domClass.remove(this.drawLineMsg, "hide");
        domClass.add(this.waitingMsg, "hide");
        domClass.add(this.calculatingMsg, "hide");
        domClass.add(this.showGraphMsg, "hide");
      },

      showWaitingPage: function () {
        // The page to show when user is drawing a line on the map

        domClass.add(this.drawLineMsg, "hide");
        domClass.remove(this.waitingMsg, "hide");
        domClass.add(this.calculatingMsg, "hide");
        domClass.add(this.showGraphMsg, "hide");
      },

      showCalculatingPage: function () {
        // Show the loading page while the result is being calculated

        domClass.add(this.drawLineMsg, "hide");
        domClass.add(this.waitingMsg, "hide");
        domClass.remove(this.calculatingMsg, "hide");
        domClass.add(this.showGraphMsg, "hide");
      },

      showResultPage: function () {
        // Show the result page that displays the elevation profile

        domClass.add(this.drawLineMsg, "hide");
        domClass.add(this.waitingMsg, "hide");
        domClass.add(this.calculatingMsg, "hide");
        domClass.remove(this.showGraphMsg, "hide");
      }
    });
  });