'use strict';

const fetch = require('node-fetch');

class ShortCode {
  constructor(length) {
    this.codeLength = length;
    this.codeRegex = new RegExp('(\\w|-){'+this.codeLength+'}', 'i');
    this.filterList = [];
    this.codeAlphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p',
                         'q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F',
                         'G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V',
                         'W','X','Y','Z','1','2','3','4','5','6','7','8','9','0','-','_'];
    
    this.createFilterList();
  }
  
  createFilterList() {
    let profanityRegex = new RegExp('(\\w|-){1,'+this.codeLength+'}', 'gi');
    fetch('https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en')
      .then(res => res.text())
      .then(body => {
        this.filterList = body.split('\n').filter(word => {
          word = word.replace(/ /g,'');
          if (word.length <= this.codeLength && word.match(profanityRegex)) { 
            return word;
          }
        });
      }).catch(err => {
        this.profanityFilter = [];
        console.log('WARNING: profanity filter not loaded.');
      });
  }
  
  isValidCode(code) {
    return this.codeRegex.test(code);
  }
  
  getFilterLength() {
    return this.filterList.length;
  }
  
  getWordFromFilter(int) {
    return this.filterList[int];
  }
  
  convertNumToCode(num) {
    let codeArray = [];

    while (num > 0) {
      let remainder = num % this.codeAlphabet.length;
      codeArray.push(remainder);
      num = Math.floor(num / this.codeAlphabet.length);
    }

    while (codeArray.length < this.codeLength) {
      codeArray.push(0);
    }

    codeArray = codeArray.reverse().splice('').map(digit => {
      return this.codeAlphabet[digit];
    });

    return this.scramble(codeArray.join(''));
  }
  
  scramble(string) {
    let lastIndex = 0;
    string = string.split('');
    for(let i=0; i < string.length; i++) {
      let letterIndex = this.codeAlphabet.indexOf(string[i]);
      letterIndex = (letterIndex + (lastIndex + i)) % this.codeAlphabet.length;
      string[i] = this.codeAlphabet[letterIndex];
      lastIndex = letterIndex;
    }
    return string.join('');
  }
  
  unscramble(string) {
    let last = 0;
    string = string.split('');
    for(let i=0; i < string.length; i++) {
      let letterIndex = this.codeAlphabet.indexOf(string[i]);
      let sum = letterIndex - i - last;
      last = letterIndex;
      string[i] = this.codeAlphabet[sum];
    }
    return string.join('');
  }
  
  convertCodeToNum(code) {
    code = this.unscramble(code);
    code = code.split('').reverse();
    return code.reduce((acc, letter, i) => {
      return acc + this.codeAlphabet.indexOf(letter) * Math.pow(this.codeAlphabet.length, i);
    },0);
  }
}

module.exports = ShortCode;