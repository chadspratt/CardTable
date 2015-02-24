<?php
session_start();
// make a singleton to store the connection and stuff
require_once "../../db_connect/cards.inc";

$connection = GetDatabaseConnection();
$getStateQuery = $connection->prepare(
    "SELECT player, zone, type, id, name, imageUrl, xPos, yPos, rotation, ordering
    FROM CurrentState
    WHERE room = ?");
$addQuery = $connection->prepare(
    "INSERT INTO CurrentState
    (room, player, zone, type, id, name, imageUrl, xPos, yPos)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?");
$checkForRoomQuery = $connection->prepare(
    "SELECT COUNT(room)
    FROM CurrentState
    WHERE room = ? AND type = \"room\"");
$checkForPlayerQuery = $connection->prepare(
    "SELECT COUNT(player)
    FROM CurrentState
    WHERE room = ? AND player = ? AND type = \"player\"");
$addRoomQuery = $connection->prepare(
    "INSERT INTO CurrentState
    (room, type, name)
    SELECT ?, \"room\", 750");
$addPlayerQuery = $connection->prepare(
    "INSERT INTO CurrentState
    (room, player, imageUrl, ordering, type, name)
    SELECT ?, ?, ?, ?, \"player\", \"1\"");
$updatePlayerScoreQuery = $connection->prepare(
    "UPDATE CurrentState SET
    rotation = ?
    WHERE room = ? AND player = ? AND type = \"player\"");
$updateTableImageUrlQuery = $connection->prepare(
    "UPDATE CurrentState SET
    imageUrl = ?
    WHERE room = ? AND player = ? AND type = \"player\"");
$updateTableImageScaleQuery = $connection->prepare(
    "UPDATE CurrentState SET
    name = ?
    WHERE room = ? AND player = ? AND type = \"player\"");
$updateTableImageDistanceQuery = $connection->prepare(
    "UPDATE CurrentState SET
    name = ?
    WHERE room = ? AND type = \"room\"");
$updateDeckDealPointQuery = $connection->prepare(
    "UPDATE CurrentState SET
    xPos = ?, yPos = ?
    WHERE room = ? AND player = ? AND type = \"player\"");
$updatePlayerNameQuery = $connection->prepare(
    "UPDATE CurrentState SET
    player = ?
    WHERE room = ? AND player = ?");
$updateQuery = $connection->prepare(
    "UPDATE CurrentState SET
    zone = ?, xPos = ?, yPos = ?, rotation = ?, ordering = ?
    WHERE room = ? AND player = ? AND type = ? AND id = ?");
$updateDeckOrderQuery = $connection->prepare(
    "UPDATE CurrentState SET
    ordering = ?
    WHERE room = ? AND player = ? AND id = ? AND zone = 'deck'");
$resetDeckQuery = $connection->prepare(
    "UPDATE CurrentState SET
    zone = \"deck\", xPos = ?, yPos = ?, rotation = 0, ordering = 0
    WHERE room = ? AND player = ? AND type = \"card\"");
$unrotatePlayerCardsQuery = $connection->prepare(
    "UPDATE CurrentState SET
    rotation = 0
    WHERE room = ? AND player = ? AND type = \"card\"");
$resetMarkersQuery = $connection->prepare(
    "DELETE FROM CurrentState
    WHERE room = ? AND player = ? AND type = \"marker\"");
$removeQuery = $connection->prepare(
    "DELETE FROM CurrentState
    WHERE room = ? AND player = ? AND type = ? AND id = ?");
$removePlayerQuery = $connection->prepare(
    "DELETE FROM CurrentState
    WHERE room = ? AND player = ?");
$removeRoomQuery = $connection->prepare(
    "DELETE FROM CurrentState
    WHERE room = ?");
$markAsUpdatedQuery = $connection->prepare(
    "INSERT INTO LastRoomUpdate
    (room) SELECT ?");
$checkForUpdateQuery = $connection->prepare(
    "SELECT id FROM LastRoomUpdate
    WHERE room = ? AND id > ?
    ORDER BY id DESC");

// for debugging
if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    $_POST = $_GET;
}
// var_dump($_POST);

if ($_POST["action"] === "get_state")
{
    $checkForUpdateQuery->bind_param("si",
                                     $room,
                                     $last_update_id);
    $_SESSION["room"] = $_POST["room"];
    $_SESSION["last_update_id"] = $_POST["last_update_id"];
    $room = $_SESSION["room"];
    $last_update_id = $_SESSION["last_update_id"];
    session_write_close();
    // wait for new data
    $totalTimeSlept = 0;
    while (true)
    {
        $checkForUpdateQuery->execute();
        $checkForUpdateQuery->bind_result($changeId);
        if ($checkForUpdateQuery->fetch())
        {
            $checkForUpdateQuery->close();
            break;
        }
        // handle case of new rooms with no updates
        elseif ($last_update_id == "-1")
        {
            $checkForUpdateQuery->close();
            $markAsUpdatedQuery->bind_param("s", $_POST["room"]);
            $markAsUpdatedQuery->execute();
            $lastUpdateId = $connection->insert_id;
            $markAsUpdatedQuery->close();
            $connection->close();
            echo '{"last_update_id":"$lastUpdateId"}';
            echo json_encode(array("change_id" => $lastUpdateId,
                                   "results" => []));
            return;
        }
        $totalTimeSlept += 0.2;
        // max wait time
        if ($totalTimeSlept > 60)
        {
            $checkForUpdateQuery->close();
            $connection->close();
            echo '{"no_changes":"true"}';
            return;
        }
        usleep(200000);
        session_start();
        // just end and wait for a resend if room changes
        if ($room !== $_SESSION["room"])
        {
            session_write_close();
            echo '{"no_changes":"true"}';
            return;
        }
        session_write_close();
    }

    $getStateQuery->bind_param("s", $_POST["room"]);
    $getStateQuery->execute();
    $getStateQuery->bind_result($player, $zone, $type, $id, $name, $imageUrl,
                                $xPos, $yPos, $rotation, $ordering);
    $results = [];
    while ($getStateQuery->fetch())
    {
        $row = [
            "player" => $player,
            "zone" => $zone,
            "type" => $type,
            "id" => $id,
            "name" => $name,
            "imageUrl" => $imageUrl,
            "xPos" => $xPos,
            "yPos" => $yPos,
            "rotation" => $rotation,
            "ordering" => $ordering
        ];
        array_push($results, $row);
    }
    echo json_encode(array("change_id" => $changeId,
                           "results" => $results));
}
else
{
    if ($_POST["action"] === "change_room")
    {
        $_SESSION["room"] = $_POST["room"];
        $_SESSION["last_update_id"] = -1;
        session_write_close();
        $checkForRoomQuery->bind_param("s", $_POST["room"]);

        $checkForRoomQuery->execute();
        $checkForRoomQuery->bind_result($existingCount);
        $checkForRoomQuery->fetch();
        $checkForRoomQuery->close();
        if ($existingCount == 0)
        {
            $addRoomQuery->bind_param("s", $_POST["room"]);
            $addRoomQuery->execute();
            $addRoomQuery->close();
        }
    }
    elseif ($_POST["action"] === "add")
    {
        for ($i=0; $i < count($_POST["id"]); $i++)
        {
            $addQuery->bind_param("ssssissii",
                                  $_POST["room"],
                                  $_POST["player"],
                                  $_POST["zone"],
                                  $_POST["type"],
                                  $_POST["id"][$i],
                                  $_POST["name"][$i],
                                  $_POST["image_url"][$i],
                                  $_POST["x_pos"][$i],
                                  $_POST["y_pos"][$i]);
            $addQuery->execute();
        }
        $addQuery->close();
    }
    elseif ($_POST["action"] === "addPlayer")
    {
        $checkForPlayerQuery->bind_param("ss",
                                    $_POST["room"],
                                    $_POST["player"]);

        $checkForPlayerQuery->execute();
        $checkForPlayerQuery->bind_result($existingCount);
        $checkForPlayerQuery->fetch();
        $checkForPlayerQuery->close();
        if ($existingCount == 0)
        {
            $addPlayerQuery->bind_param("sssi",
                                        $_POST["room"],
                                        $_POST["player"],
                                        $_POST["image_url"],
                                        $_POST["ordering"]);
            $addPlayerQuery->execute();
            $addPlayerQuery->close();
        }
    }
    elseif ($_POST["action"] === "update_table_image_url")
    {
        $updateTableImageUrlQuery->bind_param("sss",
                                              $_POST["image_url"],
                                              $_POST["room"],
                                              $_POST["player"]);
        $updateTableImageUrlQuery->execute();
        $updateTableImageUrlQuery->close();
    }
    elseif ($_POST["action"] === "update_table_image_scale_and_distance")
    {
        $updateTableImageScaleQuery->bind_param("sss",
                                                $_POST["image_scale"],
                                                $_POST["room"],
                                                $_POST["player"]);
        $updateTableImageScaleQuery->execute();
        $updateTableImageScaleQuery->close();
        $updateTableImageDistanceQuery->bind_param("ss",
                                                   $_POST["image_distance"],
                                                   $_POST["room"]);
        $updateTableImageDistanceQuery->execute();
        $updateTableImageDistanceQuery->close();
    }
    elseif ($_POST["action"] === "set_deck_deal_point")
    {
        $updateDeckDealPointQuery->bind_param("iiss",
                                              $_POST["x"],
                                              $_POST["y"],
                                              $_POST["room"],
                                              $_POST["player"]);
        $updateDeckDealPointQuery->execute();
        $updateDeckDealPointQuery->close();
    }
    elseif ($_POST["action"] === "updatePlayerScore")
    {
        $updatePlayerScoreQuery->bind_param("iss",
                                            $_POST["rotation"],
                                            $_POST["room"],
                                            $_POST["player"]);
        $updatePlayerScoreQuery->execute();
        $updatePlayerScoreQuery->close();
    }
    elseif ($_POST["action"] === "updatePlayerName")
    {
        $updatePlayerNameQuery->bind_param("sss",
                                           $_POST["new_player"],
                                           $_POST["room"],
                                           $_POST["old_player"]);
        $updatePlayerNameQuery->execute();
        $updatePlayerNameQuery->close();
    }
    elseif ($_POST["action"] === "update")
    {
        $updateQuery->bind_param("siiiisssi",
                                 $_POST["zone"],
                                 $_POST["x_pos"],
                                 $_POST["y_pos"],
                                 $_POST["rotation"],
                                 $_POST["ordering"],
                                 $_POST["room"],
                                 $_POST["player"],
                                 $_POST["type"],
                                 $_POST["id"]);
        $updateQuery->execute();
        $updateQuery->close();
    }
    elseif ($_POST["action"] === "update_deck_order")
    {
        for ($i=0; $i < count($_POST["id"]); $i++)
        {
            $updateDeckOrderQuery->bind_param("issi",
                                  $_POST["ordering"][$i],
                                  $_POST["room"],
                                  $_POST["player"],
                                  $_POST["id"][$i]);
            $updateDeckOrderQuery->execute();
        }
        $updateDeckOrderQuery->close();
    }
    elseif ($_POST["action"] === "reset_player")
    {
        $resetDeckQuery->bind_param("iiss",
                                    $_POST["x"],
                                    $_POST["y"],
                                    $_POST["room"],
                                    $_POST["player"]);
        $resetDeckQuery->execute();
        $resetDeckQuery->close();

        $resetMarkersQuery->bind_param("ss",
                                       $_POST["room"],
                                       $_POST["player"]);
        $resetMarkersQuery->execute();
        $resetMarkersQuery->close();
    }
    elseif ($_POST["action"] === "unrotate_player_cards")
    {
        $unrotatePlayerCardsQuery->bind_param("ss",
                                              $_POST["room"],
                                              $_POST["player"]);
        $unrotatePlayerCardsQuery->execute();
        $unrotatePlayerCardsQuery->close();
    }
    elseif ($_POST["action"] === "remove")
    {
        $removeQuery->bind_param("sssi",
                                 $_POST["room"],
                                 $_POST["player"],
                                 $_POST["type"],
                                 $_POST["id"]);
        $removeQuery->execute();
        $removeQuery->close();
    }
    elseif ($_POST["action"] === "remove_all")
    {
        $removePlayerQuery->bind_param("ss",
                                       $_POST["room"],
                                       $_POST["player"]);
        $removePlayerQuery->execute();
        $removePlayerQuery->close();
    }

    $markAsUpdatedQuery->bind_param("s", $_POST["room"]);
    $markAsUpdatedQuery->execute();
    $lastUpdateId = $connection->insert_id;
    echo "{\"last_update_id\":\"{$lastUpdateId}\"}";
}

$connection->close();
?>
