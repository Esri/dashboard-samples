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
  "dojo/text!./ListWidgetConfigTemplate.html",
  "dijit/form/Select"
], function (declare, lang, Memory, _WidgetBase, _TemplatedMixin,_WidgetsInTemplateMixin,  WidgetConfigurationProxy, templateString) {

  return declare("ListWidgetConfig", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, WidgetConfigurationProxy], {
    templateString: templateString,

    postCreate:function(){
      this.inherited(arguments);
      this.displayFieldCombo.set("labelAttr", "alias");
    },

    dataSourceSelectionChanged: function (dataSourceProxy, dataSourceConfig) {

      this.dataSourceConfig = dataSourceConfig;

      var alphaNumericFields = [];
      dataSourceProxy.fields.forEach(function (field) {
        switch (field.type) {
          case "esriFieldTypeString":
          case "esriFieldTypeSmallInteger":
          case "esriFieldTypeInteger":
          case "esriFieldTypeSingle":
          case "esriFieldTypeDouble":
            alphaNumericFields.push(field);
            return;
        }
      });

      var alphaNumericFieldsStore = new Memory({
        idProperty: "name",
        data: alphaNumericFields
      });

      this.displayFieldCombo.set("store", alphaNumericFieldsStore);

      // Bug in select dijit, we need to clear the option on empty stores
      if (alphaNumericFields.length === 0)
        this.displayFieldCombo.containerNode.innerHTML = "";

      // Set previous field saved in config or set to default
      if (dataSourceConfig.displayField)
        this.displayFieldCombo.set("value", dataSourceConfig.displayField);
      else
        this.displayFieldChanged(this.displayFieldCombo.get("value"));
    },

    displayFieldChanged: function (value) {
      this.dataSourceConfig.displayField = value;
      this.validateConfig();
    },

    validateConfig: function () {
      if (!this.dataSourceConfig.displayField || this.dataSourceConfig.displayField === "")
        return this.readyToPersistConfig(false);

      this.readyToPersistConfig(true);
    }

  });
});
