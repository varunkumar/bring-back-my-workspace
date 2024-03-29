/**
 * Class for managing 2D visualization/interaction for audio demos.
 * @param {Object} canvas
 * @param {Object} elements
 * @param {Function} callbackFunc
 */
function CanvasControl(canvas, elements, backgroundImg, callbackFunc) {
  this._canvas = canvas;
  this._elements = elements;
  this._backgroundImg = backgroundImg;
  this._callbackFunc = callbackFunc;

  this._context = this._canvas.getContext('2d');
  this._cursorDown = false;

  this._selected = {
    index: -1,
    xOffset: 0,
    yOffset: 0,
  };

  this._lastMoveEventTime = 0;
  this._minimumThreshold = 16;
  let that = this;
  canvas.addEventListener('touchstart', function (event) {
    that._cursorDownFunc(event);
  });

  canvas.addEventListener('mousedown', function (event) {
    that._cursorDownFunc(event);
  });

  canvas.addEventListener(
    'touchmove',
    function (event) {
      let currentEventTime = Date.now();
      if (currentEventTime - that._lastMoveEventTime > that._minimumThreshold) {
        that._lastMoveEventTime = currentEventTime;
        if (that._cursorMoveFunc(event)) {
          event.preventDefault();
        }
      }
    },
    true
  );

  canvas.addEventListener('mousemove', function (event) {
    let currentEventTime = Date.now();
    if (currentEventTime - that._lastMoveEventTime > that._minimumThreshold) {
      that._lastMoveEventTime = currentEventTime;
      that._cursorMoveFunc(event);
    }
  });

  document.addEventListener('touchend', function (event) {
    that._cursorUpFunc(event);
  });

  document.addEventListener('mouseup', function (event) {
    that._cursorUpFunc(event);
  });

  window.addEventListener(
    'resize',
    function (event) {
      that.resize();
      that.draw();
    },
    false
  );

  this.invokeCallback();
  this.resize();
  this.draw();
}

CanvasControl.prototype.setElements = function (elements) {
  this._elements = elements;
  this.draw();
};

CanvasControl.prototype.invokeCallback = function () {
  if (this._callbackFunc !== undefined) {
    this._callbackFunc(this._elements);
  }
};

CanvasControl.prototype.resize = function () {
  let canvasWidth = this._canvas.parentNode.clientWidth;
  let maxCanvasSize = 680;
  if (canvasWidth > maxCanvasSize) {
    canvasWidth = maxCanvasSize;
  }
  this._canvas.width = 800 * 1.5;
  this._canvas.height = 420 * 1.5;
};

CanvasControl.prototype.draw = function () {
  this._context.globalAlpha = 1;
  this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);

  this._context.lineWidth = 5;
  this._context.strokeStyle = '#bbb';
  this._context.strokeRect(0, 0, canvas.width, canvas.height);

  let icon = document.getElementById(this._backgroundImg.id);
  this._context.drawImage(icon, 0, 0, 800 * 1.5, 420 * 1.5);

  for (let i = 0; i < this._elements.length; i++) {
    let icon = document.getElementById('listenerIcon');
    if (icon !== undefined) {
      let radiusInPixels = this._elements[i].radius * this._canvas.width;
      let x = this._elements[i].x * this._canvas.width - radiusInPixels;
      let y = this._elements[i].y * this._canvas.height - radiusInPixels;
      this._context.globalAlpha = this._elements[i].alpha;
      fillStyle = this._context.fillStyle;
      if (this._elements[i].active) {
        this._context.fillStyle = '#00AA00';
      } else {
        this._context.fillStyle = '#AA0000';
      }
      if (connection && this._elements[i].userId === connection.userid) {
        // You
        this._context.fillText('You', x - 3, y - 7);
      } else {
        this._context.fillText(this._elements[i].userId, x - 3, y - 7);
      }
      this._context.drawImage(
        icon,
        x,
        y,
        radiusInPixels * 0.5,
        radiusInPixels * 0.5
      );
      this._context.fillRect(x - 2, y - 5, 30, 5);
      this._context.fillStyle = fillStyle;
    }
  }
};

