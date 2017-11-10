import {Component, OnInit, OnDestroy, Input, ElementRef} from "@angular/core";
import {Subscription} from "rxjs/Rx";

import * as d3 from "d3";

import {Ticker, TickerMessage} from "./../../services/ticker.service";
import {Observable} from "rxjs/Observable";

@Component({
  selector: "stock-graph",
  templateUrl: "./graph.component.html",
  styleUrls: ["./graph.component.css"]
})
export class StockGraphComponent implements OnInit, OnDestroy {
  private _subscription: Subscription = Subscription.EMPTY;

  @Input("ticker") ticker: Ticker;
  values: IPrice[];
  path: any;
  line: any;
  svg: any;
  x: any;
  y: any;

  constructor(private el: ElementRef) {
    this.values = new Array(40);
    for (let index = 0; index < this.values.length; index++) {
      this.values[index] = {price: 50};
    }
  }

  ngOnInit(): void {
    const n = 40;
    const margin = {top: 20, right: 20, bottom: 20, left: 20};
    const width = 700;
    const height = 200;

    // x scale
    this.x = d3.scale
      .linear()
      .domain([0, n - 1])
      .range([0, width]);

    // y scale
    this.y = d3.scale
      .linear()
      .domain([0, 100])
      .range([height, 0]);

    this.line = d3.svg
      .line()
      .x((d, i) => this.x(i))
      .y((d, i) => this.y(d.price));

    this.svg = d3
      .select(this.el.nativeElement.querySelector("div.chart"))
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    this.svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    this.svg
      .append("g")
      .style("fill", "none")
      .style("stroke-width", "1.5px")
      .style("stroke", "#000")
      .style("font", "10px sans-serif")
      .attr("transform", "translate(0," + this.y(0) + ")")
      .call(
        d3.svg
          .axis()
          .scale(this.x)
          .orient("bottom")
      );

    this.svg
      .append("g")
      .style("fill", "none")
      .style("stroke-width", "1.5px")
      .style("font", "10px sans-serif")
      .style("stroke", "#000")
      .call(
        d3.svg
          .axis()
          .scale(this.y)
          .orient("left")
      );

    this.path = this.svg
      .append("g")
      .attr("clip-path", "url(#clip)")
      .append("path")
      .datum(this.values)
      .style("fill", "none")
      .style("stroke-width", "1.5px")
      .style("stroke", "#00BCD4")
      .attr("d", this.line);

    this.ticker.recentTicks = Observable.empty();
    this._subscription = this.ticker.ticks.subscribe(tick => this.render(tick));
  }

  ngOnDestroy(): void {
    // This is to work around Angular's View Caching.
    // Actual solution to clearing custom DOM TBD
    this.el.nativeElement.querySelector("div.chart").innerHTML = "";
    this._subscription.unsubscribe();
  }

  private render(latestValue: TickerMessage) {
    this.values.push(this.asPrice(latestValue));

    this.path
      .attr("d", this.line)
      .attr("transform", null)
      .transition()
      .ease("linear")
      .attr("transform", "translate(" + this.x(-1) + ",0)")
      .each("end", () => this.values.shift());
  }

  private asPrice = ({price}: TickerMessage) => ({price});
}

interface IPrice {
  price: number;
}
