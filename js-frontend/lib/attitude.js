'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var chromaJs = _interopDefault(require('chroma-js'));
var crypto = _interopDefault(require('crypto'));

var cart2sph;
var combinedErrors$1;
var convolveAxes;
var d3$1;
var deconvolveAxes;
var ellipse;
var identity;
var norm;
var normalErrors;
var planeErrors;
var sdot;
var transpose;

d3$1 = require('d3');

transpose = function(array, length = null) {
  var i, j, k, l, m, newArray, ref, ref1, results;
  if (length == null) {
    length = array[0].length;
  }
  newArray = (function() {
    results = [];
    for (var k = 0; 0 <= length ? k < length : k > length; 0 <= length ? k++ : k--){ results.push(k); }
    return results;
  }).apply(this).map(function() {
    return [];
  });
  for (i = l = 0, ref = array.length; 0 <= ref ? l < ref : l > ref; i = 0 <= ref ? ++l : --l) {
    for (j = m = 0, ref1 = length; 0 <= ref1 ? m < ref1 : m > ref1; j = 0 <= ref1 ? ++m : --m) {
      newArray[j].push(array[i][j]);
    }
  }
  return newArray;
};

identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

norm = function(d) {
  var _;
  // L2 norm (hypotenuse)
  _ = d.map(function(a) {
    return a * a;
  });
  return Math.sqrt(d3$1.sum(_));
};

sdot = function(a, b) {
  var i, zipped;
  zipped = (function() {
    var k, ref, results;
    results = [];
    for (i = k = 0, ref = a.length; 0 <= ref ? k <= ref : k >= ref; i = 0 <= ref ? ++k : --k) {
      results.push(a[i] * b[i]);
    }
    return results;
  })();
  return d3$1.sum(zipped);
};

ellipse = function(opts) {
  var ell, ellAdaptive;
  // Basic function to create an array
  // of cosines and sines for error-ellipse
  // generation
  if (opts.n == null) {
    opts.n = 50;
  }
  if (opts.adaptive == null) {
    opts.adaptive = true;
  }
  ellAdaptive = function(a, b) {
    var angles, i, i_, k, l, ref, ref1, step, v;
    // Takes major, minor axis lengths
    i_ = 1;
    v = opts.n / 2;
    step = 2 / v;
    // Make a linearly varying space on the
    // interval [1,-1]
    angles = [];
    angles.push(Math.PI - Math.asin(i_));
    for (i = k = 0, ref = v; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
      i_ -= step;
      angles.push(Math.PI - Math.asin(i_));
    }
    for (i = l = 0, ref1 = v; 0 <= ref1 ? l < ref1 : l > ref1; i = 0 <= ref1 ? ++l : --l) {
      i_ += step;
      v = Math.asin(i_);
      if (v < 0) {
        v += 2 * Math.PI;
      }
      angles.push(v);
    }
    return (function() {
      var len, m, results;
      results = [];
      for (m = 0, len = angles.length; m < len; m++) {
        i = angles[m];
        results.push([b * Math.cos(i), a * Math.sin(i)]);
      }
      return results;
    })();
  };
  ell = function(a, b) {
    var angles, i, step;
    step = 2 * Math.PI / (opts.n - 1);
    angles = (function() {
      var k, ref, results;
      results = [];
      for (i = k = 0, ref = opts.n; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
        results.push(i * step);
      }
      return results;
    })();
    return (function() {
      var k, len, results;
      results = [];
      for (k = 0, len = angles.length; k < len; k++) {
        i = angles[k];
        // This reversal of B and A is causing tests to fail
        results.push([a * Math.cos(i), b * Math.sin(i)]);
      }
      return results;
    })();
  };
  if (opts.adaptive) {
    return ellAdaptive;
  } else {
    return ell;
  }
};

cart2sph = function(opts) {
  var c;
  if (opts.degrees == null) {
    opts.degrees = false;
  }
  c = opts.degrees ? 180 / Math.PI : 1;
  return function(d) {
    var r, x, y, z;
    r = norm(d);
    if (opts.traditionalLayout) {
      [y, z, x] = d;
    } else {
      [y, x, z] = d;
      x *= -1;
    }
    if (!opts.upperHemisphere) {
      z *= -1;
    }
    // Converts xyz to lat lon
    return [c * Math.atan2(y, x), c * Math.asin(z / r)];
  };
};

planeErrors = function(axesCovariance, axes, opts = {}) {
  var c1, ell, s, scales, sheet, stepFunc;
  // Get a single level of planar errors (or the
  // plane's nominal value) as a girdle
  if (opts.n == null) {
    opts.n = 100;
  }
  if (opts.upperHemisphere == null) {
    opts.upperHemisphere = true;
  }
  sheet = opts.sheet || 'nominal';
  if (axes == null) {
    axes = identity;
  }
  if (opts.traditionalLayout == null) {
    opts.traditionalLayout = true;
  }
  s = axesCovariance.map(Math.sqrt);
  axes = transpose(axes);
  scales = {
    upper: 1,
    lower: -1,
    nominal: 0
  };
  c1 = scales[sheet];
  if (opts.upperHemisphere) {
    c1 *= -1;
  }
  // Flip upper and lower rings
  if (axes[2][2] < 0) {
    c1 *= -1;
  }
  stepFunc = function(a) {
    var e, i, k, len, results;
    // Takes an array of [cos(a),sin(a)]
    e = [a[0], a[1], s[2] * c1];
    results = [];
    for (k = 0, len = axes.length; k < len; k++) {
      i = axes[k];
      results.push(sdot(e, i));
    }
    return results;
  };
  ell = ellipse(opts);
  return ell(s[0], s[1]).map(stepFunc).map(cart2sph(opts));
};