CanvasControl.prototype.getCursorPosition = function (event) {
  let cursorX;
  let cursorY;
  let rect = this._canvas.getBoundingClientRect();
  if (event.touches !== undefined) {
    cursorX = event.touches[0].clientX;
    cursorY = event.touches[0].clientY;
  } else {
    cursorX = event.clientX;
    cursorY = event.clientY;
  }
  return {
    x: cursorX - rect.left,
    y: cursorY - rect.top,
  };
};

CanvasControl.prototype.getNearestElement = function (cursorPosition) {
  let minDistance = 1e8;
  let minIndex = -1;
  let minXOffset = 0;
  let minYOffset = 0;
  for (let i = 0; i < this._elements.length; i++) {
    if (this._elements[i].clickable == true) {
      let dx = this._elements[i].x * this._canvas.width - cursorPosition.x;
      let dy = this._elements[i].y * this._canvas.height - cursorPosition.y;
      let distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance.
      if (
        distance < minDistance &&
        distance < 2 * this._elements[i].radius * this._canvas.width
      ) {
        minDistance = distance;
        minIndex = i;
        minXOffset = dx;
        minYOffset = dy;
      }
    }
  }
  return {
    index: minIndex,
    xOffset: minXOffset,
    yOffset: minYOffset,
  };
};

CanvasControl.prototype._cursorUpdateFunc = function (cursorPosition) {
  if (this._selected.index > -1) {
    this._elements[this._selected.index].x = Math.max(
      0,
      Math.min(
        1,
        (cursorPosition.x + this._selected.xOffset) / this._canvas.width
      )
    );
    this._elements[this._selected.index].y = Math.max(
      0,
      Math.min(
        1,
        (cursorPosition.y + this._selected.yOffset) / this._canvas.height
      )
    );
    this.invokeCallback();
  }
  this.draw();
};

CanvasControl.prototype._cursorDownFunc = function (event) {
  this._cursorDown = true;
  let cursorPosition = this.getCursorPosition(event);
  this._selected = this.getNearestElement(cursorPosition);
  if (this._selected.index > -1) {
    if (
      connection &&
      this._elements[this._selected.index].userId !== connection.userid
    ) {
      // Disallow other users to be moved
      this._selected.index = -1;
    }
  }
  this._cursorUpdateFunc(cursorPosition);
  document.body.style = 'overflow: hidden;';
};

CanvasControl.prototype._cursorUpFunc = function (event) {
  this._cursorDown = false;
  if (connection && this._selected.index > -1) {
    connection.send(
      encodeURI(
        JSON.stringify({
          type: 'onUserMove',
          data: {
            user: this._elements[this._selected.index],
            index: this._selected.index,
          },
        })
      )
    );
  }
  this._selected.index = -1;
  document.body.style = '';
};

let prevSelected = -1;
CanvasControl.prototype._cursorMoveFunc = function (event) {
  let cursorPosition = this.getCursorPosition(event);
  let selection = this.getNearestElement(cursorPosition);
  if (selection.index > -1) {
    if (
      connection &&
      this._elements[selection.index].userId !== connection.userid
    ) {
      // Disallow other users to be moved
      selection.index = -1;
    }
  }
  if (this._cursorDown == true) {
    this._cursorUpdateFunc(cursorPosition);
  }
  if (selection.index > -1) {
    this._canvas.style.cursor = 'pointer';

    if (prevSelected != selection.index) {
      this._selected = selection;
      this.draw();
    }
    prevSelected = selection.index;
    return true;
  } else {
    this._canvas.style.cursor = 'default';

    if (prevSelected != selection.index) {
      this._selected.index = -1;
      this.draw();
    }
    prevSelected = selection.index;
    return false;
  }
};
