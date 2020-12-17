const simplest = require("./simplest");


simplest.load("_theme").addComponentFunction("addLink", function (templateData, userData, done) {
    const path = require('path');
    userData.forEach(function (v){
        v['link'] = v.saveFileName.substr(v.saveFileName.indexOf(path.sep)+1)
    })
}).addComponentFunction("a", function (templateData, UserData, done) {

    console.log('a')

}).addComponentFunction("b", function (templateData, UserData, done) {

    console.log('b')

}).addComponentFunction("c", function (templateData, UserData, done) {


}).render("_posts", "_site");





// simplest("_theme").addInterceptionFunction("a",function (){
//     console.log(1)
// }).addInterceptionFunction("b",function (){
//     console.log(2)
// }).addInterceptionFunction("c",function (){
//     console.log(3)
// }).export();
//
//
// const theme = require("./simplest.theme");
// theme.render("_posts","_site");



// const data = {
//     front:
// }