normalErrors = function(axesCovariance, axes, opts = {}) {
  var c1, ell, s, scales, stepFunc, v0;
  // Get a single level of planar errors (or the
  // plane's nominal value) as a girdle

  // Should use adaptive resampling
  // https://bl.ocks.org/mbostock/5699934
  if (opts.n == null) {
    opts.n = 100;
  }
  if (opts.upperHemisphere == null) {
    opts.upperHemisphere = true;
  }
  if (opts.traditionalLayout == null) {
    opts.traditionalLayout = true;
  }
  if (opts.sheet == null) {
    opts.sheet = 'upper';
  }
  if (axes == null) {
    axes = identity;
  }
  if (opts.level == null) {
    opts.level = 1;
  }
  scales = {
    upper: 1,
    lower: -1
  };
  s = axesCovariance.map(Math.sqrt);
  axes = transpose(axes);
  v0 = scales[opts.sheet];
  c1 = 1 * v0;
  if (opts.upperHemisphere) {
    c1 *= -1;
  }
  c1 *= opts.level;
  //if axes[2][2] < 0
  //  for i in [0..2]
  //    axes[i] = axes[i].map (d)->d*-1
  //  c1 *= -1
  stepFunc = function(es) {
    var e, i, k, len, results;
    e = es.map(function(d, i) {
      return -d * c1 * s[2] / s[i];
    });
    e.push(norm(es) * v0);
    results = [];
    for (k = 0, len = axes.length; k < len; k++) {
      i = axes[k];
      results.push(sdot(e, i));
    }
    return results;
  };
  ell = ellipse(opts);
  return ell(s[0], s[1]).map(stepFunc).map(cart2sph(opts));
};

combinedErrors$1 = function(sv, ax, opts = {}) {
  var func, out;
  func = function(type) {
    opts.sheet = type;
    opts.degrees = true;
    return planeErrors(sv, ax, opts);
  };
  return out = {
    nominal: func('nominal'),
    upper: func('upper'),
    lower: func('lower')
  };
};

convolveAxes = function(axes, sv) {
  var residual;
  // Convolve unit-length principal axes
  // with singular values to form vectors
  // representing the orientation and magnitude
  // of hyperbolic axes
  // In case we don't pass normalized axes
  [residual, axes] = deconvolveAxes(axes);
  return axes.map(function(row, i) {
    return row.map(function(e) {
      return e * sv[i];
    });
  });
};

deconvolveAxes = function(axes) {
  var ax, i, j, k, l, ref, ref1, sv;
  // Deconvolve unit-length principal axes and
  // singular values from premultiplied principal axes
  // Inverse of `convolveAxes`
  ax = transpose(axes);
  sv = ax.map(norm);
  for (i = k = 0, ref = axes.length; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
    for (j = l = 0, ref1 = axes.length; 0 <= ref1 ? l < ref1 : l > ref1; j = 0 <= ref1 ? ++l : --l) {
      axes[j][i] /= sv[i];
    }
  }
  return [sv, axes];
};




var math = Object.freeze({
	get norm () { return norm; },
	get planeErrors () { return planeErrors; },
	get normalErrors () { return normalErrors; },
	get combinedErrors () { return combinedErrors$1; },
	get transpose () { return transpose; },
	get convolveAxes () { return convolveAxes; },
	get deconvolveAxes () { return deconvolveAxes; }
});

var cloneOptions;

cloneOptions = function(obj, newProps) {
  var a, k;
  a = {};
  for (k in obj) {
    a[k] = newProps[k] || obj[k];
  }
  return a;
};

var __createErrorEllipse;
var combinedErrors;
var createErrorEllipse;
var createErrorSurface;
var createFeature;
var createGroupedPlane;
var createNominalPlane;
var d3;
var flipAxesIfNeeded;

d3 = require('d3');

require('d3-selection-multi');

combinedErrors = combinedErrors$1;

createFeature = function(type, coordinates) {
  return {
    type: 'Feature',
    geometry: {
      type: type,
      coordinates: coordinates
    }
  };
};

createErrorSurface = function(d) {
  var a, e, f;
  // Function that turns orientation
  // objects into error surface
  e = [d.lower, d.upper.reverse()];
  f = createFeature("Polygon", e);
  a = d3.geoArea(f);
  if (a > 2 * Math.PI) {
    f = createFeature("Polygon", e.map(function(d) {
      return d.reverse();
    }));
  }
  if (f.properties == null) {
    f.properties = {};
  }
  f.properties.area = a;
  return f;
};

createNominalPlane = function(d) {
  return createFeature('LineString', d.nominal);
};

flipAxesIfNeeded = function(axes) {
  if (axes[2][2] < 0) {
    axes[2] = axes[2].map(function(e) {
      return -e;
    });
  }
  return axes;
};

createGroupedPlane = function(opts) {
  if (opts.nominal == null) {
    opts.nominal = true;
  }
  return function(p) {
    var axes, covariance, e, el, hyperbolic_axes;
    ({hyperbolic_axes, axes, covariance} = p);
    if (hyperbolic_axes == null) {
      // To preserve compatibility
      hyperbolic_axes = covariance;
    }
    // Make sure axes are not inverted
    axes = flipAxesIfNeeded(axes);
    e = combinedErrors(hyperbolic_axes, axes, opts);
    el = d3.select(this);
    el.append("path").datum(createErrorSurface(e)).attr('class', 'error');
    if (!opts.nominal) {
      return;
    }
    // Create nominal plane
    return el.append("path").datum(createNominalPlane(e)).attr('class', 'nominal');
  };
};

