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
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "esri/opsdashboard/MapToolProxy",
  "esri/tasks/BufferParameters",
  "esri/tasks/GeometryService",
  "esri/Color",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/graphic",
  "dojo/text!./bufferMapToolTemplate.html"
], function (declare, lang, _WidgetBase, _TemplatedMixin, MapToolProxy, BufferParameters,
             GeometryService, Color, SimpleLineSymbol, SimpleFillSymbol, PictureMarkerSymbol,
             Graphic, templateString) {

  return declare("BufferMapTool", [_WidgetBase, _TemplatedMixin, MapToolProxy], {

    templateString: templateString,

    constructor: function () {

      // The buffer parameters
      this.bufferParams = new BufferParameters();
      this.bufferParams.unit = GeometryService.UNIT_METER;
      this.bufferParams.distances = [500, 1000, 2000];

      // Create the graphic for the push pin
      var iconPath = location.href.replace(/\/[^/]+$/, '/');
      var symbol = new PictureMarkerSymbol(iconPath + "pushpin.png", 15, 30);
      symbol.yoffset = 10;
      this.pushPinGraphic = new Graphic(null, symbol);

      // Create the buffer graphics
      var outlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#000000"), 1);
      var bufferSymbol = new SimpleFillSymbol(SimpleLineSymbol.STYLE_SOLID, outlineSymbol, null);
      this.bufferGraphics = [];
      for (var i = 0; i < 3; i++) {
        this.bufferGraphics.push(new Graphic(null, bufferSymbol));
      }
    },

    hostReady: function () {
      //Set up the UI of the map tool and create the graphics layer
      //when the host (Operations Dashboard) is ready

      // Retrieve the geometry service specified for the organization
      // Note: The buffer.json manifest file must have the "usePortalServices" set to true
      // in order for the geometry service (and any other helper services) to be retrieved
      if (!this.portalHelperServices || !this.portalHelperServices.geometry) {
        alert("Cannot get the geometry service required for creating buffers.");
        this.deactivateMapTool();
        return;
      }

      // Update the buffer params with the target map widget spatial reference
      this.bufferParams.outSpatialReference = this.mapWidgetProxy.spatialReference;

      // Setup a geometry service
      this.geometryService = new GeometryService(this.portalHelperServices.geometry.url);

      // Update the size of the user experience
      this.setDisplaySize({
        width: Math.min(this.availableDisplaySize.width / 2, 400),
        height: 40
      });

      // Creates two graphics layers to control the order of draw buffers below the pushpin.
      return this.mapWidgetProxy.createGraphicsLayerProxy().then(lang.hitch(this, function (graphicsLayerProxy) {

        this.bufferGraphicsLayerProxy = graphicsLayerProxy;

        return this.mapWidgetProxy.createGraphicsLayerProxy().then(lang.hitch(this, function (graphicsLayerProxy) {
          this.pushPinGraphicsLayerProxy = graphicsLayerProxy;

          // Activate the drawing activity when the graphics layer is ready
          this.activateMapDrawing({geometryType: "point"});
        }));
      }));
    },

    availableDisplaySizeChanged: function (availableSize) {
      // Update the size of the user experience
      this.setDisplaySize({
        width: Math.min(availableSize.width / 2, 400),
        height: 40
      });
    },

    mapDrawComplete: function (geometry) {
      // When the drawing activity have been performed by the user use the resulting geometry
      // to calculate the buffer rings and display them on the map
      if (!geometry)
        return;

      // Clear the graphics layer.
      this.bufferGraphicsLayerProxy.clear();
      this.pushPinGraphicsLayerProxy.clear();

      // Immediately show a feedback for the user
      this.showPushPin(geometry);

      // Starts the buffering process
      this.showBuffers(geometry);
    },

    showBuffers: function (geometry) {

      // Use the geometry service to calculate 3 buffer rings around the clicked point

      // Update the buffer params
      this.bufferParams.geometries = [geometry];

      // When the buffer rings have been calculated, call this.onBufferResult to update the graphics
      this.geometryService.buffer(this.bufferParams, lang.hitch(this, function (geometries) {

        if (!geometries || geometries.length === 0)
          return;

        // For each of the buffer geometries, update the buffer graphics
        for (var i = 0; i < geometries.length; i++) {
          this.bufferGraphics[i].setGeometry(geometries[i]);
        }

        // Update the host graphics layer
        this.bufferGraphicsLayerProxy.addOrUpdateGraphics(this.bufferGraphics);
      }));
    },

    showPushPin: function (geometry) {

      // Update the position of the push pin graphic
      this.pushPinGraphic.setGeometry(geometry);

      // Update the host graphics layer
      this.pushPinGraphicsLayerProxy.addOrUpdateGraphic(this.pushPinGraphic);
    },

    deactivateMapTool: function () {
      // Deactivate the map tool when the Done button is clicked
      // Clean up then deactivating
      this.deactivateMapDrawing();
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.bufferGraphicsLayerProxy);
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.pushPinGraphicsLayerProxy);

      // Call the base function
      this.inherited(arguments, []);
    }
  });
});
