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
  "esri/arcgis/Portal",
  "dojo/text!./PortalDataWidgetTemplate.html"
], function (declare, lang, _WidgetBase, _TemplatedMixin, WidgetProxy, arcgisPortal, templateString) {

  return declare("PortalDataWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {
    templateString: templateString,
    debugName: "PortalDataWidget",

    hostReady: function () {
      //create a new Portal object with the portalUrl and then signIn to get the portlUser object
      if (this.portalUrl) {
        this._portalUrl = this.portalUrl;
        this.portal = new arcgisPortal.Portal(this._portalUrl);
        this.portal.signIn().then(function (portalUser) {
          this.user = portalUser;
          this.updateUserInfo();
        }.bind(this));
      }
    },

    updateUserInfo: function () {
      //update user name & role
      this.lblUserName.innerHTML = this.user.fullName;
      this.lblUserRole.innerHTML = this.user.role;
    }
  });
});