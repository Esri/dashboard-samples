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
  "esri/tasks/query"
], function (declare, lang, _WidgetBase, _TemplatedMixin, WidgetProxy, Query) {

  return declare("ScatterPlotWidget", [_WidgetBase, _TemplatedMixin, WidgetProxy], {
    baseClass: "chart",
    templateString: "<svg class='${baseClass}'></svg>",

    postCreate: function () {
      this.inherited(arguments);

      // *****************************************************************
      // D3 setup
      this.margin = {top: 20, right: 30, bottom: 40, left: 40};
      this.chart = d3.select(this.domNode);
      this.plot = this.chart.append("g")
        .attr("class", "plot");

      // x-axis
      this.plot.append("g").attr("class", "x axis");
      this.xScale = d3.scale.linear();
      this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom").ticks(5);

      // y-axis
      this.plot.append("g").attr("class", "y axis");
      this.yScale = d3.scale.linear();
      this.yAxis = d3.svg.axis().scale(this.yScale).orient("left");

      // Color ramp
      this.colorRamp = d3.scale.category10();

    },

    hostReady: function(){

      // Query the features and update the chart
      var dataSourceProxy = this.dataSourceProxies[0];
      var dataSourceConfig = this.getDataSourceConfig(dataSourceProxy);
      this.query = new Query();
      this.query.outFields = [dataSourceProxy.objectIdFieldName, dataSourceConfig.idField, dataSourceConfig.xField, dataSourceConfig.yField];
      this.query.returnGeometry = false;

    },

    dataSourceExpired: function (dataSourceProxy, dataSourceConfig) {

      var idField = dataSourceConfig.idField;
      var xField = dataSourceConfig.xField;
      var yField = dataSourceConfig.yField;

      //Setup the D3 functions
      function idValue(d) {
        return d.attributes[idField];
      }

      function xValue(d) {
        return parseFloat(d.attributes[xField]);
      }

      var xScale = this.xScale;

      function xMap(d) {
        return xScale(xValue(d));
      }

      function yValue(d) {
        return parseFloat(d.attributes[yField]);
      }

      var yScale = this.yScale;

      function yMap(d) {
        return yScale(yValue(d));
      }

      var colorRamp = this.colorRamp;

      function colorValue(d) {
        return colorRamp(idValue(d));
      }

      // Request data
      dataSourceProxy.executeQuery(this.query).then(lang.hitch(this, function (featureSet) {

        // Update the chart and plot dimensions
        var height = window.innerHeight - this.margin.top - this.margin.bottom;
        var width = window.innerWidth - this.margin.left - this.margin.right;
        this.chart.attr("width", width + this.margin.left + this.margin.right).attr("height", height + this.margin.top + this.margin.bottom);
        this.plot.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        // Update the plot scales
        this.xScale.range([0, width]);
        this.yScale.range([height, 0]);

        // don't want dots overlapping axis, so add in buffer to data domain
        this.xScale.domain([d3.min(featureSet.features, xValue) - 1, d3.max(featureSet.features, xValue) + 1]);
        this.yScale.domain([d3.min(featureSet.features, yValue) - 1, d3.max(featureSet.features, yValue) + 1]);

        // x-axis
        this.plot.select(".x.axis").attr("transform", "translate(0," + height + ")").call(this.xAxis);
        this.plot.select(".x.axis .label").attr("x", width);

        // y-axis
        this.plot.select(".y.axis").call(this.yAxis);

        // draw dots
        var dots = this.plot.selectAll(".dot")
          .data(featureSet.features, idValue);

        dots.exit().remove();

        dots.enter().append("circle").attr("class", "dot");

        dots
          .attr("r", 3.5)
          .attr("cx", xMap)
          .attr("cy", yMap)
          .style("fill", colorValue);
      }));
    }

  });
 });