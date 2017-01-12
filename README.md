# dashboard-samples

Using the ArcGIS API for JavaScript, you can develop widget, map tools, and feature action extensions for Operations Dashboard running on Windows and in a browser.

![Operations Dashboard with extensions](https://github.com/Esri/dashboard-samples/blob/master/operations-dashboard-extensibility.png)

## Features
* Buffer map tool - A map tool that creates buffers from a clicked point.
* Elevation Profile widget - A widget that creates profile graphs by drawing lines interactively on the map.
* Export to CSV feature action - A feature action that exports the feature results into a CSV table.
* GeoEnrichment widget - A widget that displays an age pyramid from a clicked point.
* Line Chart widget - A line chart widget that is powered by data from your map or external data source.
* List widget - A custom list widget.
* Open browser tab feature action - A feature action that opens a web page on a new browser tab.
* Scatter plot widget - A widget that shows a scatter plot based on the selected fields of a data source.
* Table widget - A widget that shows the attributes of the features from a data source on a grid.
* Table widget with config - A widget that shows the attributes of the features based on the selected fields from a data source.
* Weather widget - This widget shows the weather observations for the map center, and refreshes automatically when map extent changes.

## Requirements
* [Operations Dashboard for ArcGIS](http://www.arcgis.com/opsdashboard/OperationsDashboard.application)
* Your favorite IDE
* Web browser with access to the Internet

## Resources
* Read our developer guide [here](https://developers.arcgis.com/javascript/jshelp/operations-dashboard-extensibility-overview.html).
* Read our API reference [here](https://developers.arcgis.com/javascript/jsapi/datasourceproxy-amd.html).

## Instructions - How to write a sample

 1. Create a folder for your sample.
 2. In the sample folder, you should have at minimum a JSON manifest file and a HTML file. Use HTML5 for your HTML file.
 3. You can also create a JS file with the business logic for the extension.
 4. Copy the following blueprint into your sample manifest file, update the properties and remove the unnecessary properties. Read the [manifest](https://developers.arcgis.com/javascript/jshelp/operations-dashboard-extensibility-create-ext-manifest.html) topic to learn more:
 
  ```
  {
    "type": <Type of sample: Widget, Map Tool, Feature Action>,
    "name": <A nice name>,
    "description": <A nice description>,
    "useDataFromView": <true|false>,
    "usePortalServices": <true|false>
    "runtime" : {
     "path": <The relative path of the runtime web page (the path from under the sample folder)>,
     "iconPath": <The relative path of the icon representing the sample (the path from under the sample folder)>,
    },
    "configuration": {
     “path": <The relative path of the configuration web page (the path from under the sample folder)>,
     "requiresDataSource": <true|false>,
     "requiresMapWidget": <true|false>,
     "supportFeatureActions": <true|false>
    },
    "credits": "Esri, http://www.esri.com"
  }
  ```
 
 5. Copy the following blueprint into your sample html file:
 
  ```
  <!DOCTYPE html>
  <html>
  <head lang="en">
    <meta charset="UTF-8">
    <title></title>
  
    <!-- Add your sample style here -->
  
  </head>
  
  <!-- Add your sample configuration or runtime html here -->
  <!-- You can also use Dijit -->
  
  <script>
    var extensionLocation = location.pathname.replace(/\/[^/]+$/, '');
    var dojoConfig = {
      async: true, // Anything is async from now on
      locale: location.search.match(/locale=([\w\-]+)/) ? RegExp.$1 : "en-us", // The locale of the Operations Dashboard
      host application is passed by url query params
      paths: {
        "extension": extensionLocation
      }
    };
  </script>
  <script src="//js.arcgis.com/3.19"></script>
  <script>
    require([
      "dojo/parser",
      "dojo/domReady!"
    ], function(parser){
      parser.parse();
    });
  </script>
  <!-- Add you additional javascript scripts here-->
  
  </body>
  </html>
  ```

 6. If your sample requires configuration, create an additional HTML file. Also you can create a JS file for the
 configuration's business logic. Make sure your manifest file contains the properties for the configuration.
 7. To test your sample,
 [start Operations Dashboard in developer mode](https://developers.arcgis.com/javascript/jshelp/operations-dashboard-extensibility-getstarted-setup-dev-env.html),
 then create a single-display operation view and add the extension. If you create a multi-display operation view, you can only open it in the
 Windows app, and you won't be able to debug your extension in the web browser.
 8. You can use the [extension debugger](https://developers.arcgis.com/javascript/jshelp/operations-dashboard-extensibility-test-debug.html)
 to debug your sample in the Windows app.

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

##  Licensing
Copyright 2015 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](https://github.com/Esri/dashboard-samples/blob/master/license.txt) file.

[](Esri Tags: ArcGIS Operations-Dashboard Extensions Samples)
[](Esri Language: JavaScript)​
