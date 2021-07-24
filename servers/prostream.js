/* prostream resolver
 * @lscofield
 * GNU
 */

const cheerio = require('cheerio');
const execPhp = require('exec-php');
const skkchecker = require('../lib/skkchecker');

exports.index = function (req, res) {
    //Optional check, only if you need to restrict access
    // to unautorized apps, skk is signature and auth is 
    // unautorized signal
    // see the config file to more info
    const auth = 'auth' in req.body ? req.body.auth : req.query.auth;
    const authJSON = Buffer.from(auth, 'base64').toString('utf8');
    const granted = skkchecker.check(authJSON);
    if (granted != '') {
        // no autorized app block
        // return a random troll video
        // if the app is unautorized
        res.json({ status: 'ok', url: granted });
    } else {
        // autorized app block
        const source = 'source' in req.body ? req.body.source : req.query.source;
        const html = Buffer.from(source, 'base64').toString('utf8');
        var mp4 = null;

        const $ = cheerio.load(html);

        try {
            var found = '';
            for (var i = 0; i < $('script[type="text/javascript"]').get().length; i++) {
                const text = $('script[type="text/javascript"]').get(i);
                try {
                    const s = text.children[0].data;
                    if (s.includes("eval(function")) {
                        found = s;
                        break;
                    }
                } catch (rt) { }
            }
            if (found != '') {
                execPhp('../lib/unpacker.php', '/usr/bin/php', function (error, php, output) {
                    php.nodeunpack(found, function (error, result, output, printed) {
                        if (error) {
                            mp4 = '';
                        } else {
                            var mp4Regex = /Player\s*\(\s*\{\s*sources:\s*\[(.*?)\]/s;
                            var match = mp4Regex.exec(result);
                            var json = match[1] && match[1] != '' ? `[${match[1]}]` : null;
                            if (json) {
                                json = JSON.parse(json);
                                if (json.length == 1)
                                    mp4 = json[0];
                                else {
                                    for (var i = 0; i < json.length; i++) {
                                        if (json[i].includes('v.mp4')) {
                                            mp4 = json[i];
                                            break;
                                        }
                                    }
                                }
                            } else mp4 = null;
                        }

                        mp4 = mp4 == null ? '' : mp4.trim();

                        res.json({ status: mp4 == '' ? 'error' : 'ok', url: mp4 });
                    });
                });
            } else {
                res.json({ status: 'error', url: '' });
            }
        } catch (e) {
            res.json({ status: 'error', url: '' });
        }
    }
};