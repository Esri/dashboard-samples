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