
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const Parser = require('json2csv').Parser;

const URL = 'http://192.168.2.37:1400/support/review';
const INTERVAL = 30000;
const FILENAME = path.join(__dirname, '/sonos-connectivity.csv');
const NEW_LINE = '\r\n';
const FIELDS = ['timestamp', 'zone_name', 'ofdm_level', 'noise_floor'];

setInterval(() => {
    request({ uri: URL },
        function (error, response, body) {
            const $ = cheerio.load(body);
            const nodedata = $('zpsupportinfo');
            const parsedinfo = [];
            nodedata.each(function(i, datum) {
                const zone_name = $('zonename', datum).text();
                const file = $('file[name="/proc/ath_rincon/status"]', datum);
                const lines = file.text().split('\n');
                let ofdm = 'n/a';
                const noise = [];
                for (let l = 0; l < lines.length; l++) {
                    const line = lines[l];
                    if (line.startsWith('OFDM ANI level') && line.match( /OFDM ANI level: (\d+)/ )) {
                        ofdm = RegExp.$1;
                    }
                    if (line.startsWith('Noise Floor') && line.match( /Noise Floor: -(\d+)/ )) {
                        noise.push(RegExp.$1);
                    }
                }
                if (ofdm !== 'n/a' && noise.length) {
                    parsedinfo.push({
                        timestamp: new Date().toISOString(),
                        zone_name: zone_name,
                        ofdm_level: ofdm,
                        noise_floor: noise
                    });
                }
            });
            const toCsv = {
                fields: FIELDS,
                header: false,
            };
            fs.stat(FILENAME, function (err, stat) {
                if (err == null) {
                    // write the actual data and end with newline
                    const csv = new Parser(toCsv).parse(parsedinfo) + NEW_LINE;
                    fs.appendFile(FILENAME, csv, function (err) {
                        if (err) throw err;
                        console.log('The "data to append" was appended to file!');
                    });
                } else {
                    // write the headers and newline
                    const csv = (FIELDS + NEW_LINE + new Parser(toCsv).parse(parsedinfo) + NEW_LINE);
                    fs.writeFile(FILENAME, csv, function (err) {
                        if (err) throw err;
                        console.log('File created and saved');
                    });
                }
            });
        }
    );
}, INTERVAL);


