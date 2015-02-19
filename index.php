<!DOCTYPE html>
<html lang="en-US">
<meta charset="utf-8">

<head>
  <link rel="stylesheet" type="text/css" href="./style.css">
  <!-- third party javascript -->
  <script src="./js/jquery-2.1.3.js"></script>
  <script src="./js/jquery.mousewheel.js"></script>
  <script src="./js/jquery.form.js"></script>
  <script src="./js/jquery.csv-0.71.js"></script>

  <script src="./js/d3.js"></script>

  <script src="./js/drawPlayArea.js"></script>
</head>

<body>

<svg id="playAreaSVG">
  <g id="tableGraphic"></g>
  <g id="players"></g>
  <g id="enlargedCard"></g>
  <g id="markers"></g>
  <g id="cardButtons"></g>
</svg>

<!-- <div id="viewControls" class="overlayItem">
  <button id="zoomOut">
    -
  </button>
  <button id="zoomIn">
    +
  </button>
</div> -->

<div id="coordDisplay" class="overlayItem">x: y:</div>
<div id="motionDisplay" class="overlayItem">dx: dy:</div>
<div id="motionDisplayCorrected" class="overlayItem">dx: dy:</div>

<div id="gameControls">
  <div id="roomNameBox">
    <h4>Room:</h4>
    <input id="roomName" type="text" value="Room">
    <button id="setRoom">Join</button>
  </div>

  <div id="playerNameBox">
    <h4>Player:</h4>
    <input id="playerName" type="text" value="defaultPlayer">
    <div><button id="setPlayer">Change Player</button></div>
    <div><button id="setName">Change Name</button></div>
  </div>

  <div id="deckBox" class="overlayItem inline">
    <H2>Deck (<span id="deckCount">0</span> cards)</H2>
    <button id="drawCard">Draw</button>
    <button id="shuffleDeck">Shuffle</button>
    <div id="loadDeckBox" class="overlayItem inline">
      <div id="loadDeckForm">
        <textarea type="text" id="deckCSV" value="" rows="10" cols="50"></textarea>
        <button id="loadDeck">Load</button>
      </div>
      <div id="loadDeckHeader" class="links">Load From CSV</div>
    </div>
  </div>

  <div id="markerBox">
    <h4>Marker Text:</h4>
    <input id="markerText" type="text" value="+1/+1">
    <button id="createMarker">Create</button>
  </div>
</div>

<table id="scoreBoard" class="overlayItem"></table>

<div id="mouseoverBox" class="overlayItem"></div>

</body>
</html>
