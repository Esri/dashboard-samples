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
  "dojo/store/Memory",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dijit/_WidgetsInTemplateMixin",
  "esri/opsdashboard/WidgetConfigurationProxy",
  "dojo/text!./ScatterPlotWidgetConfigTemplate.html",
  "dijit/form/Select"
], function (declare, lang, Memory, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, WidgetConfigurationProxy, templateString) {

  return declare("ScatterPlotWidgetConfig", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, WidgetConfigurationProxy], {

    templateString: templateString,

    postCreate: function () {
      this.inherited(arguments);

      debugger;

      this.idFieldCombo.set("labelAttr", "alias");
      this.xFieldCombo.set("labelAttr", "alias");
      this.yFieldCombo.set("labelAttr", "alias");
    },

    dataSourceSelectionChanged: function (dataSourceProxy, dataSourceConfig) {

      this.dataSourceConfig = dataSourceConfig;

      var numericFields = [];
      var alphaNumericFields = [];
      dataSourceProxy.fields.forEach(function (field) {
        switch (field.type) {
          case "esriFieldTypeString":
            alphaNumericFields.push(field);
            return;

          case "esriFieldTypeSmallInteger":
          case "esriFieldTypeInteger":
          case "esriFieldTypeSingle":
          case "esriFieldTypeDouble":
            alphaNumericFields.push(field);
            numericFields.push(field);
            return;
        }
      });

      var numericFieldsStore = new Memory({
        idProperty: "name",
        data: numericFields
      });

      var alphaNumericFieldsStore = new Memory({
        idProperty: "name",
        data: alphaNumericFields
      });

      this.idFieldCombo.set("store", alphaNumericFieldsStore);
      this.xFieldCombo.set("store", numericFieldsStore);
      this.yFieldCombo.set("store", numericFieldsStore);

      // Bug in select dijit, we need to clear the option on empty stores
      if (alphaNumericFields.length === 0)
        this.idFieldCombo.containerNode.innerHTML = "";
      if (numericFields.length === 0) {
        this.xFieldCombo.containerNode.innerHTML = "";
        this.yFieldCombo.containerNode.innerHTML = "";
      }

      // Set previous field saved in config or set to default
      if (dataSourceConfig.idField)
        this.idFieldCombo.set("value", dataSourceConfig.idField);
      else
        this.idFieldChanged(this.idFieldCombo.get("value"));

      if (dataSourceConfig.xField)
        this.xFieldCombo.set("value", dataSourceConfig.xField);
      else
        this.xFieldChanged(this.xFieldCombo.get("value"));

      if (dataSourceConfig.yField)
        this.yFieldCombo.set("value", dataSourceConfig.yField);
      else
        this.yFieldChanged(this.yFieldCombo.get("value"));
    },

    idFieldChanged: function (value) {
      this.dataSourceConfig.idField = value;
      this.validateConfig();
    },

    xFieldChanged: function (value) {
      this.dataSourceConfig.xField = value;
      this.validateConfig();
    },

    yFieldChanged: function (value) {
      this.dataSourceConfig.yField = value;
      this.validateConfig();
    },

    validateConfig: function () {
      if (!this.dataSourceConfig.idField || this.dataSourceConfig.idField === "")
        return this.readyToPersistConfig(false);
      if (!this.dataSourceConfig.xField || this.dataSourceConfig.xField === "")
        return this.readyToPersistConfig(false);
      if (!this.dataSourceConfig.yField || this.dataSourceConfig.yField === "")
        return this.readyToPersistConfig(false);

      this.readyToPersistConfig(true);
    }
  });
});