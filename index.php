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
  <g id="players"></g>
  <g id="counters"></g>
  <g id="enlargedCard"></g>
</svg>

<div id="viewControls" class="overlayItem">
  <div id="updateData" class="links">refresh</div>
  <button id="zoomOut">
    -
  </button>
  <button id="zoomIn">
    +
  </button>
</div>

<div id="coordDisplay" class="overlayItem">x: z:</div>

<div id="gameControls">
  <div id="loadDeckBox" class="overlayItem inline">
    <div id="loadDeckForm">
      <textarea type="text" id="deckCSV" value="" rows="10" cols="50"></textarea>
      <button id="loadDeck">Load</button>
    </div>

    <div id="loadDeckHeader" class="links"><right>Load Deck</right></div>
  </div>

  <div id="roomNameBox">
    <h4>room name</h4>
    <input id="roomName" type="text" value="defaultRoom">
    <button id="setRoom">Join</button>
  </div>

  <div id="playerNameBox">
    <h4>player name</h4>
    <input id="playerName" type="text" value="defaultPlayer">
    <button id="setName">Set</button>
  </div>

  <div id="libraryBox" class="overlayItem inline">
    <H2>Library (<span id="libraryCount">0</span> cards)</H2>
    <button id="drawCard">Draw</button>
    <button id="shuffleLibrary">Shuffle</button>
  </div>
</div>

<div id="mouseoverBox" class="overlayItem"></div>

</body>
</html>
