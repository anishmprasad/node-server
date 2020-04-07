var express = require("express"),
  app = express(),
  port = process.env.PORT || 3003,
  bodyParser = require("body-parser");
var cors = require("cors");
var cookieParser = require("cookie-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
const jsondata = require("./aakash.json");
const ntadata = require("./nta.json");
// const omr = require("./ckeditor");

// console.log(data);

app.use(
  cors({
    credentials: true,
    origin: "http://development.embibe.com",
  })
);
app.use("/data", data);
app.use("/nta", nta);

app.use(function (req, res) {
  res.status(404).send({ url: req.originalUrl + " not found" });
});

app.listen(port);

console.log("API server started on: " + port);

// jsondata.filter(elem => elem.usergroupid);

function data(req, res) {
  return res
    .cookie("cookiename", "cookievalue", {
      maxAge: 900000,
      domain: "development.embibe.com",
      path: "/",
    })
    .status(200)
    .send(jsondata);
}
function nta(req, res) {
  return res
    .cookie("cookiename", "cookievalue", {
      maxAge: 900000,
      domain: "development.embibe.com",
      path: "/",
    })
    .status(200)
    .send(ntadata);
}
