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
  'dojo/on',
  "dojo/_base/lang",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dgrid/OnDemandList",
  "dgrid/Selection",
  "dojo/store/Memory",
  "dojo/store/Observable",
  "dojo/dom-construct",
  "esri/opsdashboard/WidgetProxy",
  "esri/tasks/query",
  "dojo/text!./ListWidgetTemplate.html"
], function (declare, on, lang, _WidgetBase, _TemplatedMixin, List, Selection, Memory, Observable, domConstruct, WidgetProxy, Query, templateString) {

  return declare("ListWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {
    templateString: templateString,
    debugName: "LIstWidget",

    hostReady: function () {

      // Create the store we will use to display the features
      this.store = new Observable(new Memory());
      //temporary local storage to hold the featureActionFeatures
      this.featureActionFeaturesStore = new Observable(new Memory());
      //cache the featureActionFeatures
      this.featureActionFeaturesCache = new Observable(new Memory());

      // Create the list and override the row rendering
      var dataSourceProxy = this.dataSourceProxies[0];
      var dataSourceConfig = this.getDataSourceConfig(dataSourceProxy);

      this.list = new (declare([List, Selection]))({
        store: this.store,
        cleanEmptyObservers: false,
        selectionMode: this.isNative ? "extended" : "toggle",
        renderRow: function (feature) {
          var divNode = domConstruct.create('div', {className: "item"});
          domConstruct.place(document.createTextNode(feature.attributes[dataSourceConfig.displayField]), divNode);
          return divNode;
        }
      }, this.listDiv);

      this.list.startup();

      //add the selected feature to the list of featureActionFeatures
      this.list.on("dgrid-select", function (event) {
        event.rows.forEach(function (row) {
          if (this.featureActionFeatures) {
            this.featureActionFeatures.addFeature(row.data);
            this.featureActionFeaturesStore.put(row.data);
          }
        }, this);
      }.bind(this));

      //remove the feature from the list of featureActionFeatures
      this.list.on("dgrid-deselect", function (event) {
        event.rows.forEach(function (row) {
          if (this.featureActionFeatures) {
            this.featureActionFeatures.removeFeature(row.data);
            this.featureActionFeaturesStore.remove(row.data.id);
          }
        }, this);
      }.bind(this));

      // Create the query object
      // Query the features and update the chart
      this.query = new Query();
      this.query.outFields = [dataSourceProxy.objectIdFieldName, dataSourceConfig.displayField];
      this.query.returnGeometry = false;
    },

    dataSourceExpired: function (dataSourceProxy, dataSourceConfig) {
      // Request data and process them
      //cache the featureActionFeatures before updating the store
      if (this.featureActionFeatures) {
        if (this.featureActionFeaturesStore.data.length > 0) {
          this.featureActionFeaturesCache.query().forEach(function (item) {
            this.featureActionFeaturesCache.remove(item.id);
          }.bind(this));

          this.featureActionFeaturesStore.query().forEach(function (_feature) {
            this.featureActionFeaturesCache.put(_feature);
          }, this);
        }
      }

      if (this.store.data.length > 0) {
        this.store.query().forEach(function (item) {
          this.store.remove(item.id);
        }.bind(this));
      }

      dataSourceProxy.executeQuery(this.query).then(function (featureSet) {
        if (featureSet.features) {
          //update the data store
          featureSet.features.forEach(function (feature) {
            this.store.put(feature, {overwrite: true, id: feature.attributes[dataSourceProxy.objectIdFieldName]});
          }.bind(this));

          //update the featureActionFeatures from the cache after the data store is updated
          if (this.featureActionFeatures && this.featureActionFeaturesCache.data.length > 0) {
            this.featureActionFeatures.clear();
            this.featureActionFeaturesCache.query().forEach(function (_feature) {
              this.featureActionFeatures.addFeature(_feature);
              this.list.select(this.list.row(parseInt(_feature.id)));
            }, this);
          }
        }
      }.bind(this));
    }
  });
});
