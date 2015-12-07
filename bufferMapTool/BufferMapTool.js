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
