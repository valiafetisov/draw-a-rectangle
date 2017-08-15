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

// setup image
const gm = require('gm')
const IMAGE_WIDTH = 540 * 3
const IMAGE_HEIGHT = 287 * 3

// setup constants
const BASE_URL = (process.env.USER === 'user')
  ? 'http://localhost:' + settings.port
  : settings.publicUrl
const FACEBOOK_SHARE_URL = 'https://www.facebook.com/sharer/sharer.php?u='

// show sharing page for the facebook bot
// redirect to index everybody else
app.get('/', function (request, response) {
  return response.render('index', getMainPageProps())
})

// handle popup window – redirect to share dialog
app.get('/popup', function (request, response) {
  var rectanglePosition
  try {
    rectanglePosition = getQueryValues(request.query)
  } catch (error) {
    return response.send(error)
  }
  createOrFindPage(rectanglePosition, request.headers, function (error, pageId) {
    if (error) {
      console.error(error)
      return response.send('server error')
    }
    const facebookUrl = FACEBOOK_SHARE_URL + encodeURIComponent(BASE_URL + '/share/' + pageId)
    return response.redirect(facebookUrl)
  })
})

// open share page
app.get('/share/:pageId', function (request, response) {
  if (!request.params.pageId) return response.send('no pageId')
  // if (
  //   request.headers['user-agent'].indexOf('bot') >= 0 ||
  //   request.headers['user-agent'].indexOf('facebook') >= 0 ||
  //   request.headers['user-agent'].indexOf('twitter') >= 0 ||
  //   request.headers['user-agent'].indexOf('vkontakte') >= 0
  // ) {
  return response.render('share', getSharePageProps(request.params.pageId))
  // } else {
  //   return response.redirect('/')
  // }
})

// redirect all other routes to the main page
app.get('*', function (request, response) {
  return response.redirect('/')
})

function getQueryValues (query) {
  if (
    query == null ||
    typeof query.windowWidth !== 'string' ||
    typeof query.windowHeight !== 'string' ||
    typeof query.top !== 'string' ||
    typeof query.left !== 'string' ||
    typeof query.width !== 'string' ||
    typeof query.height !== 'string'
  ) throw new Error('invalid arguments')
  let values = {
    windowWidth: parseInt(query.windowWidth),
    windowHeight: parseInt(query.windowHeight),
    top: parseInt(query.top),
    left: parseInt(query.left),
    width: parseInt(query.width),
    height: parseInt(query.height)
  }
  if (
    values.windowWidth <= 0 ||
    values.windowHeight <= 0 ||
    values.top < 0 ||
    values.left < 0 ||
    values.width <= 0 ||
    values.height <= 0
  ) throw new Error('invalid arguments')
  if (values.left + values.width > values.windowWidth) {
    values.windowWidth = values.left + values.width
  }
  if (values.top + values.height > values.windowHeight) {
    values.windowHeight = values.top + values.height
  }
  return values
}

function getMainPageProps () {
  return {
    imageUrl: BASE_URL + '/images/index.png',
    pageUrl: BASE_URL,
    pageTitle: settings.indexPageTitle,
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
    pageUrl: BASE_URL + '/share/' + id,
    pageTitle: settings.sharePageTitle,
    pageDescription: settings.pageDescription,
    imageWidth: IMAGE_WIDTH,
    imageHeight: IMAGE_HEIGHT,
    gaClientId: settings.gaClientId,
  }
}

function createOrFindPage (rectanglePosition, headers, callback) {
  // get image rectangle coordinates
  const rectangleImageCoordinates = getRectangleImageCoordinates(rectanglePosition)

  // search by those coordinates if this image already exists
  pages.findOne(rectangleImageCoordinates).exec(function (error, found) {
    if (error) return callback(error)
    const now = Date.now()

    // create object with client information
    const client = {
      originalSizes: rectanglePosition,
      userIp: headers['x-forwarded-for'],
      userAgent: headers['user-agent'],
      timestamp: now
    }

    // if image exist, return it's id
    if (found) {
      pages.update({_id: found._id}, {
        $push: {clients: client},
        $set: {updatedAt: now}
      }, function (error, result) {
        if (error) console.error(error)
      })
      if (callback) return callback(null, found._id)
    }

    // if not, create new one and generate image
    rectangleImageCoordinates.clients = [client]
    rectangleImageCoordinates.createdAt = now
    pages.insert(rectangleImageCoordinates, function (error, inserted) {
      if (error) return callback(error)

      // generate new image and return it's id on complete
      generateImage(inserted._id, rectangleImageCoordinates, function (error, success) {
        if (error) return callback(error)
        if (callback) return callback(null, inserted._id)
      })
    })
  })
}

function getRectangleImageCoordinates (rectanglePosition) {
  const widthProportion = rectanglePosition.windowWidth / IMAGE_WIDTH
  const height = rectanglePosition.windowHeight / widthProportion
  const heightProportion = (height > IMAGE_HEIGHT) ? (height / IMAGE_HEIGHT) : 1
  const correction = widthProportion * heightProportion
  const leftShift = (height > IMAGE_HEIGHT) ? (IMAGE_WIDTH - rectanglePosition.windowWidth / correction) / 2 : 0
  const topShift = (height < IMAGE_HEIGHT) ? (IMAGE_HEIGHT - rectanglePosition.windowHeight / correction) / 2 : 0
  return {
    x1: Math.floor(rectanglePosition.left / correction + leftShift),
    y1: Math.floor(rectanglePosition.top / correction + topShift),
    x2: Math.floor((rectanglePosition.left + rectanglePosition.width) / correction + leftShift),
    y2: Math.floor((rectanglePosition.top + rectanglePosition.height) / correction + topShift)
  }
}

function generateImage (pageId, rectangleImageCoordinates, callback) {
  const filepath = path.join(__dirname, 'images', pageId) + '.png'
  gm(IMAGE_WIDTH, IMAGE_HEIGHT, '#000000')
  .fill('#ffffff')
  .drawRectangle(
    rectangleImageCoordinates.x1,
    rectangleImageCoordinates.y1,
    rectangleImageCoordinates.x2,
    rectangleImageCoordinates.y2
  )
  .write(filepath, function (error) {
    if (error) return callback(error)
    callback(null, pageId)
  })
}
