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
