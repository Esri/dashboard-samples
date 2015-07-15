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
  "dgrid/OnDemandList",
  "dgrid/Selection",
  "dojo/store/Memory",
  "dojo/store/Observable",
  "dojo/dom-construct",
  "esri/opsdashboard/WidgetProxy",
  "esri/tasks/query",
  "dojo/text!./ListWidgetTemplate.html"
], function (declare, lang, _WidgetBase, _TemplatedMixin, List, Selection, Memory, Observable, domConstruct, WidgetProxy, Query, templateString) {

  return declare("ListWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {
    templateString: templateString,
    debugName: "LIstWidget",

    hostReady: function () {

      // Create the store we will use to display the features
      this.store = new Observable(new Memory());

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

      this.list.on("dgrid-select", lang.hitch(this, function (event) {
        event.rows.forEach(function (row) {
          this.featureActionFeatures.addFeature(row.data);
        }, this);
      }));

      this.list.on("dgrid-deselect", lang.hitch(this, function (event) {
        event.rows.forEach(function (row) {
          this.featureActionFeatures.removeFeature(row.data);
        }, this);
      }));

      this.list.startup();

      // Create the query object
      // Query the features and update the chart
      this.query = new Query();
      this.query.outFields = [dataSourceProxy.objectIdFieldName, dataSourceConfig.displayField];
      this.query.returnGeometry = false;

    },

    dataSourceExpired: function (dataSourceProxy, dataSourceConfig) {
      // Request data and process them
      dataSourceProxy.executeQuery(this.query).then(lang.hitch(this, function (featureSet) {
        featureSet.features.forEach(lang.hitch(this, function (feature) {
          this.store.put(feature, {overwrite: true, id: feature.attributes[dataSourceProxy.objectIdFieldName]});
        }));
      }));
    }
  });
});