__createErrorEllipse = function(opts) {
  var createEllipse;
  //Function generator to create error ellipse
  //for a single error level
  return createEllipse = function(p) {
    var axes, coords, covariance, f, f_, hyperbolic_axes, v;
    ({hyperbolic_axes, axes, covariance} = p);
    if (hyperbolic_axes == null) {
      // To preserve compatibility
      hyperbolic_axes = covariance;
    }
    f_ = function(sheet) {
      var a, e, f;
      opts.sheet = sheet;
      e = normalErrors(hyperbolic_axes, axes, opts);
      f = createFeature("Polygon", [e]);
      // Check winding (note: only an issue with non-traditional
      // stereonet axes)
      a = d3.geoArea(f);
      if (a > 2 * Math.PI) {
        f = createFeature("Polygon", [e.reverse()]);
        a = d3.geoArea(f);
      }
      f.properties = {
        area: a,
        level: opts.level,
        sheet: sheet
      };
      return f;
    };
    v = ['upper', 'lower'].map(f_);
    coords = v.map(function(d) {
      return d.geometry.coordinates;
    });
    f = createFeature("MultiPolygon", coords);
    f.properties = v[0].properties;
    return f;
  };
};

createErrorEllipse = function(opts) {
  var __fnAtLevel, levels;
  // Level can be single or array of error levels
  if (opts.level == null) {
    opts.level = 1;
  }
  levels = opts.level;
  __fnAtLevel = function(l) {
    var o1;
    o1 = cloneOptions(opts, {
      level: l
    });
    return __createErrorEllipse(o1);
  };
  if (Array.isArray(levels)) {
    // Return an array of functions, one for each
    // level of the ellipse to be generated
    return levels.map(__fnAtLevel);
  } else {
    // Return a single function for the specified
    // level
    return __fnAtLevel(levels);
  }
};




var functions = Object.freeze({
	get plane () { return createGroupedPlane; },
	get errorSurface () { return createErrorSurface; },
	get nominalPlane () { return createNominalPlane; },
	get errorEllipse () { return createErrorEllipse; }
});

var d;

d = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [[180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]
  }
};

var horizontal = function(stereonet) {
  var labelDistance;
  labelDistance = 4;
  return function() {
    var da, g, l, margin, sz, v;
    da = stereonet.overlay();
    g = da.append('g').attr('class', 'horizontal');
    g.append('path').datum(d);
    sz = stereonet.size();
    margin = stereonet.margin();
    l = g.append('g').attrs({
      class: 'labels',
      transform: `translate(${margin} ${sz / 2})`
    });
    l.append('text').text('E').attrs({
      class: 'axis-label',
      transform: `translate(${sz - 2 * margin} 0)`,
      'text-anchor': 'start',
      dx: labelDistance
    });
    l.append('text').text('W').attrs({
      class: 'axis-label',
      'text-anchor': 'end',
      dx: -labelDistance
    });
    // Vertical labels (may split out later)
    v = da.append('g').attrs({
      class: 'vertical',
      transform: `translate(${sz / 2} ${margin})`
    });
    v.append('line').attrs({
      y2: labelDistance
    });
    v.append('line').attrs({
      transform: `translate(0 ${sz - 2 * margin})`,
      y2: -labelDistance
    });
    return v.append('text').text('Vertical').attrs({
      class: 'axis-label',
      'alignment-baseline': 'baseline',
      'text-anchor': 'middle',
      dy: -labelDistance - 4
    });
  };
};

var d2r;

d2r = Math.PI / 180;

var vertical = function(stereonet) {
  return function(opts = {}) {
    var a, at, az, dip, dy, feat, g, grat, innerRadius, labels, locs, lon, m, proj, sel, v, x;
    if (opts.startOffset == null) {
      opts.startOffset = 10;
    }
    // correct for start at bottom
    opts.startOffset += 100;
    if (opts.labelPadding == null) {
      opts.labelPadding = 8;
    }
    g = stereonet.overlay();
    grat = stereonet.graticule();
    console.log(grat);
    labels = ["N", "E", "S", "W"];
    locs = [0, 90, 180, 270];
    az = g.append('g').attr('class', 'azimuthLabels');
    m = stereonet.margin();
    innerRadius = stereonet.size() / 2 - m;
    sel = az.selectAll('text').data(labels);
    sel.enter().append('text').text(function(d) {
      return d;
    }).attrs(function(d, i) {
      var angle, szm;
      szm = innerRadius + m;
      angle = (locs[i] - 90) * Math.PI / 180;
      return {
        transform: `translate(${szm} ${szm})`,
        x: Math.cos(angle) * (innerRadius + opts.labelPadding),
        y: Math.sin(angle) * (innerRadius + opts.labelPadding)
      };
    });
    dip = g.append('g').attr('class', 'dipLabels');
    lon = 220;
    feat = function(d) {
      return {
        type: 'Feature',
        label: `${d}°`,
        geometry: {
          type: 'Point',
          coordinates: [lon, -90 + d]
        }
      };
    };
    dy = 8;
    a = stereonet.clipAngle();
    v = (function() {
      var j, ref, results;
      results = [];
      for (x = j = 5, ref = a; j <= ref; x = j += 5) {
        results.push(x);
      }
      return results;
    })();
    proj = stereonet.projection();
    sel = dip.selectAll('text').data(v.map(feat));
    sel.enter().append('text').text(function(d) {
      return d.label;
    }).attr("transform", function(d) {
      v = proj(d.geometry.coordinates);
      return `translate(${v[0]}, ${v[1]}) rotate(${180 - lon})`;
    });
    at = {
      class: 'outer',
      dy: -dy
    };
    // Labels
    az.append('text').attrs(at).append('textPath').text('Azimuth →').attrs({
      'xlink:href': '#sphere',
      startOffset: `${innerRadius * opts.startOffset * d2r}`,
      method: 'stretch'
    });
    return dip.append('text').attrs(at).append('textPath').text('Dip').attrs({
      method: 'stretch',
      'xlink:href': '#sphere',
      startOffset: `${innerRadius * 70 * d2r}`
    });
  };
};

var d3$3;

d3$3 = require('d3');

