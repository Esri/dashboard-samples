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
  "esri/opsdashboard/WidgetProxy",
  "dojo/store/Memory",
  "dojo/store/Observable",
  "esri/tasks/query",
  "dgrid/OnDemandGrid",
  "dojo/text!./TableWidgetTemplate.html"
], function (declare, lang, _WidgetBase, _TemplatedMixin, WidgetProxy, Memory, Observable, Query, Grid, templateString) {

  return declare("TableWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {
    templateString: templateString,
    debugName: "TableWidget",

    hostReady: function () {

      // Create the store we will use to display the features in the grid
      this.store = new Observable(new Memory());

      // Get from the data source and the associated data source config
      // The dataSourceConfig stores the fields selected by the operation view publisher during configuration
      var dataSourceProxy = this.dataSourceProxies[0];
      var dataSourceConfig = this.getDataSourceConfig(dataSourceProxy);

      // Create the grid
      var columns = [];
      dataSourceConfig.selectedFieldsNames.forEach(function (field) {
        columns.push({field: field});
      });
      this.grid = new Grid({
        store: this.store,
        cleanEmptyObservers: false,
        columns: columns
      }, this.gridDiv);

      this.grid.startup();

      // Create the query object
      var fieldsToQuery = dataSourceConfig.selectedFieldsNames.slice();
      if (fieldsToQuery.indexOf(dataSourceProxy.objectIdFieldName) === -1)
        fieldsToQuery.push(dataSourceProxy.objectIdFieldName);

      this.query = new Query();
      this.query.outFields = fieldsToQuery;
      this.query.returnGeometry = false;
    },

    dataSourceExpired: function (dataSourceProxy, dataSourceConfig) {

      // Execute the query. A request will be sent to the server to query for the features.
      // The results are in the featureSet
      dataSourceProxy.executeQuery(this.query).then(function (featureSet) {

        // Show the name of the data source and the number of features returned from the query
        this.updateDataSourceInfoLabel(dataSourceProxy.name, featureSet);

        // Show the features in the table
        this.updateAttributeTable(featureSet, dataSourceProxy);
      }.bind(this));
    },

    updateDataSourceInfoLabel: function (dataSourceName, featureSet) {

      // Compose the correct string to display
      var dataSourceInfo = dataSourceName;
      if(!featureSet.features || featureSet.features.length == 0)
        dataSourceInfo += " has no feature";
      else
        dataSourceInfo += " has " + featureSet.features.length + " features";

      this.infoLabel.innerHTML = dataSourceInfo;
    },

    updateAttributeTable: function (featureSet, dataSourceProxy) {
      // For each feature put them in the store and overwrite any existing
      // Potential improvement: Remove from the store the features that were not part of this update.
      if (this.store.data.length > 0) {
        this.store.query().forEach(function (item) {
          this.store.remove(item.id);
        }.bind(this));
      }
      if(featureSet.features) {
        featureSet.features.forEach(function (feature) {
          this.store.put(feature.attributes, {
            overwrite: true,
            id: feature.attributes[dataSourceProxy.objectIdFieldName]
          });
        }.bind(this));
      }
    }
  });
});






















