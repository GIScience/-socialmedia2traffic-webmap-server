

// const axios = require('axios');


// let x = function (){
//     console.log("X")
// }

// var url = 'http://api.ohsome.org/v0.9/elements/geometry?bboxes=8.625,49.3711,8.7334,49.4397&keys=amenity&properties=tags,metadata&showMetadata=false&time=2016-01-01,2017-01-01&types=node,way&values=bank'

// let y = function(callback){
    
//     axios({
//         method: 'get',
//         url,
//         responseType: 'json'
//     })
//         .then(function (response) {
//             // console.log(response)
//             console.log("Y")
//         })
//         .catch(error => {
//             console.log(error)
//         });;

//     callback()
// }

// y(x)



let cleanRoom = function(){
    return new Promise(function(resolve, reject){
        resolve ('cleaned')
    })
}

let removeGarbage = function(){
    return new Promise (function(resolve, reject){
        resolve ('remove')
    })
}

let winIce = function(){
    return new Promise (function(resolve, reject){
        resolve('Ice')
    })
}

let test = function (){return 'test'}
let test2 = function (){return 'test2'}

cleanRoom().then(removeGarbage, test).then(winIce, test2).then(
    function(){console.log('win11')},
    function(){console.log('loose')}
)