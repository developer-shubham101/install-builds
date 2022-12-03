var createError = require('http-errors'); 
var express = require('express');
var router = express.Router();
const fs = require('fs')


router.get('/', function (req, res, next) {

  const dir = `${__dirname}/../ipa`;
  const files = fs.readdirSync(dir);

  let iapInfo = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      let tmpData = JSON.parse(fs.readFileSync(`${dir}/${file}`));
      tmpData['currentUrl'] = `https://${req.headers.host}/install/${file.replace('.json', '')}`;
      tmpData['date'] = new Date(tmpData.time / 1000).toString()
      iapInfo.push(tmpData);
    }
  }
  console.log(iapInfo);
  res.render('ipaFiles', { title: 'Install IPA', iapInfo: iapInfo });
});

router.get('/:id', function (req, res, next) {

  const dir = `${__dirname}/../ipa`;
  const filePath = `${dir}/${req.params.id}.json`;

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    let fileInfo = JSON.parse(content);

    let infoIPA = {
      url: `itms-services://?action=download-manifest&url=https://${req.headers.host}/ipa/${req.params.id}.plist`,
      iconUrl: `https://${req.headers.host}/ipa/${req.params.id}.png`,
      date: new Date(fileInfo.time / 1000).toString(),
      name: fileInfo.name,
      version: fileInfo.version,
      package: fileInfo.package,
      build: fileInfo.build,
      currentUrl: `https://${req.headers.host}/install/${req.params.id}`,
      ipaURL: fileInfo.ipaURL,
    }
    
    res.render('ipaFile', { title: 'Install IPA', infoIPA: infoIPA });
  } else {
    res.render('error', { message: 'Ipa not found', error: { status: 404 } });
  }
});


module.exports = router;
