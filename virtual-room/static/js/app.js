let audioContext;
let canvasControl;
let scene;
let soundSourcesMap = [];
let connection;
let roomData;
let dimensions = {
  small: {
    width: 1.5,
    height: 2.4,
    depth: 1.3,
  },
  medium: {
    width: 4,
    height: 3.2,
    depth: 3.9,
  },
  large: {
    width: 8,
    height: 3.4,
    depth: 9,
  },
  huge: {
    width: 20,
    height: 10,
    depth: 20,
  },
};
let materials = {
  brick: {
    left: 'brick-bare',
    right: 'brick-bare',
    up: 'brick-bare',
    down: 'wood-panel',
    front: 'brick-bare',
    back: 'brick-bare',
  },
  curtains: {
    left: 'curtain-heavy',
    right: 'curtain-heavy',
    up: 'wood-panel',
    down: 'wood-panel',
    front: 'curtain-heavy',
    back: 'curtain-heavy',
  },
  marble: {
    left: 'marble',
    right: 'marble',
    up: 'marble',
    down: 'marble',
    front: 'marble',
    back: 'marble',
  },
  outside: {
    left: 'transparent',
    right: 'transparent',
    up: 'transparent',
    down: 'grass',
    front: 'transparent',
    back: 'transparent',
  },
};
let dimensionSelection = 'small';
let materialSelection = 'brick';
let audioReady = false;

class User {
  constructor(userId) {
    this.userId = userId;
    this.active = false;
    this.x = 0.25;
    this.y = 0.75;
    this.radius = 0.04;
    (this.alpha = 0.75), (this.clickable = true);
  }

  setActive(status) {
    this.active = status;
  }
}

class Room {
  constructor(id, layout, users) {
    this.id = id;
    this.layout = layout;
    this.users = users;
  }

  addUserToRoom(user) {
    this.users.push(user);
    return true;
  }

  getUsers() {
    return this.users;
  }
}

let room;
let users = [];

let backgroundImg = {
  "id": "layout"
};


/**
 * @private
 */
function selectRoomProperties() {
  if (!audioReady) return;

  dimensionSelection = document.getElementById('roomDimensionsSelect').value;
  materialSelection = document.getElementById('roomMaterialsSelect').value;
  scene.setRoomProperties(
    dimensions[dimensionSelection],
    materials[materialSelection]
  );
  canvasControl.invokeCallback();
}

/**
 * @param {Object} users
 * @private
 */
function updatePositions(users) {
  if (!audioReady) return;

  for (let i = 0; i < users.length; i++) {
    let x = ((users[i].x - 0.5) * dimensions[dimensionSelection].width) / 2;
    let y = 0;
    let z = ((users[i].y - 0.5) * dimensions[dimensionSelection].depth) / 2;
    if (users[i].userId === connection.userid) {
      scene.setListenerPosition(x, y, z);
    } else {
      soundSourcesMap[users[i].userId].setPosition(x, y, z);
    }
  }
}

function findUserPosition(userId) {
  if (roomData && roomData.sources && roomData.sources.length > 0) {
  }
  return -1;
}

/**
 * @private
 */
function initAudioStream(roomId, userId) {
  connection = new RTCMultiConnection();

  connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';
  connection.socketMessageEvent = 'bring-back-my-workspace';

  connection.session = {
    audio: true,
    video: false,
  };

  connection.userid = userId;

  if (roomData) {
    connection.extra = { roomData: encodeURI(JSON.stringify(roomData)) };
  }

  connection.mediaConstraints = {
    audio: {
      channelCount: 1,
    },
    video: false,
  };

  connection.sdpConstraints.mandatory = {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: false,
  };

  connection.iceServers = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.l.google.com:19302?transport=udp',
      ],
    },
  ];

  connection.onstream = addStream;
  connection.onstreamended = removeStream;
  connection.openOrJoin(roomId, function () {
    console.log(connection.sessionid);
  });
}

