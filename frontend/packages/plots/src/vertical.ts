const d3 = require("d3");
require("d3-selection-multi");
import { functions, math, Stereonet } from "@attitude/core";
import chroma from "chroma-js";
import "./main.styl";
import "./plot.styl";
import { useEffect, useRef } from "react";
import h from "@macrostrat/hyper";

const opts = {
  degrees: true,
  traditionalLayout: false,
  adaptive: true,
  n: 60, // Bug if we go over 60?
  level: [1], // 95% ci for 2 degrees of freedom
};

// Functions for two levels of error ellipse
const createEllipses = functions.errorEllipse(opts);

function setStyle(d, i) {
  const e = d3.select(this);

  const cfunc = function (max) {
    let a = (max / d.max_angular_error) * 5;
    if (a > 0.8) {
      a = 0.8;
    }
    if (isNaN(a)) {
      a = 0.5;
    }
    return a;
  };

  const color = chroma(d.color ?? "#aaaaaa");
  const fill = color.alpha(cfunc(1)).css();
  const stroke = color.alpha(cfunc(2)).css();
  console.log(cfunc(1));

  const v = e.selectAll("path").attr("fill", fill).attr("stroke", stroke);
  if (d.in_group) {
    v.attr("stroke-dasharray", "2,2").attr("fill", "transparent");
  }
}

function buildPlot(el, data, opts = {}) {
  const { clipAngle = 15, margin = 25, size = 400 } = opts;

  const stereonet = Stereonet({ interactive: false })
    .margin(margin)
    .clipAngle(clipAngle)
    .size(size)
    .graticule(30, 2.5);

  const svg = d3.select(el).attr("class", "stereonet").call(stereonet);

  //const fn = regroupData(opts.groupings || []);
  //data = await fn(data);

  stereonet
    .ellipses(data) //.filter (d)-> not d.in_group
    .each(setStyle)
    .on("mouseover", (d) => console.log(d.id, d.in_group, d.ids || []));

  stereonet.vertical();
  stereonet.draw();

  return d3.select(el).selectAll("text.outer").attr("dy", -4);
}

function VerticalClippedStereonet({ data }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current == null) return;
    buildPlot(ref.current, data);
  }, [ref, data]);
  return h("div.plot-container", null, h("svg.plot", { ref }));
}

export { VerticalClippedStereonet };
