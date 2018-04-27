'use strict';

const Code = require('../models/codes.js');
const ShortCodeFunctions = require(process.cwd() + '/controllers/shortCodeFunctions');
const sc = new ShortCodeFunctions(6);
const urlRegex = /(?!.*-{2,})^(https?(?::\/\/)(\w|-)+\.(?:(?:\w|-)+)\.(?:\w+\.\w+|\w+))/i;

function handleError(message, status, res, logToConsole) {
  res.status(status).send({error: message});
  if (logToConsole) { console.log(`Error on ${new Date()}: ${logToConsole}`); }
}

class ServerFunctions {
  saveNewSite (req, res) {
    if (!('site' in req.query)) {
      return handleError('"Site" parameter not found.', 400, res);
    }
    
    let site = req.query.site;
    if (!urlRegex.test(site)) {
      return handleError('Not a valid input. Site must match following format: protocol://subdomain.domain.top-level-domain', 409, res);
    }
    
    Code.findOne({site: site}, (dupErr, duplicate) => {
      if (dupErr) { handleError('Something appears to have gone wrong on our end. Please try again later.', 503, res, dupErr); }
      if (duplicate !== null) {
        return handleError('Duplicate entry', 409, res);
      }
      
      Code.findOne().sort({id: -1}).exec((idErr,data) => {
        if (idErr) { handleError('Something appears to have gone wrong on our end. Please try again later.', 503, res, idErr); }
        
        let nextId = data === null ? 1 : data.id + 1;
        let shortCode = null;
        
        while (shortCode === null) {
          shortCode = sc.convertNumToCode(nextId);
          for (let i = 0; i < sc.getFilterLength(); i++) {
            if (shortCode.match(sc.getWordFromFilter(i))) {
              shortCode = null;
              nextId += 1;
              break;
            }
          }
        }
        
        let newCode = {
          id: nextId,
          site: site
        };
        
        Code.create(newCode, (insertErr) => {
          if (insertErr) { handleError('Something appears to have gone wrong on our end. Please try again later.', 503, res, insertErr); }
          res.json({
            site: site,
            shortCode: shortCode,
            shortenedUrl: req.protocol + '://' + req.get('host') + '/' + shortCode
          });
        });
      });
    });
  };
  
  fetchSite(req, res) {
    let shortCode = req.params.code;
    
    if (!sc.isValidCode(shortCode)) {
      return handleError('Not a valid shortcode.', 409, res);
    }
  
    let idToReturn = sc.convertCodeToNum(shortCode);
    
    Code.findOne({id: idToReturn}, (err, data) => {
      if (err) { handleError('Something appears to have gone wrong on our end. Please try again later.', 503, res, err); }
      if (data === null) {
        return res.send({ERROR: shortCode + ' has not been created'});
      }
      return res.redirect(data.site);
    });
  };
}

module.exports = ServerFunctions;