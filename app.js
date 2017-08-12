const fs = require('fs')
const path = require('path')

// get settings
try {
  var settings = require('./settings.json')
} catch (e) {
  var settings = {}
}

// setup server
const express = require('express')
const app = express()
app.set('views', './views')
app.set('view engine', 'pug')
app.use('/images', express.static('images'))
const server = app.listen(settings.port || 3000)

// setup database
const Datastore = require('nedb')
const pages = new Datastore({
  filename: path.join(__dirname, 'pages.db'),
  autoload: true
})

// setup canvas
const Canvas = require('canvas')
const CANVAS_WIDTH = 540 * 3
const CANVAS_HEIGHT = 287 * 3

// setup constants
const BASE_URL = (process.env.USER === 'user')
  ? 'http://localhost:' + settings.port
  : settings.publicUrl
const FACEBOOK_SHARE_URL = 'https://www.facebook.com/sharer/sharer.php?u='

// show sharing page for the facebook bot
// redirect to index everybody else
app.get('/', function (request, response) {
  if (
      request.query != null
      && request.query.result != null
    ) {
    if (
      request.headers['user-agent'] != null
      && request.headers['user-agent'].indexOf('facebook') >= 0
    ) {
      return response.render('share', getSharePageProps(request.query.result))
    } else {
      return response.redirect('/')
    }
  }
  return response.render('index', getMainPageProps())
})

// save request parameters, generate image
// and redirect to a facebook share dialog
app.get('/redirect', function (request, response) {
  if (!hasQuery(request.query)) return response.send('server error')

  createOrFindPage(request, function (error, urlPath) {
    if (error) return response.send('server error')
    const shareUrl = FACEBOOK_SHARE_URL + encodeURIComponent(BASE_URL + urlPath)
    return response.redirect(shareUrl)
  })
})

// redirect all other routes to the main page
app.get('*', function (request, response) {
  response.redirect('/')
})

function getMainPageProps () {
  return {
    imageUrl: BASE_URL + '/images/index.png',
    pageUrl: BASE_URL,
    pageTitle: settings.pageTitle,
    pageDescription: settings.pageDescription,
    imageWidth: 1080,
    imageHeight: 556,
    gaClientId: settings.gaClientId,
  }
}

function getSharePageProps (id) {
  const imageUrl = BASE_URL + '/images/' + id + '.png'
  return {
    imageUrl: imageUrl,
    pageUrl: BASE_URL + '/?result=' + id,
    pageTitle: settings.pageTitle,
    pageDescription: settings.pageDescription,
    imageWidth: CANVAS_WIDTH,
    imageHeight: CANVAS_HEIGHT,
    gaClientId: settings.gaClientId,
  }
}

function hasQuery (query) {
  return (
    query != null &&
    query.top != null &&
    query.left != null &&
    query.width != null &&
    query.height != null
  )
}

function createOrFindPage (request, callback) {
  const cleanedQuery = cleanQuery(request.query)
  pages.findOne(cleanedQuery).exec(function (error, found) {
    if (error) return callback(error)
    if (found) {
      pages.update({_id: found._id}, {$push: {headers: request.headers}}, function (error, result) {
        if (error) console.error(error)
      })
      if (callback) return callback(null, '/?result=' + found._id)
    }
    pages.insert({
      headers: [request.headers],
      query: request.query,
      top: cleanedQuery.top,
      left: cleanedQuery.left,
      width: cleanedQuery.width,
      height: cleanedQuery.height
    }, function (error, result) {
      if (error) return callback(error)
      generateImage(result._id, request.query, function (error, success) {
        if (error) return callback(error)
        const url = '/?result=' + result._id
        if (callback) return callback(null, url)
      })
    })
  })
}

function cleanQuery (query) {
  return {
    top: parseInt(query.top),
    left: parseInt(query.left),
    width: parseInt(query.width),
    height: parseInt(query.height),
  }
}

function generateImage (id, query, callback) {
  var canvas = new Canvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  var ctx = canvas.getContext('2d')
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'white'
  ctx.fillRect(
    canvas.width * query.left / 100,
    canvas.height * query.top / 100,
    canvas.width * query.width / 100,
    canvas.height * query.height / 100
  )
  const filepath = path.join(__dirname, 'images', id) + '.png'
  fs.writeFile(filepath, canvas.toBuffer(), function (err) {
    if (err) return callback(err)
    if (callback) return callback(null)
  })
}