//# Stereonet Dragging
var interaction = function(stereonet) {
  var el, m0, mousedown, mousemove, mouseup, o0, proj;
  // modified from http://bl.ocks.org/1392560
  m0 = void 0;
  o0 = void 0;
  proj = stereonet.projection();
  el = stereonet.node();
  mousedown = function() {
    m0 = [d3$3.event.pageX, d3$3.event.pageY];
    o0 = stereonet.rotate();
    return d3$3.event.preventDefault();
  };
  mousemove = function() {
    var m1, o1;
    if (m0) {
      m1 = [d3$3.event.pageX, d3$3.event.pageY];
      o1 = [o0[0] + (m1[0] - m0[0]) / 3, o0[1] + (m0[1] - m1[1]) / 3];
      o1[1] = o1[1] > 60 ? 60 : o1[1] < -60 ? -60 : o1[1];
      return stereonet.rotate(o1);
    }
  };
  mouseup = function() {
    if (m0) {
      mousemove();
      return m0 = null;
    }
  };
  el.on('mousedown', mousedown);
  return d3$3.select(window).on("mousemove", mousemove).on("mouseup", mouseup);
};

/*
Stereonet labeling:
Based heavily on http://bl.ocks.org/dwtkns/4686432

TODO: integrate text halos
http://bl.ocks.org/nitaku/aff4f425e7959290a1f7
*/
var __horizontalLine;
var geoDistance;
var geoPath;
var horizontalLine;
var labels;

({geoPath, geoDistance} = require('d3'));

labels = [
  {
    name: 'N',
    c: [180,
  0]
  },
  {
    name: 'E',
    c: [90,
  0]
  },
  {
    name: 'S',
    c: [0,
  0]
  },
  {
    name: 'W',
    c: [-90,
  0]
  },
  {
    name: 'Up',
    c: [0,
  90]
  },
  {
    name: 'Down',
    c: [0,
  -90]
  }
];

__horizontalLine = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [[180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]
  }
};

horizontalLine = function(stereonet) {
  stereonet.overlay().append('g.horizontal').append('path').datum(__horizontalLine);
  return stereonet.refresh();
};

exports.globalLabels = function() {
  var i, l, len;
  for (i = 0, len = labels.length; i < len; i++) {
    l = labels[i];
    l.type = 'Feature';
    l.geometry = {
      type: 'Point',
      coordinates: l.c
    };
  }
  return function(stereonet) {
    var path, proj, svg, sz, updateLabels;
    sz = stereonet.size();
    proj = stereonet.projection();
    svg = stereonet.overlay();
    path = geoPath().projection(proj).pointRadius(1);
    updateLabels = function() {
      var centerPos, width;
      console.log("Updating labels");
      proj = this.projection();
      centerPos = proj.invert([sz / 2, sz / 2]);
      width = stereonet.size();
      return svg.selectAll(".label").attr('alignment-baseline', 'middle').style('text-shadow', "-2px -2px white, -2px 2px white, 2px 2px white, 2px -2px white, -2px 0 white, 0 2px white, 2px 0 white, 0 -2px white").attr("text-anchor", function(d) {
        var x;
        x = proj(d.geometry.coordinates)[0];
        if (x < width / 2 - 20) {
          return 'end';
        }
        if (x < width / 2 + 20) {
          return 'middle';
        }
        return 'start';
      }).attr("transform", function(d) {
        var offset, offsetY, x, y;
        [x, y] = proj(d.geometry.coordinates);
        offset = x < width / 2 ? -5 : 5;
        offsetY = 0;
        if (y < width / 2 - 20) {
          offsetY = -5;
        }
        if (y > width / 2 + 20) {
          offsetY = 5;
        }
        return `translate(${x + offset},${y - 2 + offsetY})`;
      }).style("display", function(d) {
        d = geoDistance(centerPos, d.geometry.coordinates);
        if (d > Math.PI / 2 + 0.01) {
          return 'none';
        } else {
          return 'inline';
        }
      });
    };
    stereonet.call(horizontalLine);
    svg.append("g.points").selectAll("path").data(labels).enter().append("path.point");
    svg.append("g.labels").selectAll("text").data(labels).enter().append("text.label").text(function(d) {
      return d.name;
    });
    updateLabels.apply(stereonet);
    return stereonet.on('rotate', updateLabels);
  };
};

var chroma;
var d3$2;
var getterSetter;
var opts;

d3$2 = require('d3');

chroma = require('chroma-js');

require('d3-selection-multi');

opts = {
  degrees: true,
  traditionalLayout: false,
  adaptive: false,
  n: 200, // Bug if we go over 60?
  level: 1 // 95% ci for 3 degrees of freedom
};

getterSetter = function(main) {
  return function(p, fn) {
    // A generic wrapper
    // to get/set variables
    if (fn == null) {
      fn = function(v) {
        return p = v;
      };
    }
    return function() {
      if (arguments.length > 0) {
        fn(...arguments);
        return main;
      } else {
        return p();
      }
    };
  };
};

