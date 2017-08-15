var canvas = document.getElementById('canvas')
var rectangle = document.getElementById('rectangle')
var hint = document.getElementById('hint')
var startPosition = {}
var currentPosition = {}
var isDrawing = false
var lastUpdatedAt = 0

canvas.addEventListener('mousedown', onStart)
canvas.addEventListener('touchstart', onStart)
canvas.addEventListener('mousemove', onMove)
canvas.addEventListener('touchmove', onMove)
canvas.addEventListener('mouseup', onStop)
canvas.addEventListener('touchend', onStop)
rectangle.addEventListener('mouseup', onStop)
rectangle.addEventListener('click', onClickShare)

function getCurrentPosition (e) {
  lastUpdatedAt = Date.now()
  var ev = e || window.event
  if (e.targetTouches) ev = e.targetTouches[0]
  if (ev.pageX) {
    return {
      x: ev.pageX + window.pageXOffset,
      y: ev.pageY + window.pageYOffset
    }
  } else if (ev.clientX) {
    return {
      x: ev.clientX + document.body.scrollLeft,
      y: ev.clientY + document.body.scrollTop
    }
  }
}

function onStart (e) {
  hint.className = 'hidden'
  isDrawing = true
  startPosition = getCurrentPosition(e)
  currentPosition = getCurrentPosition(e)
  draw()
}

function onMove (e) {
  if (isDrawing !== true) return
  currentPosition = getCurrentPosition(e)
  draw()
}

function draw () {
  var rectanglePosition = getRectanglePosition()
  rectangle.style.top = rectanglePosition.top + 'px'
  rectangle.style.left = rectanglePosition.left + 'px'
  rectangle.style.width = rectanglePosition.width + 'px'
  rectangle.style.height = rectanglePosition.height + 'px'
}

function getRectanglePosition () {
  return {
    top: (startPosition.y - currentPosition.y < 0)
      ? startPosition.y
      : currentPosition.y,
    left: (startPosition.x - currentPosition.x < 0)
      ? startPosition.x
      : currentPosition.x,
    width: Math.abs(startPosition.x - currentPosition.x),
    height: Math.abs(startPosition.y - currentPosition.y)
  }
}

function onStop (e) {
  isDrawing = false
}

function onClickShare (e) {
  e.stopPropagation()
  var rectanglePosition = getRectanglePosition()
  rectanglePosition.windowWidth = window.innerWidth
  rectanglePosition.windowHeight = window.innerHeight
  var url = window.location + 'popup?' + serialize(rectanglePosition)
  window.open(url, '', 'width=550,height=400')
}

function serialize (params) {
  var str = ''
  if (!params) return str
  for (var key in params) {
    if (str != '') {
      str += '&'
    }
    str += key + '=' + encodeURIComponent(params[key])
  }
  return str
}

setInterval(function () {
  if (Date.now() - lastUpdatedAt < 500) return
  if (
    Math.abs(startPosition.x - currentPosition.x) < 1 ||
    Math.abs(startPosition.y - currentPosition.y) < 1
  ) hint.className = ''
}, 500)

document.getElementsByTagName('HTML')[0].style.height = window.innerHeight
document.getElementsByTagName('BODY')[0].style.height = window.innerHeight
