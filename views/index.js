window.onload = function () {
  initDraw(document.getElementById('canvas'));

  function initDraw (canvas) {
    function setMousePosition (e) {
      var ev = e || window.event; //Moz || IE
      if (e.targetTouches) ev = e.targetTouches[0]
      if (ev.pageX) { //Moz
        mouse.x = ev.pageX + window.pageXOffset;
        mouse.y = ev.pageY + window.pageYOffset;
      } else if (ev.clientX) { //IE
        mouse.x = ev.clientX + document.body.scrollLeft;
        mouse.y = ev.clientY + document.body.scrollTop;
      }
      mouse.updatedAt = Date.now()
    };

    var mouse = {
      x: 0,
      y: 0,
      startX: 0,
      startY: 0
    };
    var element = null;

    function move (e) {
      if (element == null) return;
      setMousePosition(e);
      var position = getRelativePosition(mouse)
      element.style.top = position.top + '%';
      element.style.left = position.left + '%';
      element.style.width = position.width + '%';
      element.style.height = position.height + '%';
    }

    canvas.onmousemove = move
    canvas.ontouchmove = move

    function checkForId (element, id) {
      if (element.id === id) return true
      if (element.parentNode) {
        return checkForId(element.parentNode, id)
      }
      return false
    }

    function getRelativePosition () {
      return {
        top: (mouse.y - mouse.startY < 0)
          ? mouse.y / window.innerHeight * 100
          : mouse.startY / window.innerHeight * 100,
        left: (mouse.x - mouse.startX < 0)
          ? mouse.x / window.innerWidth * 100
          : mouse.startX / window.innerWidth * 100,
        width: Math.abs(mouse.x - mouse.startX) / window.innerWidth * 100,
        height: Math.abs(mouse.y - mouse.startY) / window.innerHeight * 100
      }
    }

    function serialize (params) {
      var str = '';
      if (!params) return str
      for (var key in params) {
        if (str != '') {
          str += '&';
        }
        str += key + '=' + encodeURIComponent(params[key]);
      }
      return str;
    }

    function share () {
      // alert('shared: ' + JSON.stringify(getRelativePosition(mouse)));
      var url = window.location + 'redirect?' + serialize(getRelativePosition(mouse));
      window.open(url, '', 'width=500,height=300');
    }

    function hideHint () {
      document.getElementById('hint').className = 'hidden'
    }
    function showHint () {
      document.getElementById('hint').className = ''
    }

    function start (e) {
      hideHint()
      if (checkForId(e.target, 'rectangle')) {
        return share()
      }
      setMousePosition(e);
      mouse.startX = mouse.x;
      mouse.startY = mouse.y;
      element = document.getElementById('rectangle');
      var position = getRelativePosition(mouse)
      element.style.top = position.top + '%';
      element.style.left = position.left + '%';
      element.style.width = 0;
      element.style.height = 0;
    }
    function stop (e) {
      element = null;
    }

    canvas.onmousedown = start
    canvas.ontouchstart = start
    canvas.onmouseup = stop
    canvas.ontouchend = stop

    setInterval(function () {
      var now = Date.now()
      if (now - mouse.updatedAt < 500) return
      if (
        Math.abs(mouse.x - mouse.startX) < 1 ||
        Math.abs(mouse.y - mouse.startY) < 1
      ) showHint()
    }, 1000)
  }
}
