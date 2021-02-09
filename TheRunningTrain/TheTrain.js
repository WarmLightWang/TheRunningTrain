/*jshint esversion: 6 */

/**
 * This program creates a track that goes through these points (an interpolating curve) 
 * and makes a train that goes around that track. Shift + Click will add control point on the track,
 * and Ctrl + Click on a point will remove that control poin on the track.
 */

import { draggablePoints } from "../libs/dragPoints.js";
import { RunCanvas } from "../libs/runCanvas.js";

/**
 * Have the array of control points for the track be a
 * "global" (to the module) variable
 *
 * Note: the control points are stored as Arrays of 2 numbers, rather than
 * as "objects" with an x,y. Because we require a Cardinal Spline (interpolating)
 * the track is defined by a list of points.
 *
 * things are set up with an initial track
 */
/** @type Array<number[]> */
let thePoints = [
  [150, 330],
  [150, 450],
  [450, 450],
  [450, 150]
];

/**
 * Draw function - this is the meat of the operation
 *
 * It's the main thing that needs to be changed
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} param
 */
function draw(canvas, param) {
  let context = canvas.getContext("2d");
  // clear the screen
  context.clearRect(0, 0, canvas.width, canvas.height);

  // draw the control points
  function drawTrain() {
    thePoints.forEach(function (pt) {
      context.beginPath();
      context.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
      context.closePath();
      context.fill();
    });
  }

  // draw the track and train
  let check1 = /** @type{HTMLInputElement} */ (document.getElementById("simple-track")).checked;
  let check2 = /** @type{HTMLInputElement} */ (document.getElementById("arc-length")).checked;
  let smoke = /** @type{HTMLInputElement} */ (document.getElementById("smoke")).checked;
  let n = thePoints.length;
  function inc(i = 0) { return (i + 1) % n; }
  function decr(i = 0) { return (i - 1 + n) % n; }
  function deriv(i = 0, j = 0) { return 0.5 * (thePoints[inc(i)][j] - thePoints[decr(i)][j]); }

  let temp2 = [];
  for (let i = 0; i < n; i++) temp2[i] = [deriv(i, 0), deriv(i, 1)];

  function helper4(i = 0, j = 0, sign = 1) { return thePoints[i][j] + sign * 1.0 / 3.0 * temp2[i][j]; }

  let dot = [];
  for (let i = 0; i < n; i++) dot[i] = [helper4(i, 0, 1), helper4(i, 1, 1), helper4(inc(i), 0, -1), helper4(inc(i), 1, -1)];

  function position(u = 0, i = 0, j = 0) {
    return thePoints[i][j] + temp2[i][j] * u + (-3 * thePoints[i][j] - 2 * temp2[i][j] +
      3 * thePoints[inc(i)][j] - temp2[inc(i)][j]) * u * u + (2 * thePoints[i][j] + temp2[i][j] - 2 * thePoints[inc(i)][j] +
        temp2[inc(i)][j]) * u * u * u;
  }

  function calc_speed(u = 0, i = 0, j = 0) {
    return temp2[i][j] + 2 * (-3 * thePoints[i][j] - 2 * temp2[i][j] + 3 * thePoints[inc(i)][j] -
      temp2[inc(i)][j]) * u + 3 * (2 * thePoints[i][j] + temp2[i][j] - 2 * thePoints[inc(i)][j] + temp2[inc(i)][j]) * u * u;
  }

  function calc_distance(p1 = [0, 0], p2 = [0, 0]) { return Math.sqrt((p2[0] - p1[0]) * (p2[0] - p1[0]) + (p2[1] - p1[1]) * (p2[1] - p1[1])); }

  let stops = [];
  let d = [];
  let speeds = [];
  let dist = 0;
  let peri = 0;
  let seg = 0;
  let z = 0.001;
  let m = n / z;

  function helper(p = [1, 0], l = 1) {
    let y = Math.sqrt(p[0] * p[0] + p[1] * p[1]);
    if (y == 0) return [0, 0];
    return [p[0] / y * l, p[1] / y * l];
  }
  for (let i = 0; i < m; i++) {
    seg = Math.floor(z * i);
    stops[i] = [position(z * i - seg, seg, 0), position(z * i - seg, seg, 1)];
    d[i] = [z * i, peri];
    if (i > 0) dist = calc_distance(stops[i], stops[i - 1]);
    peri += dist;
    speeds[i] = helper([calc_speed(z * i - seg, seg, 0), calc_speed(z * i - seg, seg, 1)], 5);
  }
  if (check1) {
    context.save();
    context.beginPath();
    context.moveTo(thePoints[0][0], thePoints[0][1]);
    for (let i = 0; i < n; i++) context.bezierCurveTo(dot[i][0], dot[i][1], dot[i][2], dot[i][3],
      thePoints[inc(i)][0], thePoints[inc(i)][1]);
    context.closePath();
    context.stroke();
    context.restore();
  }
  else {
    for (let i = 0; i < m - 1; i++) {
      context.save();
      context.beginPath();
      context.moveTo(stops[i][0] + speeds[i][1], stops[i][1] - speeds[i][0]);
      context.lineTo(stops[i + 1][0] + speeds[i + 1][1], stops[i + 1][1] - speeds[i + 1][0]);
      context.moveTo(stops[i][0] - speeds[i][1], stops[i][1] + speeds[i][0]);
      context.lineTo(stops[i + 1][0] - speeds[i + 1][1], stops[i + 1][1] + speeds[i + 1][0]);
      context.stroke();
      context.restore();
    }
  }

  function helper_arc(x = 0) {
    seg = 0;
    while (x > d[seg][1] && seg < m - 1) seg++;
    return d[seg][0];
  }
  let u = 0;
  if (!check1) {
    for (let i = 0; i <= peri - 20; i += 20) {
      u = helper_arc(i);
      seg = Math.floor(u);
      context.save();
      context.fillStyle = "brown";
      context.translate(position(u - seg, seg, 0), position(u - seg, seg, 1));
      context.rotate(0.5 * Math.PI + Math.atan2(calc_speed(u - seg, seg, 1), calc_speed(u - seg, seg, 0)));
      context.fillRect(-10, -2.5, 20, 5);
      context.restore();
    }
  }
  // the controls points
  drawTrain();

  // the train
  let h = 20;
  let w = 15;
  for (let i = 0; i < n; i++) {
    if (check2) u = helper_arc((peri * param / n - i * h * 3 + peri) % peri);
    else u = (param - i * h / 100 + n) % n;
    seg = Math.floor(u);
    context.save();
    context.fillStyle = "blue";
    context.translate(position(u - seg, seg, 0), position(u - seg, seg, 1));
    context.rotate(Math.atan2(calc_speed(u - seg, seg, 1), calc_speed(u - seg, seg, 0)));
    context.fillRect(-h, -w, 2 * h, 2 * w);
    context.strokeRect(-h, -w, 2 * h, 2 * w);

    if (smoke) {
      context.save();
      context.fillStyle = "gray";
      context.beginPath();
      context.arc(-20, 0, 20, 0, 2 * Math.PI);
      context.closePath();
      context.fill();
      context.restore();

    }

    context.beginPath();
    context.arc(1.25 * h, 0, 0.25 * h, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(-1.25 * h, 0, 0.25 * h, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
    context.stroke();

    if (i == 0) {
      context.fillStyle = "brown";
      context.beginPath();
      context.moveTo(0.5 * h, 0);
      context.lineTo(-0.25 * h, 0.5 * w);
      context.lineTo(-0.25 * h, -0.5 * w);
      context.closePath();
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  //drawScenery
  context.save();
  context.fillStyle = "gray";
  context.translate(2, 5);
  context.beginPath();
  context.moveTo(30, 0);
  context.lineTo(5, 20);
  context.lineTo(55, 20);
  context.fill();
  context.fillStyle = "brown";
  context.fillRect(5, 20, 50, 53);
  context.fillStyle = "white";
  context.fillRect(15, 30, 5, 8);
  context.fillRect(15, 50, 5, 8);
  context.fillRect(35, 30, 5, 8);
  context.fillRect(38, 60, 10, 13);
  context.restore();

  function draw(startX, startY, len, angle) {

    context.beginPath();
    context.save();
    context.fillStyle = "brown";
    context.lineWidth = 2;
    context.translate(startX, startY);
    context.rotate(angle * Math.PI / 180);
    context.moveTo(0, 0);
    context.lineTo(0, -len);
    context.stroke();
    if (len < 5) {
      context.restore();
      return;
    }
    draw(0, -len, len * 0.8, -15);
    draw(0, -len, len * 0.8, 15);

    context.restore();
  }
  context.strokeStyle = "darkgreen";
  context.fillStyle = "green";
  draw(50, 600, 30, 0);
  draw(100, 600, 25, 0);
  draw(140, 600, 20, 0);
  draw(550, 600, 30, 0);
  draw(500, 600, 25, 0);
  draw(440, 600, 20, 0);
  draw(340, 600, 15, 0);
  draw(300, 600, 15, 0);
  draw(250, 600, 15, 0);
  draw(90, 85, 20, 0);
  draw(170, 75, 18, 0);
  draw(235, 65, 16, 0);
  draw(290, 55, 14, 0);
  draw(335, 45, 12, 0);
  draw(370, 37, 10, 0);
  draw(400, 28, 8, 0);

}

/**
 * Setup stuff - make a "window.onload" that sets up the UI and starts
 * the train
 */
let oldOnLoad = window.onload;
window.onload = function () {
  let canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
    "canvas1"
  ));
  let context = canvas.getContext("2d");
  // we need the slider for the draw function, but we need the draw function
  // to create the slider - so create a variable and we'll change it later
  let slider; // = undefined;

  // note: we wrap the draw call so we can pass the right arguments
  function wrapDraw() {
    // do modular arithmetic since the end of the track should be the beginning
    draw(canvas, Number(slider.value) % thePoints.length);
  }
  // create a UI
  let runcavas = new RunCanvas(canvas, wrapDraw);
  // now we can connect the draw function correctly
  slider = runcavas.range;

  // this is a helper function that makes a checkbox and sets up handlers
  function addCheckbox(name, initial = false) {
    let checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    document.getElementsByTagName("body")[0].appendChild(checkbox);
    checkbox.id = name;
    checkbox.onchange = wrapDraw;
    checkbox.checked = initial;
    let checklabel = document.createElement("label");
    checklabel.setAttribute("for", name);
    checklabel.innerText = name;
    document.getElementsByTagName("body")[0].appendChild(checklabel);
  }
  // note: if adding these features, uncomment the lines for the checkboxes
  // in the code, testing if the checkbox is checked by something like:
  // document.getElementById("simple-track").checked in the drawing code
  // lines to uncomment to make checkboxes
  addCheckbox("simple-track", false);
  addCheckbox("arc-length", true);
  addCheckbox("bspline", false);
  addCheckbox("smoke", false);

  // helper function - set the slider to have max = # of control points
  function setNumPoints() {
    runcavas.setupSlider(0, thePoints.length, 0.05);
  }

  setNumPoints();
  runcavas.setValue(0);

  // add the point dragging UI
  draggablePoints(canvas, thePoints, wrapDraw, 10, setNumPoints);
};
