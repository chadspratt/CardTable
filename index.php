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

<div id="gameControlsLeft" class="overlayItem">
  <div id="roomNameBox">
    Room:
    <input id="roomName" type="text" size="12" value="<?php
      if (isset($_GET["room"]))
        { echo $_GET["room"]; }
      else { echo "Room"; } ?>">
    <button id="setRoom">Join</button>
  </div>

  <div id="playerBox">
    <table id="scoreBoard">
      <h4>Players</h4>

      <thead>
        <tr>
          <td>Name</td>
          <td>Hand</td>
          <td> </td>
          <td>Score</td>
          <td> </td>
          <td> </td>
        </tr>
      </thead>

      <tbody></tbody>
    </table>

    <span id="addPlayerHeader" class="links">Add Player</span>

    <div id="addPlayerBox">
      Name:<input id="playerName" type="text" value="" size="12">
      <button id="addPlayer">Add Player</button>
    </div>
  </div>

  <div id="deckBox">
    <h4>Decks</h4>
    <table id="deckTable">
      <thead>
        <tr>
          <td>Name</td>
          <td>Count</td>
          <td> </td>
          <td> </td>
          <td> </td>
        </tr>
      </thead>

      <tbody></tbody>
    </table>

    <span id="addDeckHeader" class="links">Add Deck</span>

    <div id="addDeckBox">
      <div>Deck name:<input id="deckName" type="text" value="" size="12"></div>
      <div>Shared <input id="newDeckIsShared" type="checkbox"></div>
      <div>Paste csv with these columns:</div>
      <div>name,image_url,count</div>
      <div>(case-sensitive, no spaces between fields, any order)</div>
      <textarea type="text" id="deckCSV" value="" rows="10" cols="33"></textarea>
      <div><button id="addDeck">Add Deck</button></div>
    </div>

    <div id="deckListBox">
      <div><button id="drawSelectedCard">Draw Selected</button><button id="hideCardList">Hide List</button></div>
      <select id="deckList" size="15"></select>
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
      Image Scale:<input id="tableImageScale" type="text" size="1" value="1">
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

<div id="playerActionBox" class="overlayItem actionBox">
  <div id="selectPlayer">Select</div>
  <div id="resetPlayer">Reset</div>
  <div id="renamePlayer">Rename</div>
  <div id="removePlayer" class="deleteItem">Remove</div>
  <div id="movePlayerUp">Move Up</div>
  <div id="movePlayerDown">Move Down</div>
</div>

<div id="deckActionBox" class="overlayItem actionBox">
  <div id="shuffleDeck">Shuffle</div>
  <div id="listDeck">List</div>
  <div id="returnCardsToDeck">Return Cards</div>
  <div id="removeDeck" class="deleteItem">Remove</div>
  <div id="deckIsShared">Shared<input type="checkbox"></div>
  <div id="deckIsLocked">Locked<input type="checkbox"></div>
</div>

</body>
</html>
