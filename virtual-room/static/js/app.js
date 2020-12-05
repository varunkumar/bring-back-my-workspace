let audioContext;
let canvasControl;
let scene;
let audioElements = [];
let soundSources = [];
let connection;
let roomData;
let visualElements = [
  {
    icon: 'listenerIcon',
    x: 0.5,
    y: 0.5,
    radius: 0.04,
    alpha: 0.75,
    clickable: true,
  },
];
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
 * @param {Object} elements
 * @private
 */
function updatePositions(elements) {
  if (!audioReady) return;

  for (let i = 0; i < elements.length; i++) {
    let x = ((elements[i].x - 0.5) * dimensions[dimensionSelection].width) / 2;
    let y = 0;
    let z = ((elements[i].y - 0.5) * dimensions[dimensionSelection].depth) / 2;
    if (i < elements.length - 1) {
      soundSources[i].setPosition(x, y, z);
    } else {
      scene.setListenerPosition(x, y, z);
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
function initAudioStream(roomId) {
  connection = new RTCMultiConnection();

  connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';
  connection.socketMessageEvent = 'bring-back-my-workspace';

  connection.session = {
    audio: true,
    video: false,
  };
  if (!userid) {
    connection.userid = prompt('Please enter your name', 'Harry Potter');
  } else {
    connection.userid = userid;
  }

  if (roomData) {
    connection.extra = { roomData: encodeURI(JSON.stringify(roomData)) };
  }

  connection.mediaConstraints = {
    audio: true,
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

  connection.onstream = connection.onstreamended = function (event) {
    var mediaElement = document.getElementById(event.streamid);
    if (mediaElement) {
      mediaElement.parentNode.removeChild(mediaElement);
    }
  };

  connection.openOrJoin(roomId, function () {
    console.log(connection.sessionid);
  });
}

function addStream(event) {
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
    const soundSource = scene.createSource();
    soundSources.splice(0, 0, soundSource);
    audioStreamSource.connect(soundSource.input);

    const visualElement = {
      icon: 'microphoneIcon',
      x: 0.25,
      y: 0.25,
      radius: 0.04,
      alpha: 0.75,
      clickable: true,
    };

    visualElements.splice(0, 0, visualElement);
    canvasControl.setElements(visualElements);
  }

  setTimeout(function () {
    mediaElement.media.play();
  }, 5000);

  mediaElement.id = event.streamid;
}

function addSource() {
  if (!audioReady) {
    initAudio();
  }
  console.log('Adding a new source');
  const audioElement = document.createElement('audio');
  audioElement.src = './virtual-room/static/audio/sample.wav';
  audioElement.load();
  audioElement.loop = true;
  audioElement.setAttribute('controls', true);
  audioElement.play();
  audioElements.push(audioElement);
  const audioElementSource = audioContext.createMediaElementSource(
    audioElement
  );

  const soundSource = scene.createSource();
  soundSources.splice(0, 0, soundSource);
  audioElementSource.connect(soundSource.input);

  const visualElement = {
    icon: 'microphoneIcon',
    x: 0.25,
    y: 0.25,
    radius: 0.04,
    alpha: 0.75,
    clickable: true,
  };

  visualElements.splice(0, 0, visualElement);
  canvasControl.setElements(visualElements);
}

/**
 * @private
 */
function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Initialize scene and create Source(s).
  scene = new ResonanceAudio(audioContext, {
    ambisonicOrder: 1,
  });
  scene.output.connect(audioContext.destination);
  audioReady = true;
}

let onLoad = function () {
  document.getElementById('btnAdd').addEventListener('click', function (event) {
    addSource();
  });

  $('#joinRoomButton').on('click', function (e) {
    console.log('Button clicked');
    const room = $('#roomIdToJoin').val();
    const userId = $('#userIdToJoinRoom').val();
    $('#joinRoomModal').modal('hide');
    $('#roomIdSelectedToJoin').html('<span>' + room + ':' + userId + '</span>');
    e.preventDefault();
    initAudioStream(room, null, userId);
    document.querySelector('#btnJoin').setAttribute('disabled', true);
    document.querySelector('#btnCreate').setAttribute('disabled', true);
  });

  document
    .getElementById('btnCreate')
    .addEventListener('click', function (event) {
      document.querySelector('#btnJoin').setAttribute('disabled', true);
      document.querySelector('#btnCreate').setAttribute('disabled', true);
      roomData = {
        roomId: prompt('Enter room id', 'varun-test'),
        sources: [
          { x: 0.75, y: 0.75, userId: 'Varun' },
          { x: 0.75, y: 0.25, userId: 'Sreekanth' },
        ],
      };
      initAudioStream(roomData.roomId);
    });

  let canvas = document.getElementById('canvas');
  canvasControl = new CanvasControl(canvas, visualElements, updatePositions);

  selectRoomProperties();
};
window.addEventListener('load', onLoad);
