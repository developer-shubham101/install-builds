var express = require('express');
var router = express.Router();

const multer = require('multer')
const fs = require('fs');
const extract = require('../lib');
const { identifyProvisioningType } = require('../lib/provisioning');
const { promisify } = require('util');
var path = require('path');
const openAsync = promisify(fs.open);
var cgbiToPng = require('cgbi-to-png');

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Install IPA' });
});


const extractIPA = async (req, res, ipaPth, localPath) => {

  const fd = await openAsync(ipaPth);
  const result = await extract(fd);

  const content = fs.readFileSync(__dirname + '/sample.plist').toString();


  var firstInfo = result.info[0];
  var info = {
    package: firstInfo.CFBundleIdentifier,
    version: firstInfo.CFBundleShortVersionString,
    name: firstInfo.CFBundleDisplayName,
    buildVersion: firstInfo.CFBundleVersion

  };

  let key = makeRandomString(6);
  var newContent = content
    .replace('{ipa-file-url}', `https://${req.headers.host}/${localPath}`)
    .replace('{icon-file-url}', `https://${req.headers.host}/ipa/${key}.png`)
    .replace('{bundle-identifier}', info.package)
    .replace('{bundle-version}', info.version)
    .replace('{app-name}', info.name);


  let infoJson = {
    time: new Date().getTime(),
    name: info.name,
    version: info.version,
    package: info.package,
    build: info.buildVersion,
    key: key,
    ipaURL: `https://${req.headers.host}/${localPath}`,
    infoPlist: firstInfo
  }
  let newFileName = `${key}.plist`;
  fs.writeFileSync(`${__dirname}/../ipa/${newFileName}`, newContent);
  fs.writeFileSync(`${__dirname}/../ipa/${`${key}.json`}`, JSON.stringify(infoJson));
  fs.writeFileSync(`${__dirname}/../ipa/${`${key}.png`}`, cgbiToPng.revert(result.icon) );
  res.redirect(`/install/${key}`);
}

function checkFileType(req, file, cb) {
  // Allowed ext
  const filetypes = /ipa/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: iPA Only!');
  }
}
const upload = multer({
  dest: 'ipa/',
  preservePath: false,
  // fileFilter: checkFileType
})
router.post('/', upload.fields([{ name: 'file', maxCount: 1 }]), function (req, res, next) {
  try {
    if (req.files.file && req.files.file.length > 0) {
      let newFileName = moveFile(req.files.file[0]);
      let fullPath = __dirname + '/../' + newFileName;
      if (path.extname(newFileName).toLowerCase() == '.ipa') {
        extractIPA(req, res, fullPath, newFileName);
      } else {
        fs.unlinkSync(fullPath);
        res.render('index', { title: 'Install IPA', error: "Please upload ipa file" });
      }
    } else {
      res.render('index', { title: 'Install IPA', error: "Please upload file" });
    }
  } catch (ex) {
    console.error(ex);
    console.error(ex);
    res.render('index', { title: 'Install IPA', error: ex.toString() });
  }
})
function moveFile(file) {
  let newFileName = `${file.destination}${makeRandomString(22)}.${file.originalname.split('.').pop()}`;
  console.log(newFileName);
  fs.renameSync(`./${file.path}`, newFileName)

  return newFileName;
}
function makeRandomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}
module.exports = router;