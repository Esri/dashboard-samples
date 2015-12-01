/**
 * COPYRIGHT 2015 ESRI
 *
 * TRADE SECRETS: ESRI PROPRIETARY AND CONFIDENTIAL
 * Unpublished material - all rights reserved under the
 * Copyright Laws of the United States and applicable international
 * laws, treaties, and conventions.

 * For additional information, contact:
 * Environmental Systems Research Institute, Inc.
 * Attn: Contracts and Legal Services Department
 * 380 New York Street
 * Redlands, California, 92373
 * USA

 * email: contracts@esri.com
 */
define([
  "dojo/parser",
  "dojo/_base/declare",
  "dojo/promise/all",
  "dojo/data/ObjectStore",
  "dojo/dom-class",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "esri/opsdashboard/MapToolProxy",
  "esri/tasks/BufferParameters",
  "esri/tasks/DistanceParameters",
  "esri/tasks/GeometryService",
  "esri/tasks/Geoprocessor",
  "esri/tasks/FeatureSet",
  "esri/layers/FeatureLayer",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/Color",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/TextSymbol",
  "esri/geometry/Point",
  "esri/geometry/Polygon",
  "esri/geometry/Polyline",
  "esri/SpatialReference",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/Font",
  "esri/graphic",
  "esri/request",
  "esri/config",
  "esri/geometry/webMercatorUtils",
  "dojo/text!./ergMapToolTemplate.html",
  "dijit/form/Select",
  "dijit/form/NumberSpinner",
  "dijit/form/_FormSelectWidget"
], function (parser, declare, all, ObjectStore, domClass, _WidgetBase, _TemplatedMixin, MapToolProxy, BufferParameters, DistanceParameters,
             GeometryService, Geoprocessor, FeatureSet, FeatureLayer, Query, QueryTask, Color, SimpleLineSymbol, SimpleFillSymbol, TextSymbol,
             Point, Polygon, Polyline, SpatialReference, PictureMarkerSymbol, Font, Graphic, esriRequest, esriConfig, webMercatorUtils, templateString) {

  esriConfig.defaults.io.corsEnabledServers.push("energysampleserver.esri.com");
  esriConfig.defaults.io.corsEnabledServers.push("ec2-54-188-107-195.us-west-2.compute.amazonaws.com");
  esriConfig.defaults.io.corsEnabledServers.push("arcgis-emergencymanagement-2057568539.us-east-1.elb.amazonaws.com");

  return declare("ERGMapTool", [_WidgetBase, _TemplatedMixin, MapToolProxy], {

    templateString: templateString,

    constructor: function () {
      this.gpERGByChemical = "http://ec2-54-188-107-195.us-west-2.compute.amazonaws.com:6080/arcgis/rest/services/COP/ERGByChemical/GPServer/ERG%20By%20Chemical";
      this.gpERGByPlacard = "http://ec2-54-188-107-195.us-west-2.compute.amazonaws.com:6080/arcgis/rest/services/COP/ERGByPlacard/GPServer/ERG%20By%20Placard";
      this.gpServiceURL = this.gpERGByChemical;

      this.findNearestWeatherStationURL = "http://ec2-54-188-107-195.us-west-2.compute.amazonaws.com:6080/arcgis/rest/services/COP/FindNearestWS/GPServer/FindNearestWeatherStation";
      this.queryTaskURL = "http://ec2-54-188-107-195.us-west-2.compute.amazonaws.com:6080/arcgis/rest/services/COP/Current_Wind_Speed_Direction/MapServer/0";
      this.featureLayerURL = "https://energy.esri.com/arcgis/rest/services/Bakken/Operations/FeatureServer/2";

      // Create the graphic for the spill location
      var iconPath = location.href.replace(/\/[^/]+$/, '/');
      var symbol = new PictureMarkerSymbol(iconPath + "images/pushpin.png", 30, 30);
      this.chemicalSpillGraphic = new Graphic(null, symbol);
      this.inputGeometries = [];

      //create the symbols need for the graphics layer - to be drawn after the gpservice call
      this.outlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0, 0], 0));
      this.fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, this.outlineSymbol, new Color([245, 135, 142, 0.5]));
      this.lineSymbolSOLID = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#000000"), 1);
      this.lineSymbolDASH = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color("#000000"), 1);

    },

    postCreate: function () {
      this.updateChemicalOrPlacardList();
      this.inherited(arguments);
    },

    hostReady: function () {
      //Set up the UI of the map tool and create the graphics layer
      //when the host (Operations Dashboard) is ready

      this.gpservice = new Geoprocessor(this.gpServiceURL);
      this.gpservice.setOutSpatialReference(this.mapWidgetProxy.spatialReference);

      this.findNearestWeatherStation = new Geoprocessor(this.findNearestWeatherStationURL);
      this.findNearestWeatherStation.setOutSpatialReference(this.mapWidgetProxy.spatialReference);

      this.queryTask = new QueryTask(this.queryTaskURL);
      this.featureLayer = new FeatureLayer(this.featureLayerURL);

      this.query = new Query();
      this.query.outSpatialReference = this.mapWidgetProxy.spatialReference;
      this.query.outFields = ["*"];

      if (this.portalHelperServices && this.portalHelperServices.geometry) {
        this.geometryService = new GeometryService(this.portalHelperServices.geometry.url);
      }
      this.distanceParams = new DistanceParameters();

      this.polyline = new Polyline(this.mapWidgetProxy.spatialReference);

      // Update the size of the user experience - hardcoded bcos of a bug(typo) in MapToolProxy.js
      this.setDisplaySize({
        width: Math.max(this.availableDisplaySize.width / 3, 450),
        height: Math.max(this.availableDisplaySize.height / 2, 400)
      });

      //Creates two graphics layers to draw the spill area and the impacts (areas affected) of the spill
      all({
        ergZoneGraphicsLayer_Proxy: this.mapWidgetProxy.createGraphicsLayerProxy(),
        chemicalSpillGraphicsLayer_Proxy: this.mapWidgetProxy.createGraphicsLayerProxy()
      }).then(function (results) {
        this.ergZoneGraphicsLayerProxy = results.ergZoneGraphicsLayer_Proxy;
        this.ergZoneGraphicsLayerProxy.setOpacity(0.5);
        this.chemicalSpillGraphicsLayerProxy = results.chemicalSpillGraphicsLayer_Proxy;
      }.bind(this));

    },

    // Update the size of the user experience
    availableDisplaySizeChanged: function (availableSize) {
      this.setDisplaySize({
        width: Math.max(this.availableDisplaySize.width / 3, 450),
        height: Math.max(this.availableDisplaySize.height / 2, 400)
      });
    },

    // When the drawing activity have been performed by the user use the resulting geometry
    // to calculate the impact on the zone and display them on the map
    mapDrawComplete: function (geometry) {
      if (!geometry)
        return;

      // Clear the graphics layer.
      this.ergZoneGraphicsLayerProxy.clear();
      this.chemicalSpillGraphicsLayerProxy.clear();

      // Immediately show a feedback for the user
      this.showSpillLocation(geometry);
      this.geometry = geometry;

    },

    //query the gpsservice to get the list of chemicals or placards based on thh user's choice
    updateChemicalOrPlacardList: function () {
      esriRequest({
        url: this.gpServiceURL,
        content: {f: "json"},
        handleAs: "json",
        callbackParamName: "callback"
      }).then(function (response) {
        var data = response.parameters[1].choiceList;

        if (this.materialList.options.length > 0) {
          var numberOfOptions = this.materialList.options.length;
          for (i = 0; i < numberOfOptions; i++) {
            this.materialList.options.remove(this.materialList.options[i]);
          }
        }

        data.forEach(function (choice) {
          var option = document.createElement("option");
          option.setAttribute("label", choice);
          option.setAttribute("value", choice);
          option.appendChild(document.createTextNode(choice));
          this.materialList.appendChild(option);
        }.bind(this));
      }.bind(this)), (function (err) {
        console.log("Error with esri request " + err);
      });
    },

    //choose if spill impact is measured by chemical or placard
    getChoice: function () {
      var value = this.calculateBy.value;
      if (value !== null || value !== undefined) {
        if (value === "Chemical")
          this.gpServiceURL = this.gpERGByChemical;
        else
          this.gpServiceURL = this.gpERGByPlacard;
      }
      this.updateChemicalOrPlacardList();
    },

    //Call the gp tool when the spill location is drawn
    runGeoProcessor: function () {
      //Show & hide the loading spinner accordingly
      if (this.geometry !== null && this.geometry !== undefined) {
        this.deactivateMapDrawing();
        domClass.remove(this.divDrawTool, "activate");
        domClass.remove(this.divLoading, "hide");
        domClass.add(this.divLoading, "show");
        this.generateERGZones(this.geometry);
      }
    },


    //call the gp service and execute the job
    //to get the areas & boundaries impacted by the spill
    generateERGZones: function (geometry) {
      this.ergZoneGraphicsLayerProxy.clear();
      this.gpservice = new Geoprocessor(this.gpServiceURL);

      var features = [];
      features.push(this.chemicalSpillGraphic);
      var featureSet = new FeatureSet();
      featureSet.features = features;

      this.params = {
        "in_features": JSON.stringify(featureSet.toJson()),
        "material_type": this.materialList.value,
        "wind_bearing": this.numberSpinner.value,
        "time_of_day": this.timeOfSpill.value,
        "spill_size": this.spillSize.value
      };

      this.gpservice.submitJob(this.params, function (jobInfo) {
        if (jobInfo.jobStatus === "esriJobSucceeded")
          this.gpservice.getResultData(jobInfo.jobId, "output_areas", function (results) {
            this.createERGArea(results);
            this.gpservice.getResultData(jobInfo.jobId, "output_lines", function (results) {
              this.createERGLine(results);
              this.chemicalSpillGraphic.setGeometry(null);
              this.geometry = null;
            }.bind(this));
          }.bind(this));
      }.bind(this), function (jobInfo) {
        console.log("status " + jobInfo.jobId);

      }, function (err) {
        console.log("Error " + err);
      });
    },

    //Fill the region impacted by the spill
    createERGArea: function (results) {
      this.ergAreaGraphics = [];
      this.featureLayerGraphics = [];

      results.value.features.forEach(function (feature) {
        var zone = feature.attributes.ERGZone;
        switch (zone) {
          case "Initial Isolation Zone":
            this.fillSymbol.setColor(new Color([245, 135, 142, 0.5]));
            feature.symbol = this.fillSymbol;
            break;
          case "Protective Action Zone":
            this.fillSymbol.setColor(new Color([245, 93, 103, 0.5]));
            feature.symbol = this.fillSymbol;
            break;
          case "Combined Zone":
            this.fillSymbol.setColor(new Color([255, 255, 255, 0]));
            feature.symbol = this.fillSymbol;
            this.sharedPolygon = new Polygon(feature.geometry);
            break;
          default:
            break;
        }
        feature.setSymbol(feature.symbol);
        this.ergAreaGraphics.push(feature);

        //Also update the feature service
        this.attr = {
          "Condition": feature.attributes["Materials"] + " leak detected in your area"
        };

        var featureLayerGraphic = new Graphic();
        featureLayerGraphic.setGeometry(feature.geometry);
        featureLayerGraphic.setAttributes(this.attr);
        this.featureLayerGraphics.push(featureLayerGraphic);

      }.bind(this));

      this.ergZoneGraphicsLayerProxy.addOrUpdateGraphics(this.ergAreaGraphics);

      this.featureLayer.applyEdits(this.featureLayerGraphics, null, null, this.onFeatureLayerUpdateComplete);

      if (this.zoomToResult.checked)
        this.mapWidgetProxy.panTo(new Point(this.chemicalSpillGraphic.geometry));

      domClass.remove(this.divLoading, "show");
      domClass.add(this.divLoading, "hide");
      domClass.add(this.runGP, "disabled");
    },

    //Draw the outline of the region impacted by the spill
    createERGLine: function (results) {
      this.ergLineGraphics = [];
      results.value.features.forEach(function (feature) {
        var lineType = feature.attributes.LineType.toString();
        switch (lineType) {
          case "Arc":
            feature.symbol = this.lineSymbolSOLID;
            this.inputGeometries[1] = feature.geometry;
            break;
          case "Radial":
            feature.symbol = this.lineSymbolDASH;
            break;
          default:
            break;
        }
        feature.setSymbol(feature.symbol);

        this.ergLineGraphics.push(feature);

      }.bind(this));

      this.ergZoneGraphicsLayerProxy.addOrUpdateGraphics(this.ergLineGraphics);
      this.calculateRangeOfSpill(this.sharedPolygon);
    },

    //estimate the range of spill impacts - using distance
    calculateRangeOfSpill: function (sharedPolygon) {
      for (i = 0; i < this.polyline.paths.length; i++)
        this.polyline.removePath(i);

      this.distanceParams.distanceUnit = GeometryService.UNIT_STATUTE_MILE;
      this.distanceParams.geometry1 = this.inputGeometries[0];
      this.distanceParams.geometry2 = this.inputGeometries[1];
      this.distanceParams.geodesic = true;
      this.geometryService.distance(this.distanceParams, function (distance) {
        this.distance = distance;
        this.polylineGeometries = [];
        this.polylineGeometries.push(this.inputGeometries[0]);

        if (this.inputGeometries[1].paths[0].length % 2 === 0) {
          this.x = (this.inputGeometries[1].paths[0][Math.floor((this.inputGeometries[1].paths[0].length - 1) / 2)][0] + this.inputGeometries[1].paths[0][Math.floor((this.inputGeometries[1].paths[0].length - 1) / 2) + 1][0]) / 2;
          this.y = (this.inputGeometries[1].paths[0][Math.floor((this.inputGeometries[1].paths[0].length - 1) / 2)][1] + this.inputGeometries[1].paths[0][Math.floor((this.inputGeometries[1].paths[0].length - 1) / 2) + 1][1]) / 2;
          this.polylineGeometries.push(new Point(this.x, this.y, new SpatialReference({wkid: 3857})));
        }
        else
          this.polylineGeometries.push(new Point(this.inputGeometries[1].paths[0][Math.round((this.inputGeometries[1].paths[0].length - 1 ) / 2)]));

        this.polyline.addPath(this.polylineGeometries);

        var graphic = new Graphic(this.polyline, this.lineSymbolSOLID);
        this.chemicalSpillGraphicsLayerProxy.addOrUpdateGraphic(graphic);

        var ergPolygons = [];
        ergPolygons.push(sharedPolygon);
        this.geometryService.labelPoints(ergPolygons, function (labelPoints) {
          var font = new Font("20px", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLDER);
          var textSymbol = new TextSymbol(this.distance.toFixed(2) + " miles");

          var labelPointGraphic = new Graphic(labelPoints[0], textSymbol);
          this.chemicalSpillGraphicsLayerProxy.addOrUpdateGraphic(labelPointGraphic);

        }.bind(this));
      }.bind(this));
    },

    //add or update the pushpin after the spill location is drawn
    showSpillLocation: function (geometry) {
      // Update the position of the push pin graphic
      this.chemicalSpillGraphic.setGeometry(geometry);
      this.inputGeometries[0] = geometry;

      // Update the host graphics layer
      this.chemicalSpillGraphicsLayerProxy.addOrUpdateGraphic(this.chemicalSpillGraphic);

      this.lookupWindInfo();

      domClass.remove(this.divWindInfo, "show");
      domClass.add(this.divWindInfo, "hide");

      domClass.add(this.windInfo, "show");
      domClass.remove(this.windInfo, "hide");

      domClass.remove(this.runGP, "disabled");
    },


    //activate the drawing tool
    activateMapTool: function () {
      this.activateMapDrawing({geometryType: "point"});
      domClass.add(this.divDrawTool, "activate");
    },

    // Deactivate the map tool when the Done button is clicked
    deactivateMapTool: function () {
      this.deactivateMapDrawing();

      // Clean up when deactivating
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.chemicalSpillGraphicsLayerProxy);
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.ergZoneGraphicsLayerProxy);

      // Call the base function
      this.inherited(arguments, []);
    },

    //clear the graphics on the graphics layers
    clearResults: function () {
      this.ergZoneGraphicsLayerProxy.clear();
      this.chemicalSpillGraphicsLayerProxy.clear();
      this.chemicalSpillGraphic.setGeometry(null);
      this.geometry = null;
      domClass.add(this.runGP, "disabled");
    },

    //Get the nearest weather station id
    // and then get the wind direction info
    lookupWindInfo: function () {
      var features = [];
      features.push(this.chemicalSpillGraphic);
      var featureSet = new FeatureSet();
      featureSet.features = features;

      this.params = {
        "Feature_Set": JSON.stringify(featureSet.toJson())
      };

      this.findNearestWeatherStation.execute(this.params, function (results) {
        this.lookupWindDirection(results[0].value.features[0].attributes["NEAR_FID"]);

      }.bind(this));
    },

    //Get the wind direction info
    lookupWindDirection: function (fid) {
      this.query.where = "OBJECTID = " + fid;
      this.queryTask.execute(this.query, function (result) {
        domClass.remove(this.divWindInfo, "hide");
        domClass.add(this.divWindInfo, "show");
        domClass.add(this.windInfo, "hide");

        this.stationName.innerText = "Station Name : " + result.features[0].attributes["StationName"];
        this.windDirection.innerText = "Wind Direction : " + result.features[0].attributes["WindDirection"];

        if (result.features[0].attributes["WindDirection"] !== null)
          this.numberSpinner.value = result.features[0].attributes["WindDirection"];

      }.bind(this));

    },

    //Update the feature service - edits
    onFeatureLayerUpdateComplete: function (graphics) {
      console.log("Edits done");
    }
  });

});
