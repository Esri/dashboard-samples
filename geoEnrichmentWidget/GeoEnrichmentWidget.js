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
  "dojo/dom-class",
  "esri/dijit/geoenrichment/config",
  "esri/dijit/geoenrichment/Infographic",
  "esri/tasks/geoenrichment/DriveBuffer",
  "esri/dijit/geoenrichment/theme",
  "esri/tasks/geoenrichment/GeometryStudyArea",
  "esri/graphic",
  "esri/symbols/SimpleFillSymbol",
  "esri/opsdashboard/WidgetProxy",
  "dojo/text!./GeoEnrichmentWidgetTemplate.html"
], function (declare, lang, _WidgetBase, _TemplatedMixin, domClass, geConfig, Infographic, DriveBuffer, infographicTheme, GeometryStudyArea, Graphic, SimpleFillSymbol, WidgetProxy, templateString) {

  return declare("GeoEnrichmentWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {

    templateString: templateString,

    hostReady: function () {
      // Called when the widget has successfully established contact with the host operations dashboard

      // Creates a graphic to store the geo enrichment area
      this.areaGraphic = new Graphic(null, new SimpleFillSymbol())

      // Create a study area based on drive time, 5 mins
      this.studyArea = new DriveBuffer({radius: 5});

      // Request a new graphics layer for our results
      this.mapWidgetProxy.createGraphicsLayerProxy().then(lang.hitch(this, function (graphicsLayerProxy) {

        // Save the graphics layer for future reference
        this.bufferGraphicsLayerProxy = graphicsLayerProxy;

        // Configure the geo enrichment environment to use our current portal services
        geConfig.server = this.portalHelperServices.geoenrichment.url;
        geConfig.locatorUrl = this.portalHelperServices.geocode[0].url;

        // Create the infographics dijit and attach it to the template inforgraphicsDjit node
        this.infographics = new Infographic({
          type: "AgePyramid",
          variables: ["Age.*"],
          returnGeometry: true,
          theme: "light",
          studyAreaOptions: this.studyArea,
          "class": "infographics"
        }, this.infographicsDijit);

        // Listen to infographics error events and log them
        this.infographics.on("data-error", function (err) {
          console.log(err);
        });

        // Listent to infographics data ready events
        this.infographics.on("data-ready", lang.hitch(this, this.infographicsDataReady));

        // Start the infographics dijit
        this.infographics.startup();

        // Hide/Show stuff
        domClass.add(this.waitingMsg, "hide");
        domClass.remove(this.initialMsg, "hide");
      }));
    },

    hostInitializationError: function (err) {
      // Called when the widget could not establish contact with the host operations dashboard
      console.log(err);
    },

    getLocation: function (e) {
      // Called by the button in the template on click
      // Hide/Show stuff
      domClass.add(this.initialMsg, "hide");
      domClass.remove(this.useMapMsg, "hide");

      // Activate the drawing toolbar on the associated map widget
      this.activateDrawingToolbar({geometryTypes: ["point"]});
    },

    infographicsDataReady: function (event) {
      // Called when the infographics widget has finished gathering data
      // Show/Hide stuff
      domClass.add(this.waitingMsg, "hide");
      domClass.remove(this.infographicsDijit, "hide");

      // Add the infographics drive time polygon to our map widget graphic layer
      this.areaGraphic.setGeometry(event.provider.getGeometry());
      this.bufferGraphicsLayerProxy.addOrUpdateGraphic(this.areaGraphic);
    },

    toolbarDrawComplete: function (geometry) {
      // Called when the user has finished the drawing activity
      // Hide/Show stuff
      domClass.add(this.useMapMsg, "hide");
      domClass.remove(this.waitingMsg, "hide");

      // Set the geometry for the study area
      this.infographics.set("studyArea", new GeometryStudyArea({geometry: geometry}));
    },

    drawingToolbarDeactivated: function () {
      // Called when the user has cancelled the drawing toolbar
      // Clear our graphics layer
      this.bufferGraphicsLayerProxy.clear();

      // Hide/Show stuff
      domClass.remove(this.initialMsg, "hide");
      domClass.add(this.waitingMsg, "hide");
      domClass.add(this.useMapMsg, "hide");
      domClass.add(this.infographicsDijit, "hide");
    }
  });
});