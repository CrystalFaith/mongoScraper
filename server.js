``// dependencies
var express     = require("express");
var exphbs      = require("express-handlebars");
var mongoose    = require("mongoose");
var bodyParser  = require("body-parser");
var logger      = require("morgan");

var Tweets      = require("./models/Tweets.js");
var About       = require("./models/About.js");

var request     = require("request");
var cheerio     = require("cheerio");

mongoose.Promise = Promise;
// PORT
var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();


app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.use(express.static("./public"));

mongoose.connect("mongodb://localhost/trumpTweets");
var db = mongoose.connection;

// DROPS DATABASE
// db.dropDatabase();

app.get("/", function(req, res) {

  Tweets.find({tweetAuthor: "Donald J. Trump"}).then(function(data) {

    var hbsObject = {
      Tweets: data
    };
    console.log("this is the hbs object" + hbsObject);
    res.render("index", hbsObject);
  });
});

app.get("/tweets", function(req, res) {

  db.dropDatabase()
  Tweets.find({tweetAuthor: "Donald J. Trump"}).then(function(data) {

    Tweets.find({}, function(error, doc) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      // Or send the doc to the browser as a json object
      else {
        res.json(doc);
      }
    });
});
})

app.get("/scrape", function(req, res) {

  request("https://twitter.com/realDonaldTrump", function(error, response, html) {

    var $ = cheerio.load(html);

    // loop through each element that is a div with the class of content
    $("div.content").each(function(i, element) {

      var result = {};

      // finds the author of the tweet - this is here to stop confusion of retweets
      result.tweetAuthor = $(this).children("div.stream-item-header").children("a.account-group").children("span.FullNameGroup").children("strong.fullname").text();
      // finds the timestamp of tweet
      result.tweetTime = $(this).children("div.stream-item-header").children("small.time").children("a.tweet-timestamp").children("span._timestamp").text();
      // finds the text of the tweet
      result.tweetText = $(this).children("div.js-tweet-text-container").children("p.tweet-text").text();


      console.log(result);

      var entry = new Tweets(result);

      // Now, save that entry to the db
      entry.save(function(err, entry) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(entry);
          ;
        }
      });

    });
  });

  Tweets.find({tweetAuthor: "Donald J. Trump"}).then(function(data) {

    var hbsObject = {
      Tweets: data
    };
    console.log("this is the hbs object" + hbsObject);
    res.render("index", hbsObject);
  });
});

app.post("/savetweet/:id", function(req, res) {
  var query = {"_id": req.params.id};
  var update = {"saved": true};
  var options = {new: true};
      // Use the article id to find and update it's note
      Tweets.findOneAndUpdate(query, update, options, function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);

        }
      });

  console.log("saved tweet")

});


app.get("/viewTweets", function(req, res) {

    Tweets.find({tweetAuthor: "Donald J. Trump"}).then(function(data) {

      var hbsObject = {
        Tweets: data
      };
      console.log("this is the hbs object" + hbsObject);
      res.render("savedtweets", hbsObject);
    });
});

app.post("/makeNote/:id", function(req, res) {

  console.log("this is req \n\n"+ req.body);
  // Create a new note and pass the req.body to the entry
  var newAbout = new About(req.body);

  // And save the new note the db
  newAbout.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Tweets.findOneAndUpdate({ "_id": req.params.id }, { "about": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
  console.log("created note")
});

app.post("/saveNote/:id", function(req, res) {

  console.log("req.body", req.body)
  var newAbout = new About(req.body);

  var tweetId = req.params.id;
  // And save the new note the db
  newAbout.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {

      console.log('this is the di', tweetId)
      Tweets.findOne({ "_id": tweetId}).then(function(tweet, err){
        console.log(tweet)
        tweet.about.push(newAbout);
        res.send(newAbout)
      });
    }
  });
});

app.get("/seeNote/:id", function(req, res) {

  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Tweets.findOne({ "_id": req.params.id })
  .populate("about").exec(function(error, data) {

    console.log("THIS IS DOC \n" +data)
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(data.about);
    }
  });
});

// listens to port
app.listen(PORT, function() {
  console.log("App listening on PORT " + PORT);
});
