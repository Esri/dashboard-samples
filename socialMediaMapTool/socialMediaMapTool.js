/*
 * Copyright 2017 Esri
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
  "dojo/io-query",
  "dojo/dom-class",
  "dojo/promise/all",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "esri/config",
  "esri/request",
  "esri/opsdashboard/MapToolProxy",
  "esri/Color",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/graphic",
  "esri/geometry/Extent",
  "esri/geometry/webMercatorUtils",
  "esri/geometry/Point",
  "esri/geometry/Circle",
  "esri/units",
  "dojo/text!./SocialMediaMapToolTemplate.html"
], function (declare, lang, ioQuery, domClass, all, _WidgetBase, _TemplatedMixin, esriConfig, esriRequest, MapToolProxy, Color, SimpleLineSymbol, SimpleFillSymbol, PictureMarkerSymbol, Graphic, Extent, webMercatorUtils, Point, Circle, Units, templateString) {

  return declare("SocialMediaMapTool", [_WidgetBase, _TemplatedMixin, MapToolProxy], {

    templateString: templateString,

    constructor: function () {

      // Create the push pin graphic
      var iconPath = location.href.replace(/\/[^/]+$/, '/');
      var pushpinSymbol = new PictureMarkerSymbol(iconPath + "imgs/pushpin.png", 15, 30);
      pushpinSymbol.yoffset = 10;
      this.pushPinGraphic = new Graphic(null, pushpinSymbol);

      // Create the buffer graphic
      var outlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0, 0.8]), 1);
      var bufferSymbol = new SimpleFillSymbol(SimpleLineSymbol.STYLE_SOLID, outlineSymbol, new Color([58, 146, 209, 0.2]));
      this.bufferGraphic = new Graphic(null, bufferSymbol);
      this.radiusUnit = Units.KILOMETERS;

      // Create the graphics for each photo. These graphics will be drawn at their taken locations
      this.flickrSymbol = new PictureMarkerSymbol(iconPath + "imgs/flickrIcon.png", 34, 46);
      this.flickrSymbol.yoffset = 10;
      this.flickrGraphics = [];

      // Create graphic for the selected photo
      var selectedFlickrSymbol = new PictureMarkerSymbol(iconPath + "imgs/selectedFlickrIcon.png", 53, 72);
      selectedFlickrSymbol.yoffset = 10;
      this.selectedPhotoGraphic = new Graphic(null, selectedFlickrSymbol);

      // Set up the query for the photo search request
      this.flickrDomain = "api.flickr.com";
      esriConfig.defaults.io.corsEnabledServers.push(this.flickrDomain);
    
      // ***************************************************************
      // NOTE: To run this sample, you must sign up for and enter here 
      // your Flickr API key.
      // ****************************************************************
      this.query = {
        method: "flickr.photos.search",
        api_key: "yourDeveloperKey",
        extras: "geo,description,date_taken,geo,url_s",
        text: "",
        content_type: 7,
        media: "photos",
        sort: "relevance",
        parse_tags: 1,
        view_all: 1,
        radius: 5,
        radius_units: "km",
        has_geo: 1,
        safe_search: 1,
        format: "json",
        nojsoncallback: 1
      };
    },

    hostReady: function () {
      // Update the query object using the properties saved into the configuration

      if (this.searchText){
        this.query.text = this.searchText;
        this.searchTextLabel.innerHTML = this.searchText;
      }

      if (this.radius) {
        this.query.radius = this.radius.value;
        this.query.radius_units = this.radius.unitString;

        if (this.radius.unitString === "mi")
          this.radiusUnit = Units.MILES;
      }

      // Update the size of the user experience
      this.setDisplaySize({
        width: Math.min(this.availableDisplaySize.width / 2, 700),
        height: 40
      });

      // Creates the graphics layers (the one created last will be drawn on top) 
      all({
        bufferGraphicsLayerProxy: this.mapWidgetProxy.createGraphicsLayerProxy(), 
        pushPinGraphicsLayerProxy: this.mapWidgetProxy.createGraphicsLayerProxy(), 
        mediaFeedsGraphicsLayerProxy: this.mapWidgetProxy.createGraphicsLayerProxy(),
        selectedPhotoGraphicsLayerProxy: this.mapWidgetProxy.createGraphicsLayerProxy()
      }).then(function(results){

        // The layer that contains the search area graphic
        this.bufferGraphicsLayerProxy = results.bufferGraphicsLayerProxy;

         // The layer that contains graphic indicating user's clicked location on the map
         this.pushPinGraphicsLayerProxy = results.pushPinGraphicsLayerProxy;

         // The layer that contains the graphics showing the media feeds' locations
         this.mediaFeedsGraphicsLayerProxy = results.mediaFeedsGraphicsLayerProxy;

         // The layer that contains the graphics showing the selected media's locations
         this.selectedPhotoGraphicsLayerProxy = results.selectedPhotoGraphicsLayerProxy;

        // Activate the drawing activity when the graphics layers are ready
        this.activateMapDrawing({geometryType: "point"});
      }.bind(this));
    },

    availableDisplaySizeChanged: function (availableSize) {
      // Update the size of the user interface based on whether the search page or the result page is being shown

      if (!domClass.contains(this.searchPage, "hide")) {
        // User is on the search page
        this.setDisplaySize({
          width: Math.min(availableSize / 2, 700),
          height: 40
        });
      } else {
        // User is on the result page
        this.setDisplaySize({
          width: Math.min(availableSize.width / 2, 350),
          height: Math.min(availableSize.height / 2, 450)
        });
      }
    },

    mapDrawComplete: function (geometry) {
      // When user finishes drawing, use the resulting geometry to search for the photos within the search area

      if (!geometry)
        return;

      // Immediately show a feedback at the location selected by the user
      this.showSelectedArea(geometry);

      // Search for the photos within the area
      this.searchForPhotos(geometry);
    },

    showSelectedArea: function (geometry) {
      // Show user's selected location and the search area

      this.pushPinGraphic.setGeometry(geometry);
      this.pushPinGraphicsLayerProxy.addOrUpdateGraphic(this.pushPinGraphic);

      this.bufferGraphic.setGeometry(new Circle(geometry, {"radius": this.query.radius , "radiusUnit": this.radiusUnit}));
      this.bufferGraphicsLayerProxy.addOrUpdateGraphic(this.bufferGraphic);

      this.bufferGraphicsLayerProxy.setVisibility(true);
      this.pushPinGraphicsLayerProxy.setVisibility(true);
    },

    searchForPhotos: function (geometry) {
      // Search for Flickr photos within the area

      if (geometry.spatialReference.isWebMercator())
        geometry = webMercatorUtils.webMercatorToGeographic(geometry);

      this.query.lat = geometry.y;
      this.query.lon = geometry.x;

      // Set the min and max taken dates of the photos
      if (this.dateback) {
        var now = moment(new Date());
        var minTakenDate = now.clone().subtract(this.dateback.value, this.dateback.unitString);
        this.query.min_taken_date = minTakenDate.format("YYYY-MM-DD HH:mm:SS");
      }
      this.query.max_taken_date = now.format("YYYY-MM-DD HH:mm:SS");

      // Search for photos
      var requestUrl = "https://" + this.flickrDomain + "/services/rest/?" + ioQuery.objectToQuery(this.query);
      esriRequest({
        url: requestUrl
      }).then(function (response) {

        if (!response || !response.photos || !response.photos.photo) {
          console.log("error doing photo search");
          return;
        }

        var photos = response.photos.photo;
        if (photos.length === 0) {
          alert("No photo was found. Please refine your search criteria.");
          this.clearFeedbackGraphics();
          return;
        }

        // Clear the previous search results and graphics
        this.mediaFeedsGraphicsLayerProxy.clear();
        this.selectedPhotoGraphicsLayerProxy.clear();
        this.flickrGraphics = [];
        this.photosInfo = [];

        // Show photos
        var photoLocation;
        var photoId = 0;
        photos.forEach(function (photo) {
          if (photo.latitude && photo.latitude) {

            photoLocation = new Point(photo.longitude, photo.latitude);
            if (this.mapWidgetProxy.spatialReference.isWebMercator())
              photoLocation = webMercatorUtils.geographicToWebMercator(photoLocation);

            this.flickrGraphics.push(new Graphic(photoLocation, this.flickrSymbol));
            this.photosInfo.push({
              id: ++photoId,
              title: photo.title,
              url: photo.url_s,
              description: photo.description._content,
              location: photoLocation
            })
          }
        }.bind(this));

        // Hide the feedback graphics
        this.clearFeedbackGraphics();

        // Show a graphic on the map at each photo's location
        this.mediaFeedsGraphicsLayerProxy.addOrUpdateGraphics(this.flickrGraphics);

        // Show the photos from the search result on the map tool UI
        this.showResultsPage();

      }.bind(this), function (error) {
        console.log("Error: ", error.message);
      });
    },

    showResultsPage: function () {
      // Hide the feedback graphics and show the result page

      domClass.add(this.searchPage, "hide");
      this.setDisplaySize({
        width: Math.min(this.availableDisplaySize.width / 2, 350),
        height: Math.min(this.availableDisplaySize.height / 2, 450)
      });
      domClass.remove(this.resultsPage, "hide");

      // Show the first photo on the result page
      this.currentPhotoIndex = 0;
      this.showPhoto();
    },

    showPhoto: function () {
      // Show the photo on the map toolbar and highlight the photo on the map

      // Show the photo
      this.photoCount.innerHTML = this.photosInfo.length;
      var photo = this.photosInfo[this.currentPhotoIndex];
      this.currentPhotoId.innerHTML = photo.id;
      this.photoTitle.innerHTML = photo.title;
      this.photoUrl.src = photo.url;
      this.photoDescription.innerHTML = photo.description;

      // Pan to the photo
      var photoLocationWM = photo.location;
      if (!photoLocationWM.spatialReference.isWebMercator())
        photoLocationWM = webMercatorUtils.geographicToWebMercator(photoLocationWM);
      this.mapWidgetProxy.panTo(photoLocationWM);

      // Highlight the graphic which represents the currently selected photo
      this.selectedPhotoGraphic.setGeometry(photoLocationWM);
      this.selectedPhotoGraphicsLayerProxy.addOrUpdateGraphic(this.selectedPhotoGraphic);
    },

    showPreviousPhoto: function () {
      // Show the previous photo. Reset the index to this.photos.length - 1 if the photo to show is the first one

      this.currentPhotoIndex = this.photosInfo[this.currentPhotoIndex].id === 1 ? (this.photosInfo.length - 1 ) : --this.currentPhotoIndex;
      this.showPhoto();
    },

    showNextPhoto: function () {
      // Show the next photo. Reset the index to 0 if the photo to show is the last one

      this.currentPhotoIndex = this.photosInfo[this.currentPhotoIndex].id === this.photosInfo.length ? 0 : ++this.currentPhotoIndex;
      this.showPhoto();
    },

    clearFeedbackGraphics: function () {
      // Clear the pushpin graphic and the search area graphic

      this.bufferGraphicsLayerProxy.clear();
      this.pushPinGraphicsLayerProxy.clear();
    },

    deactivateMapTool: function () {
      // Deactivate the map tool when the Done button is clicked

      this.deactivateMapDrawing();

      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.selectedPhotoGraphicsLayerProxy);
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.mediaFeedsGraphicsLayerProxy);
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.bufferGraphicsLayerProxy);
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.pushPinGraphicsLayerProxy);

      // Call the base function
      this.inherited(arguments, []);
    }
  });
});
