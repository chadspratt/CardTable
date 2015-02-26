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
  <g id="cardFrames"></g>
  <g id="players"></g>
  <g id="markers"></g>
  <g id="enlargedCard"></g>
  <g id="cardButtons"></g>
</svg>

<div id="coordDisplay" class="overlayItem">x: y:</div>
<div id="motionDisplay" class="overlayItem">dx: dy:</div>
<div id="motionDisplayCorrected" class="overlayItem">dx: dy:</div>

<div id="gameControlsLeft" class="overlayItem">
  <div id="roomNameBox">
    Room:
    <input id="roomName" type="text" size="12" value="<?php
      if (isset($_GET["room"]))
        { echo $_GET["room"]; }
      else { echo "Room"; } ?>">
    <button id="setRoom">Join</button>
  </div>

  <table id="scoreBoard">
    <thead>
      <tr>
        <td> </td>
        <td>Name</td>
        <td>Hand</td>
        <td> </td>
        <td>Score</td>
        <td> </td>
      </tr>
    </thead>

    <tbody></tbody>
  </table>

  <div id="playerNameBox">
    <input id="playerName" type="text" value="" size="12">
    <button id="addPlayer" disabled="disabled">Add</button>
    <button id="renamePlayer">Rename</button>
    <button id="removePlayer">Remove</button>
  </div>

  <div id="deckBox" class="inline">
    <div id="deckHeaderBox">
      <span class="deckHeader">
        Deck (<span id="deckCount">0</span> cards)
      </span>
      <span id="loadDeckHeader" class="links">
        Load
      </span>
    </div>

    <div id="loadDeckBox">
      <div id="loadDeckForm">
        <div>Paste csv with these columns:</div>
        <div>name,image_url,count</div>
        <div>(case-sensitive, no spaces between fields, any order)</div>
        <textarea type="text" id="deckCSV" value="" rows="10" cols="33"></textarea>
        <div><button id="loadDeck">Load</button></div>
      </div>
    </div>

    <div id="deckButtonBox">
      <button id="drawCard">Draw</button>
      <button id="showDeckList">List</button>
      <button id="shuffleDeck">Shuffle</button>
      <button id="resetPlayer">Reset</button>
    </div>

    <div id="deckListBox">
      <select id="deckList" size="15"></select>
      <div><button id="drawSelectedCard">Draw Selected</button></div>
    </div>
  </div>

  <div id="createMarkerBox">
    <input id="markerText" type="text" size="12" value="+1/+1">
    <button id="createMarker">Create Marker</button>
    <div id="markerHistoryHeader" class="links">Marker History</div>
    <table id="markerHistory"></table>
  </div>

  <div id="settingsHeader" class="links">Other Settings</div>
  <div id="settingsBox">
    <div>
      Table Image:
      <input id="tableImageUrl" type="text" size="12" value="">
      <button id="setTableImageUrl">Set</button>
    </div>
    <div>
      Image Scale:<input id="tableImageScale" type="text" size="1" value="1" />
      Distance:<input id="tableDistance" type="text" size="1" value="750">
      <button id="setTableScaleAndDistance">Set</button>
    </div>
    <div>
      Marker Size:
      <input id="markerSize" type="text" size="1" value="5">
      <button id="setMarkerSize">Set</button>
    </div>
    <div>
      Enlarged Card Size:
      <input id="cardSize" type="text" size="1" value="1">
      <button id="setCardSize">Set</button>
    </div>
    <div>
      Deck Deal Point:
      x<input id="deckDealX" type="text" size="1" value="100">
      y<input id="deckDealY" type="text" size="1" value="100">
      <button id="setDeckDealPoint">Set</button>
    </div>
  </div>
</div>

<div id="mouseoverBox" class="overlayItem"></div>

</body>
</html>