let isRoomLoaded = false;
let audioStreamSourcesMap = {};
function addStream(event) {
  // Has room data?
  if (event.extra && event.extra.roomData) {
    roomData = JSON.parse(decodeURI(event.extra.roomData));
    users.splice(0, users.length, ...roomData.users);
    canvasControl.draw();

    // Create sound sources (excluding the current user - listener)
    soundSourcesMap = {};
    for (let i = 0; i < users.length; i++) {
      if (users[i].userId !== connection.userid) {
        const soundSource = scene.createSource();
        soundSourcesMap[users[i].userId] = soundSource;
      }
    }

    // Connect existing streams
    for (var userId of Object.keys(audioStreamSourcesMap)) {
      audioStreamSourcesMap[userId].connect(soundSourcesMap[userId].input);
    }

    scene.output.connect(audioContext.destination);

    isRoomLoaded = true;
  }

  var mediaElement = getHTMLMediaElement(event.mediaElement, {
    title: event.userid,
    buttons: ['full-screen'],
    width: 50,
    showOnMouseEnter: false,
  });

  if (event.type != 'local') {
    // Add resonance code
    const audioStreamSource = audioContext.createMediaStreamSource(
      event.stream
    );
    audioStreamSourcesMap[event.userid] = audioStreamSource;

    if (isRoomLoaded) {
      audioStreamSource.connect(soundSourcesMap[event.userid].input);
    }
  }

  setTimeout(function () {
    // mediaElement.media.play();
    mediaElement.muted = true;
  }, 5000);

  mediaElement.id = event.streamid;
  updatePositions(users);
}

function removeStream(event) {
  const mediaElement = document.getElementById(event.streamid);
  if (mediaElement) {
    mediaElement.parentNode.removeChild(mediaElement);
  }
}

/**
 * @private
 */
function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Initialize scene and create Source(s).
  scene = new ResonanceAudio(audioContext, {
    ambisonicOrder: 3,
  });
  //scene.output.connect(audioContext.destination);
  audioReady = true;
}

let onLoad = function () {
  $('#createRoomButton').on('click', function (e) {
    const roomId = $('#roomIdToCreate').val();
    const layout = $('#roomLayout').val()
    room = new Room(roomId, layout, users);
    $('#rooIdToAddUsers').html(roomId);
    $('#btnCreate').hide();
    $('#btnJoin').hide();
    $('#saveRoomDiv').show();
    $('#createRoomModal').modal('hide');
    $('#roomIdToCreate').val('');
    e.preventDefault();
    backgroundImg.id = layout;
    canvasControl.draw();
  });

  $('#addUserToRoomButton').on('click', function (e) {
    const userId = $('#userIdOfTheRoom').val();
    $('#userIdOfTheRoom').val('');
    room.addUserToRoom(new User(userId));
    $('#addUserToRoomModal').modal('hide');
    canvasControl.draw();
  });

  $('#joinRoomButton').on('click', function (e) {
    const roomId = $('#roomIdToJoin').val();
    const userId = $('#userIdToJoinRoom').val();
    $('#joinRoomModal').modal('hide');
    $('#roomIdSelectedToJoin')
      .html(
        `You have joined <span class="highlight">${roomId}</span> as <span class="highlight">${userId}</span>`
      )
      .show();
    e.preventDefault();
    roomData = JSON.parse(localStorage.getItem(roomId));
    initAudio();
    initAudioStream(roomId, userId);
    document.querySelector('#btnJoin').setAttribute('disabled', true);
    document.querySelector('#btnCreate').setAttribute('disabled', true);
  });

  $('#btnSaveRoom').on('click', function (e) {
    $('#btnCreate').show();
    $('#btnJoin').show();
    $('#saveRoomDiv').hide();
    roomData = room;
    localStorage.setItem(room.id, JSON.stringify(roomData));
    $('#roomIdSelectedToJoin').html('Room saved successfully!!').show();
    setTimeout(function () {
      $('#roomIdSelectedToJoin').html('').hide();
    }, 5000);
  });

  $('#btnCancelSaveOperation').on('click', function (e) {
    $('#btnCreate').show();
    $('#btnJoin').show();
    $('#saveRoomDiv').hide();
  });

  let canvas = document.getElementById('canvas');
  canvasControl = new CanvasControl(canvas, users, backgroundImg, updatePositions);

  selectRoomProperties();
};
window.addEventListener('load', onLoad);