exports.Stereonet = function() {
  var _, __getSet, __redraw, __setScale, callStack, clipAngle, data, dataArea, dispatch, drawEllipses, drawPlanes, el, ell, ellipses, f, graticule, margin, overlay, path, planes, proj, s, scale, setGraticule, shouldClip;
  planes = null;
  ellipses = null;
  data = null;
  el = null;
  dataArea = null;
  overlay = null;
  margin = 20;
  scale = 300;
  clipAngle = 90;
  s = 0.00001;
  shouldClip = true;
  graticule = d3$2.geoGraticule().stepMinor([10, 10]).stepMajor([90, 10]).extentMinor([[-180, -80 - s], [180, 80 + s]]).extentMajor([[-180, -90 + s], [180, 90 - s]]);
  proj = d3$2.geoOrthographic().clipAngle(clipAngle).precision(0.01).rotate([0, 0]).scale(300);
  path = d3$2.geoPath().projection(proj).pointRadius(2);
  // Items to be added once DOM is available
  // (e.g. interaction)
  callStack = [];
  drawPlanes = function(data, o = {}) {
    var con, fn, sel;
    if (o.color == null) {
      o.color = '#aaaaaa';
    }
    if (el == null) {
      throw "Stereonet must be initialized to an element before adding data";
    }
    fn = createGroupedPlane(opts);
    con = dataArea.append('g').attr('class', 'planes');
    sel = con.selectAll('g.plane').data(data).enter().append('g').classed('plane', true).each(fn).each(function(d) {
      var color, e;
      if (typeof o.color === 'function') {
        color = o.color(d);
      } else {
        color = o.color;
      }
      e = d3$2.select(this);
      e.selectAll('path.error').attrs({
        fill: color
      });
      return e.selectAll('path.nominal').attrs({
        stroke: chroma(color).darken(.2).css()
      });
    });
    __redraw();
    return sel;
  };
  drawEllipses = function(data, o = {}) {
    var con, createEllipse, fn, sel;
    if (o.color == null) {
      o.color = '#aaaaaa';
    }
    if (el == null) {
      throw "Stereonet must be initialized to an element before adding data";
    }
    fn = createErrorEllipse(opts);
    createEllipse = function(d) {
      return d3$2.select(this).append('path').attr('class', 'error').datum(fn(d));
    };
    con = dataArea.append('g').attr('class', 'normal-vectors');
    sel = con.selectAll('g.normal').data(data).enter().append('g').classed('normal', true).each(createEllipse);
    sel.each(function(d) {
      var color, e;
      if (typeof o.color === 'function') {
        color = o.color(d);
      } else {
        color = o.color;
      }
      return e = d3$2.select(this).selectAll('path.error').attrs({
        fill: color
      });
    });
    __redraw();
    return sel;
  };
  __setScale = function(n) {
    var _pscale, radius;
    if (n != null) {
      // Scale the stereonet to an appropriate size
      scale = n;
    }
    radius = scale / 2 - margin;
    if (clipAngle < 89) {
      _pscale = radius / Math.sin(Math.PI / 180 * clipAngle);
      if (shouldClip) {
        proj.clipAngle(clipAngle);
      }
      proj.scale(_pscale).translate([scale / 2, scale / 2]);
    } else {
      proj.scale(radius).translate([scale / 2, scale / 2]);
    }
    path = d3$2.geoPath().projection(proj);
    if (el != null) {
      return el.attrs({
        height: scale,
        width: scale
      });
    }
  };
  __redraw = () => {
    if (el == null) {
      return;
    }
    return el.selectAll('path').attr('d', path.pointRadius(2));
  };
  dispatch = d3$2.dispatch('rotate', 'redraw');
  f = function(_el, opts = {}) {
    var int, item, j, len;
    // This should be integrated into a reusable
    // component
    el = _el;
    __setScale(); // Scale the stereonet
    el.append("defs").append("path").datum({
      type: "Sphere"
    }).attrs({
      d: path,
      id: "sphere"
    });
    el.append("clipPath").attr("id", "neatline-clip").append("use").attr("xlink:href", "#sphere");
    el.append("use").attrs({
      class: 'background',
      fill: 'white',
      stroke: '#aaaaaa'
    });
    int = el.append('g').attrs({
      class: 'interior'
    });
    int.append('path').datum(graticule).attrs({
      class: 'graticule',
      d: path
    });
    dataArea = int.append('g').attrs({
      class: 'data'
    });
    if (shouldClip) {
      el.append("use").attrs({
        class: 'neatline',
        "xlink:href": "#sphere"
      });
      int.attr('clip-path', "url(#neatline-clip)");
    }
    overlay = el.append("g").attrs({
      class: "overlay"
    });
    // Add dragging for debug purposes
    //drag = d3.drag()
    //.on 'drag', =>
    //proj.rotate [d3.event.x, -d3.event.y]
    //dispatch.call 'rotate', f
    //__redraw()
    //el.call drag
    for (j = 0, len = callStack.length; j < len; j++) {
      item = callStack[j];
      item();
    }
    // Finally, draw all the paths at once
    return __redraw();
  };
  __getSet = getterSetter(f);
  // Getter-setter for data
  f.data = __getSet(function() {
    return data;
  }, (o) => {
    return data = o;
  });
  f.node = function() {
    return el;
  };
  f.margin = __getSet(function() {
    return margin;
  }, (o) => {
    return margin = o;
  });
  f.size = __getSet(function() {
    return scale;
  }, __setScale);
  f.innerSize = function() {
    return scale - margin;
  };
  f.projection = function() {
    return proj;
  };
  f.clip = __getSet(function() {
    return shouldClip;
  }, function(c) {
    return shouldClip = c;
  });
  f.refresh = function() {
    return __redraw();
  };
  f.rotate = (coords) => {
    if (coords == null) {
      return proj.rotate();
    }
    proj.rotate(coords);
    dispatch.call('rotate', f);
    return __redraw();
  };
  f.centerPosition = function() {
    var centerPos;
    return centerPos = proj.invert([scale / 2, scale / 2]);
  };
  f.d3 = d3$2;
  f.on = function(event, callback) {
    return dispatch.on(event, callback);
  };
  setGraticule = function(lon, lat) {
    //# Could also make this take a d3.geoGraticule object ##
    s = 0.00001;
    return graticule = d3$2.geoGraticule().stepMinor([lon, lat]).stepMajor([90, lat]).extentMinor([[-180, -90 + lat - s], [180, 90 - lat + s]]).extentMajor([[-180, -90 + s], [180, 90 - s]]);
  };
  f.graticule = __getSet(function() {
    return graticule;
  }, setGraticule);
  _ = function(c) {
    if (c === 'vertical') {
      c = [0, 90];
    }
    proj.rotate(c);
    if (el != null) {
      return __redraw();
    }
  };
  f.center = __getSet(function() {
    return proj.rotate;
  }, _);
  _ = function(c) {
    clipAngle = c;
    proj.rotate([0, -90]);
    __setScale();
    return f;
  };
  f.clipAngle = __getSet(function() {
    return clipAngle;
  }, _);
  f.planes = drawPlanes;
  f.draw = __redraw;
  f.path = function() {
    return path;
  };
  f.call = function(fn, ...args) {
    var todo;
    todo = function() {
      return fn(f, ...args);
    };
    if (f.node() != null) {
      todo();
    } else {
      callStack.push(todo);
    }
    return f;
  };
  ell = function() {
    var attrs, data_, fn, o, sel;
    // Same call signature as d3.Selection.data
    attrs = null;
    data_ = null;
    sel = null;
    fn = null;
    o = function(el_) {
      ell = createErrorEllipse(opts);
      sel = function() {
        return el_.selectAll('path.ellipse').data(data_.map(ell), fn);
      };
      sel().enter().append('path').attr('class', "ellipse").attrs(attrs).exit().remove();
      if (el != null) {
        __redraw();
      }
      return sel;
    };
    __getSet = getterSetter(o);
    o.data = __getSet(data_, function(d, f) {
      data_ = d;
      return fn = f;
    });
    o.attrs = __getSet(attrs, function(o) {
      attrs = o;
      if (sel != null) {
        return sel().attrs(attrs);
      }
    });
    o.selection = sel;
    return o;
  };
  f.ellipses = drawEllipses;
  f.dataArea = function() {
    return dataArea;
  };
  f.overlay = function() {
    return overlay;
  };
  f.horizontal = horizontal(f);
  f.vertical = vertical(f);
  f.call(interaction);
  return f;
};

