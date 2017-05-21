// import modules
var express = require('express');
var path = require('path');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

// connect database
mongoose.connect("mongodb://test:testtest@ds023704.mlab.com:23704/phaidodb");
var dbConnection = mongoose.connection;

dbConnection.once("open", function () {
  console.log("DB connected!");
});
dbConnection.on("error", function (err){
  console.log("DB Error : ", err);
});

// make Schema
var gpsSchema = mongoose.Schema ({
  _id: {type: Number},  // 고유 ID
  name: {type: String},  // 이름
  lat: {type: Number}, // 위도
  lon: {type: Number}, // 경도
  address: {type: String}, // 주소
  state: {type: Number}  // 출동 상태
                         // 0 : 대기, 1 : 출동
});

var getDataSchema = mongoose.Schema ({
  _id: {type: Number}, // 드론 ID
  lat: {type: Number}, // 드론 Lat
  lon: {type: Number}, // 드론 LON
});

// setting model
var Data = mongoose.model('data', gpsSchema);
var GetData = mongoose.model('getdatas', getDataSchema);

// view setting
app.set("view engine", 'ejs');

// setting middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// set routes
app.get('/posts', function (req,res) {
  Data.find({}, function (err, posts) {
    if(err) return res.json({success:false, message:err});
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.json({success:true, data:posts});
  });
}); // gpsSchema all print

app.get('/posts/userGPS/test', function (req,res) {
  GetData.find({}, function (err, posts) {
    if(err) return res.json({success:false, message:err});
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.json({success:true, data:posts});
  });
}); // getDataSchema all print

app.post('/posts/update', function(req, res) {
  Data.findById(req.body._id, function(err, data) {
        if (err)
         return res.send(err);
         data.lat = req.body.lat;  // update
         data.lon = req.body.lon;

       // save the data
       data.save(function(err) {
         if (err)
           return res.send(err);
         return res.json({ _id: data._id, message: 'updated!' });
       });
   });
}); // update -> android,

var getGpsLat = []; // 건물 위도
var getGpsLon = []; // 건물 경도
var getDroneLat; // 드론 위도
var getDroneLon; // 드론 경도
var minDistance = 0;  // 최소거리 변수
var tempDistance;
var tempindex=0;

app.post('/posts/userGPS', function (req, res) {

  getDroneLat = req.body.lat;
  getDroneLon = req.body.lon;

  Data.find( function( err, datas ) {
    if (err) return res.send(err);
    console.log('first: '+tempindex);

    minDistance = 0;
    tempindex = 0;

    for(var t = 0; t < datas.length; t++) {
      temp_distance = Math.sqrt(Math.pow((datas[t].lat - getDroneLat), 2) + Math.pow((datas[t].lon - getDroneLon), 2));

      if (minDistance == 0 && datas[t].state == 0) {
        minDistance = temp_distance;
        tempindex = datas[t]._id;
      }

      else if(minDistance != 0 && datas[t].state == 0 ) {
        if (temp_distance < minDistance) {
          minDistance = temp_distance;
          tempindex = datas[t]._id;
        }
      }
    }

    if(tempindex == 0) {
      return res.json({_id:'null'});
    } else {

      Data.findById(tempindex, function(err, data) {
        if(err) return res.send(err);
        //data.state = 1;
        console.log(tempindex);

        var _id = data._id;
        var lat = getDroneLat;
        var lon = getDroneLon;

        var getdata = new GetData({
          '_id': _id,
          'lat': lat,
          'lon': lon
        });

        getdata.save(function(err){
          //if(err) return res.send(err);
        });

        data.save(function(err) {
          if (err) return res.send(err);
        });

        return res.json({_id:tempindex});
      }); //end of findbyid

    }
  });
});


var findidx = -1;
var findlat = -1;
var findlon = -1;

app.get('/posts/drone/qt/:id', function(req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');

  if(req.params.id == -1 || req.params.id == 0){
    res.send('err');
  } else {

   GetData.find( function( err, datas ) {

     findidx = -1;

      for(var i = 0; i < datas.length; i++){
        if(datas[i]._id == req.params.id){
            findidx = req.params.id;
            findlat = datas[i].lat;
            findlon = datas[i].lon;
        }
      }

      if(findidx == -1){

        Data.findById(req.params.id, function(err, data) {
            return res.json([{_id:data._id,name:data.name,lat:data.lat,lon:data.lon,address:data.address,state:data.state}]);
        });

      }else if(findidx != -1){

        Data.findById(req.params.id, function(err, data) {

            return res.json([{_id:data._id,name:data.name,lat:data.lat,lon:data.lon,address:data.address,state:data.state},
              {_id:findidx,lat:findlat,lon:findlon}]);

        });

      }


   });

  }
});

app.get('/posts/drone/:id', function(req, res) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');

  if(req.params.id == -1 || req.params.id == 0){
    res.send('err');
  } else {
  Data.findById({'_id': req.params.id}, function(err, data) {
      if (err)  return res.send(err);

      getGpsLat = data.lat;
      getGpsLon = data.lon;

      res.json({lat:getGpsLat,lon:getGpsLon});
    });
  }
});

app.post('/posts', function(req, res) {
  Data.create(req.body.post, function (err, post) {
    if(err) return res.json({success:false, message:err});
    res.json({success:true, data:post});
  });
}); // gpaSchema create


app.post('/posts', function(req, res) {
  Data.create(req.body.post, function (err, post) {
    if(err) return res.json({success:false, message:err});
    res.json({success:true, data:post});
  });
}); // gpaSchema create


app.put('/posts/:id', function(req, res) {
  Data.findByIdAndUpdate(req.params.id, req.body.post, function (err, post) {
    if(err) return res.json({success:false, mesaage:err});
    res.json({success:true, message:post._id + " updated"});
  });
}); // gpsScema update

app.delete('/posts/:id', function(req, res) {
  Data.findByIdAndRemove(req.params.id, function(err, post) {
    if(err) return res.json({success:false, message:err});
    res.json({success:true, message:post._id + " deleted"});
  });
}); // gpsSchema delete

app.delete('/posts/test/:id', function(req, res) {
  GetData.findByIdAndRemove(req.params.id, function(err, post) {
    if(err) return res.json({success:false, message:err});
    res.json({success:true, message:post._id + " deleted"});
  });
});

app.delete('/posts/test', function(req, res) {
  GetData.find(req.params.id, function(err, post) {
    if(err) return res.json({success:false, message:err});
    res.json({success:true, message:post._id + " deleted"});
  });
});

app.listen(3000, function() {
  console.log('Server On!');
});
