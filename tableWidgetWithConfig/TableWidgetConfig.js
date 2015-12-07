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
  "dojo/store/Memory",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dijit/_WidgetsInTemplateMixin",
  "esri/opsdashboard/WidgetConfigurationProxy",
  "dojo/text!./TableWidgetConfigTemplate.html",
  "dojox/form/CheckedMultiSelect"
], function (declare, lang, Memory, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, WidgetConfigurationProxy, templateString) {

  return declare("TableWidgetConfig", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, WidgetConfigurationProxy], {
    templateString: templateString,

    postCreate: function () {
      this.inherited(arguments);
      this.multiSelectDiv.set("labelAttr", "alias");
      this.multiSelectDiv.set("multiple", true);
    },

    dataSourceSelectionChanged: function (dataSource, dataSourceConfig) {

      this.dataSourceConfig = dataSourceConfig;

      var alphaNumericFields = [];
      dataSource.fields.forEach(function (field) {
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

      this.multiSelectDiv.set("store", alphaNumericFieldsStore);

      // Set previous fields saved in config
      if (Array.isArray(dataSourceConfig.selectedFieldsNames))
        this.multiSelectDiv.set("value", dataSourceConfig.selectedFieldsNames);
    },

    onSelectionChanged: function (value) {
      if (!this.dataSourceConfig)
        return;

      this.dataSourceConfig.selectedFieldsNames = value;
      this.readyToPersistConfig(Array.isArray(value) && value.length > 0);
    }
  });
});
