exports.opacityByCertainty = function(colorFunc, accessor = null) {
  var __getSet, alphaScale, angularError, darkenStroke, f, maxOpacity;
  angularError = function(d) {
    return d.max_angular_error;
  };
  darkenStroke = 0.2;
  maxOpacity = 5;
  alphaScale = d3$2.scalePow(4).range([0.8, 0.1]).domain([0, maxOpacity]);
  alphaScale.clamp(true);
  f = function(d, i) {
    var al, angError, color, e, fill, stroke;
    angError = angularError(d);
    al = alphaScale(angError);
    color = chroma(colorFunc(d));
    fill = color.alpha(al).css();
    stroke = color.alpha(al + darkenStroke).css();
    e = d3$2.select(this);
    if (accessor != null) {
      e = e.selectAll('path.error');
    }
    return e.attrs({fill, stroke});
  };
  __getSet = getterSetter(f);
  f.angularError = __getSet(angularError, function(v) {
    return angularError = v;
  });
  f.max = __getSet(maxOpacity, function(v) {
    return maxOpacity = v;
  });
  return f;
};

// Unique ID creation requires a high quality random # generator.  In node.js
// this is pretty straight-forward - we use the crypto API.

var rb = crypto.randomBytes;

function rng() {
  return rb(16);
}

var rng_1 = rng;

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

var bytesToUuid_1 = bytesToUuid;

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng_1();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid_1(b);
}

var v1_1 = v1;

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng_1)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid_1(rnds);
}

var v4_1 = v4;

var uuid = v4_1;
uuid.v1 = v1_1;
uuid.v4 = v4_1;

var uuid_1 = uuid;

var M;
var Q;
var T;
var __planeAngle;
var apparentDipCorrection;
var d3$4;
var dot;
var getRatios;
var matrix;
var scaleRatio;
var transpose$1;
var vecAngle;
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

M = require('mathjs');

Q = require('quaternion');

d3$4 = require('d3');

require('d3-jetpack');

exports.fixAngle = function(a) {
  // Put an angle on the interval [-Pi,Pi]
  while (a > Math.PI) {
    a -= 2 * Math.PI;
  }
  while (a < -Math.PI) {
    a += 2 * Math.PI;
  }
  return a;
};

//# Matrix to map down to 2 dimensions
T = M.matrix([[1, 0], [0, 0], [0, 1]]);

matrix = function(obj) {
  if (obj instanceof Q) {
    //# We're dealing with a quaternion,
    // need to convert to rotation matrix
    obj = obj.toMatrix(true);
  }
  return M.matrix(obj);
};

dot = function(...args) {
  // Multiply matrices, ensuring matrix form
  return M.multiply(...args.map(matrix));
};

transpose$1 = function(m) {
  return M.transpose(matrix(m));
};

vecAngle = function(a0, a1) {
  var a0_, a1_;
  a0_ = M.divide(a0, M.norm(a0));
  a1_ = M.divide(a1, M.norm(a1));
  return dot(a0_, a1_);
};

exports.fixAngle = function(a) {
  // Put an angle on the interval [-Pi,Pi]
  while (a > Math.PI) {
    a -= 2 * Math.PI;
  }
  while (a < -Math.PI) {
    a += 2 * Math.PI;
  }
  return a;
};

apparentDipCorrection = function(screenRatio = 1) {
  return function(axes2d) {
    var a0, a1, angle, cosA;
    // Correct for apparent dip
    a0 = axes2d[1];
    a1 = [0, 1];
    //a0 = M.divide(a0,M.norm(a0))
    //a1 = M.divide(a1,M.norm(a1))
    cosA = dot(a0, a1);
    console.log("Axes", a0, cosA);
    angle = Math.atan2(Math.tan(Math.acos(cosA / (M.norm(a0) * M.norm(a1)))), screenRatio);
    return angle * 180 / Math.PI;
  };
};

scaleRatio = function(scale) {
  return scale(1) - scale(0);
};

