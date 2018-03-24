const https = require("https");
const express = require('express');
const app = express();
const mongodb = require('mongodb');

/*
// The FreeCodeCamp assignment specifically requests a format of protocol-subdomain-domain-TLD
// Unfortunately, links without subdomains (ex: https://c9.io) will not get caught in the regex
// A different regex to allow for that is commented out below, simply swap the two. Of course,
// you'd also be better off using a different validation method if you're concerned about proper validation
*/
const urlRegex = /(?!.*-{2,})^(https?(?::\/\/)(\w|-)+\.(?:(?:\w|-)+)\.(?:\w+\.\w+|\w+))/i
// const urlRegex = /(?!.*-{2,})^(https?(?::\/\/)((\w|-)+\.)?(?:(?:\w|-)+)\.(?:\w+\.\w+|\w+))/i

const codeLength = 6;
const codeRegex = new RegExp('(\\w|-){'+codeLength+'}', 'i')
const shortCodeSystem = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p",
                         "q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F",
                         "G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V",
                         "W","X","Y","Z","1","2","3","4","5","6","7","8","9","0","-","_"]
const shortCodeBase = shortCodeSystem.length;
const mongoURL = process.env.MONGO_URL + process.env.MONGO_DB;

const profanityRegex = new RegExp('(\\w|-){1,'+codeLength+'}', 'gi')
let profanityFilter;
https.get("https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en", res => {
  let list = "";
  res.on('data', (data) => {
    list += data;
  });
  res.on('end', () => {
    list = list.split('\n');
    profanityFilter= list.filter(word => {
      word = word.replace(/ /g,'');
      if (word.length <= codeLength && word.match(profanityRegex)) { 
        return word;
      }
    });
  });
})

function convertNumToCode(num) {
  let codeArray = [];

  while (num > 0) {
    let remainder = num % shortCodeBase;
    codeArray.push(remainder);
    num = Math.floor(num / shortCodeBase);
  }
  
  while (codeArray.length < codeLength) {
    codeArray.push(0);
  }
  
  codeArray = codeArray.reverse().splice('');
  
  codeArray = codeArray.map(digit => {
    return shortCodeSystem[digit];
  });
  
  return codeArray.join("");
}

function convertCodeToNum(code) {
  code = code.split('').reverse();
  return code.reduce((acc, letter, i) => {
    return acc + shortCodeSystem.indexOf(letter) * Math.pow(shortCodeBase, i);
  },0);
}

function getMongoDB(callback) {
  mongodb.MongoClient.connect(mongoURL, (err, client) => {
    if (err) {
      throw err;
    }

    let db = client.db(process.env.MONGO_DB);
    
    let promise = callback(db);
    
    promise.then(() => {
      client.close();
    }).catch((err) => {
      //
    });
  });
}

// http://expressjs.com/en/starter/basic-routing.html
app.get("/new", (req, res) => {
  let query = req.query;
  if (!("site" in query)) {
    return res.status(400).send({ERROR:"\"Site\" parameter not found."});
  }
  
  let site = urlRegex.exec(query.site);
  if (site === null) {
    return res.status(400).send({ERROR:"Not a valid input." +
      "Site must match following format: protocol://subdomain.domain.top-level-domain"});
  }
  site = site[0]
  
  getMongoDB(db => {
    return new Promise((resolve, reject) => {
      let codes = db.collection('shortCodes');
      codes.find({site: site}).toArray((err, duplicateList)=> {
        
        if(duplicateList.length !== 0) {
          res.status(409).send({ERROR: "duplicate entry"});
          return reject();
        }
        
        codes.find({},{_id:0, id:1}).sort({id:-1}).limit(1).toArray((err,data) => {
          if (err) {
            res.status(500).send({ERROR: err});
            return reject();
          }

          let lastId = data.length === 0 ? 1 : data[0].id + 1;
          let shortCode = null;
          while (shortCode === null) {
            shortCode = convertNumToCode(lastId);
            for (let i = 0; i < profanityFilter.length; i++) {
              if (shortCode.match(profanityFilter[i])) {
                shortCode = null
                lastId += 1;
                break;
              };
            }
          }
                    
          codes.insert([{id: lastId, site: site, shortcode: shortCode}], (err, result) => {
            if (err) {
              res.status(500).send({ERROR: err});
              return reject();
            }

            res.send({originalSite: site, shortcode: req.protocol + "://" + req.hostname + "/" + shortCode});
            return resolve();
          });
        });
      });
    });
  });
});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

app.get("/*", (req, res) => {
  let shortCode = decodeURI(req.url.substring(1));
  if (shortCode === '') {
    return res.sendFile(__dirname + '/views/index.html');
  }
  
  let idToReturn = convertCodeToNum(shortCode);
  
  if (shortCode.match(codeRegex) === null) {
    return res.status(400).send({ERROR: shortCode + " is not a valid entry"});
  }
  
  getMongoDB(db => {
    return new Promise((resolve, reject) => {
      let sites = db.collection('shortCodes');
      sites.findOne({id: idToReturn}, (err, data) => {
        if (data === null)  {
          res.send({ERROR: shortCode + " has not been created"});
          return reject();
        }
        
        res.redirect(data.site);
      });
    });
  });
});

// listen for requests :)
let listener = app.listen(process.env.PORT);