getRatios = function(x, y) {
  var lineGenerator, ratioX, ratioY, screenRatio;
  // Ratios for x and y axes
  ratioX = scaleRatio(x);
  ratioY = scaleRatio(y);
  screenRatio = ratioX / ratioY;
  lineGenerator = d3$4.line().x(function(d) {
    return d[0] * ratioX;
  }).y(function(d) {
    return d[1] * ratioY;
  });
  return {ratioX, ratioY, screenRatio, lineGenerator};
};

__planeAngle = function(axes, angle) {
  var a0;
  // Get angle of the plane from the major axes
  a0 = axes.toArray()[0];
  return angle - M.acos(vecAngle([a0[0], a0[1], 0], [1, 0, 0]));
};

exports.hyperbolicErrors = function(viewpoint, axes, xScale, yScale) {
  var angle, centerPoint, dfunc, gradient, lineGenerator, n, nCoords, nominal, ratioX, ratioY, screenRatio, width;
  n = 10;
  angle = viewpoint;
  gradient = null;
  width = 400;
  nominal = false;
  centerPoint = false;
  // For 3 coordinates on each half of the hyperbola, we collapse down to
  // a special case where no trigonometry outside of tangents have to be calculated
  // at each step. This is much more efficient, at the cost of the fine structure
  // of the hyperbola near the origin
  nCoords = 3;
  ({ratioX, ratioY, screenRatio, lineGenerator} = getRatios(xScale, yScale));
  dfunc = function(d) {
    /* Project axes to 2d */
    var R, a, a1, angles, angularError, arr, ax, b, center, coords, cutAngle, cutAngle2, hyp, inPlaneLength, j, largeNumber, lengthShown, lim, limit, mask, masksz, mid, oa, offs, poly, q, rax, results, s, top, v;
    // Get a single level of planar errors (or the
    // plane's nominal value) as a girdle
    rax = d.axes;
    if (rax[2][2] < 0) {
      rax = rax.map(function(row) {
        return row.map(function(i) {
          return -i;
        });
      });
    }
    q = Q.fromAxisAngle([0, 0, 1], angle + Math.PI);
    R = matrix(axes);
    ax = dot(M.transpose(R), d.axes, R);
    a1 = __planeAngle(ax, angle);
    //# Matrix to map down to 2 dimensions
    T = M.matrix([[1, 0], [0, 0], [0, 1]]);
    s = M.sqrt(d.lengths).map(function(d) {
      return 1 / d;
    });
    v = [s[0] * Math.cos(a1), s[1] * Math.sin(a1), s[2]];
    a = 1 / M.norm([v[0], v[1]]);
    b = 1 / M.abs(v[2]);
    //a = M.norm([e[0],e[1]])
    //b = e[2]

    // Major axes of the conic sliced in the requested viewing
    // geometry
    // Semiaxes of hyperbola
    cutAngle = Math.atan2(b, a);
    angularError = cutAngle * 2 * 180 / Math.PI;
    //console.log "Error: ", angularError
    // find length at which tangent is x long
    lengthShown = width / 2;
    cutAngle2 = Math.atan2(b, a * screenRatio);
    inPlaneLength = lengthShown * Math.cos(cutAngle2);
    //# We will transform with svg functions
    //# so we can neglect some of the math
    // for hyperbolae not aligned with the
    // coordinate plane.
    if (nCoords > 3) {
      angles = (function() {
        results = [];
        for (var j = 0; 0 <= n ? j < n : j > n; 0 <= n ? j++ : j--){ results.push(j); }
        return results;
      }).apply(this).map(function(d) {
        return cutAngle + (d / n * (Math.PI - cutAngle)) + Math.PI / 2;
      });
      arr = transpose$1([
        M.multiply(M.tan(angles),
        a),
        M.cos(angles).map(function(v) {
          return b / v;
        })
      ]);
    } else {
      arr = [[0, b]];
    }
    largeNumber = width / ratioX;
    limit = b / a * largeNumber;
    coords = [[-largeNumber, limit], ...arr, [largeNumber, limit]];
    // Correction for angle and means go here
    // unless managed by SVG transforms
    top = coords.map(function([x, y]) {
      return [x, -y];
    });
    top.reverse();
    poly = coords.concat(top);
    // Translate
    offs = dot(d.offset, R, q).toArray();
    center = [xScale(offs[0]) - xScale(0), yScale(offs[2]) - yScale(0)];
    // Used for positioning, but later
    d.__z = offs[1];
    oa = exports.opacityByCertainty(function() {
      return d.color;
    }).angularError(function() {
      return angularError;
    }).max(5);
    // Correct for apparent dip
    //apparent = apparentDipCorrection(screenRatio)

    // grouped transform
    v = d.apparentDip(-angle + Math.PI / 2);
    v = -Math.atan2(Math.tan(v), screenRatio) * 180 / Math.PI;
    //if aT[1][0]*aT[1][1] < 0
    //__angle *= -1
    //console.log 'Angle', __angle
    //__angle = 0
    //# Start DOM manipulation ###
    hyp = d3$4.select(this).attr('transform', `translate(${-center[0] + xScale(0)},${yScale(0) + center[1]}) rotate(${v})`);
    hyp.classed('in_group', d.in_group);
    lim = width / 2;
    lim = Math.abs(inPlaneLength);
    masksz = {
      x: -lim,
      y: -lim,
      width: lim * 2,
      height: lim * 2
    };
    mask = hyp.select('mask');
    mid = null;
    if (!mask.node()) {
      mid = uuid_1.v4();
      mask = hyp.append('mask').attr('id', mid).attrs(masksz).append('rect').attrs(_extends({}, masksz, {
        fill: "url(#gradient)"
      }));
    }
    if (mid == null) {
      mid = mask.attr('id');
    }
    if (centerPoint) {
      hyp.selectAppend('circle').attrs({
        r: 2,
        fill: 'black'
      });
    }
    return hyp.selectAppend('path.hyperbola').datum(poly).attr('d', function(v) {
      return lineGenerator(v) + "Z";
    }).each(oa).attr('mask', `url(#${mid})`);
  };
  //if nominal
  //hyp.selectAppend 'line.nominal'
  //.attrs x1: -largeNumber, x2: largeNumber
  //.attr 'stroke', '#000000'
  dfunc.setupGradient = function(el) {
    var defs, g, stop;
    defs = el.append('defs');
    g = defs.append('linearGradient').attr('id', 'gradient');
    stop = function(ofs, op) {
      var a;
      a = Math.round(op * 255);
      return g.append('stop').attrs({
        offset: ofs,
        'stop-color': `rgb(${a},${a},${a})`,
        'stop-opacity': op
      });
    };
    stop(0, 0);
    stop(0.2, 0.1);
    stop(0.45, 1);
    stop(0.55, 1);
    stop(0.8, 0.1);
    return stop(1, 0);
  };
  dfunc.width = function(o) {
    if (o == null) {
      return width;
    }
    width = o;
    return dfunc;
  };
  dfunc.nominal = function(o) {
    if (o == null) {
      return nominal;
    }
    nominal = o;
    return dfunc;
  };
  return dfunc;
};

exports.digitizedLine = function(viewpoint, lineGenerator) {
  var axes, f;
  axes = M.eye(3);
  f = function(d) {
    /* Map down to two dimensions (the x-z plane of the viewing geometry) */
    /* Create a line from input points */
    /* Put in axis-aligned coordinates */
    var R, a, alignedWithGroup, data, offs, q, v;
    q = Q.fromAxisAngle([0, 0, 1], viewpoint);
    R = M.transpose(matrix(axes));
    alignedWithGroup = dot(d.centered, R);
    offs = dot(d.offset, R);
    v = alignedWithGroup.toArray().map(function(row) {
      return M.add(row, offs);
    });
    a = dot(v, q);
    data = dot(a, T).toArray();
    return d3$4.select(this).attr('d', lineGenerator(data));
  };
  f.axes = function(o) {
    if (o == null) {
      return axes;
    }
    axes = o;
    return f;
  };
  return f;
};

exports.apparentDip = function(viewpoint, xScale, yScale) {
  var axes, f, lineGenerator, ratioX, ratioY, screenRatio;
  axes = M.eye(3);
  ({ratioX, ratioY, screenRatio, lineGenerator} = getRatios(xScale, yScale));
  //if not axes?
  f = function(d) {
    /* Map down to two dimensions (the x-z plane of the viewing geometry) */
    /* Create a line from input points */
    /* Put in axis-aligned coordinates */
    var A, R, a, data, n, n1, normal, offs, planeAxes, q, qA, qR, v;
    //d3.select @
    //.attr 'd',lineGenerator(lineData)
    //.attr 'transform', "translate(#{xScale(offs[0])},#{yScale(offs[2])})rotate(#{v})"
    planeAxes = d.axes;
    if (d.group != null) {
      planeAxes = d.group.axes;
    }
    q = Q.fromAxisAngle([0, 0, 1], viewpoint);
    R = M.transpose(matrix(axes));
    A = planeAxes;
    // Find fit normal in new coordinates
    normal = dot(A[2], R, q);
    // Get transform that puts normal in xz plane
    n = normal.toArray();
    n[1] = Math.abs(n[1]);
    n1 = [n[0], 0, n[2]];
    n1 = n1.map(function(d) {
      return d / M.norm(n1);
    });
    console.log(n, n1);
    qR = Q.fromBetweenVectors(n, n1);
    // Without adding this other quaternion, it is the same as just showing
    // digitized lines
    qA = q.mul(qR);
    v = dot(d.centered, R);
    a = dot(v, qA);
    data = dot(a, T).toArray();
    // Get offset of angles
    offs = dot(d.offset, R, q, T).toArray();
    return d3$4.select(this).attr('d', lineGenerator(data)).attr('transform', `translate(${xScale(offs[0])},${yScale(offs[1])})`);
  };
  f.axes = function(o) {
    if (o == null) {
      return axes;
    }
    axes = o;
    return f;
  };
  return f;
};

exports.PlaneData = class PlaneData {
  constructor(data, mean = null) {
    var axes, color, extracted, hyperbolic_axes;
    this.dip = this.dip.bind(this);
    this.apparentDip = this.apparentDip.bind(this);
    ({axes, hyperbolic_axes, extracted, color} = data);
    this.mean = mean || data.mean;
    this.axes = data.axes;
    this.color = color;
    this.lengths = hyperbolic_axes;
    this.in_group = data.in_group;
    this.array = extracted;
    this.data = data;
    //@pcaAxes = math.convolveAxes @axes, @lengths
    // If we didn't pass a mean, we have to compute one
    if (this.array == null) {
      return;
    }
    //# Extract mean of data on each axis ##
    if (this.mean == null) {
      this.mean = [0, 1, 2].map((i) => {
        return d3$4.mean(this.array, function(d) {
          return d[i];
        });
      });
    }
    this.centered = this.array.map((d) => {
      return M.subtract(d, this.mean);
    });
  }

  dip() {
    var dip, dipDr, n, r;
    n = this.axes[2];
    r = M.norm(n);
    dip = M.acos(n[2] / r);
    dipDr = exports.fixAngle(Math.atan2(n[0], n[1]));
    return [dip, dipDr];
  }

  apparentDip(azimuth) {
    var a, d, dip, dipDr, n, r, sign;
    n = this.axes[2];
    r = M.norm(n);
    [dip, dipDr] = this.dip();
    dipDr = Math.atan2(n[0], n[1]);
    a = exports.fixAngle(azimuth - dipDr);
    sign = -Math.PI / 2 < a || Math.PI / 2 > a ? 1 : -1;
    d = M.tan(dip) * M.cos(azimuth - dipDr);
    return sign * Math.atan(d);
  }

};

// Entrypoint for importing components
// from node.js

exports.functions = functions;
exports.math = math;
